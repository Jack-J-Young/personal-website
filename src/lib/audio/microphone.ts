/**
 * What a reading has to be good enough for, rather than a window size.
 *
 * The two are the same knob seen from either end — a window of `n` samples spans
 * `n / sampleRate` seconds and resolves `sampleRate / n` hertz per bin — but which end matters
 * depends on the caller, and neither can be turned into a fixed sample count without knowing the
 * sample rate. That is only known once the device is open, and it varies: 44.1kHz and 48kHz are
 * both common, and 96kHz happens, at which a fixed window resolves half the frequency detail.
 */
export interface CaptureOptions {
    /** Shortest span of audio a reading must cover. Pitch detection needs whole periods. */
    minWindowSeconds?: number;
    /** Coarsest acceptable frequency resolution, in hertz per bin. */
    maxBinWidth?: number;
}

export interface AudioCapture {
    readonly sampleRate: number;
    /** Samples per reading, chosen from the requirements and the device's actual sample rate. */
    readonly windowSize: number;
    /** Span of audio each reading covers, in seconds. */
    readonly windowSeconds: number;
    /** Hertz covered by each spectrum bin. */
    readonly binWidth: number;
    /** Processing that was asked to be off but stayed on, named for showing to the user. */
    readonly unwantedProcessing: string[];
    /** Raw samples, which is what pitch detection needs. Reused between calls — copy to keep. */
    readTimeDomain(): Float32Array;
    /** Linear magnitudes, one per frequency bin. Reused between calls — copy to keep. */
    readSpectrum(): Float32Array;
    /**
     * Loudness as RMS in the range 0 to 1, over the most recent `seconds` of the window.
     *
     * The default of the whole window is the wrong choice for anything looking for an attack: a
     * window long enough to resolve chords averages three quarters of a second, which flattens the
     * very transient that marks a strum.
     */
    readLevel(seconds?: number): number;
    stop(): void;
}

/** The range an AnalyserNode accepts. Asking for more than the maximum throws. */
const MIN_FFT_SIZE = 32;
const MAX_FFT_SIZE = 32768;

/**
 * The rate to ask the browser to resample to, whatever the device is running at.
 *
 * Frequency resolution is `sampleRate / fftSize`, and `fftSize` is capped at 32768 — so a device
 * running at 96kHz resolves half the detail of one at 48kHz, no matter what is asked for. At the
 * bottom of a guitar's range that is the difference between separating two adjacent semitones and
 * smearing them together, because a semitone at 82Hz is under 5Hz wide.
 *
 * Nothing here needs bandwidth above about 5kHz, so throwing the rest away costs nothing and
 * makes the analysis behave the same on every machine.
 */
const PREFERRED_SAMPLE_RATE = 44100;

function audioContextAt(sampleRate: number): AudioContext {
    try {
        return new AudioContext({ sampleRate });
    } catch {
        // A browser is allowed to refuse a rate it cannot resample to. Coarser is still workable.
        return new AudioContext();
    }
}

/**
 * The smallest power of two that satisfies both requirements at this sample rate.
 *
 * Clamped rather than rejected at the top: 32768 is as much as an AnalyserNode will give, and a
 * slightly coarser reading is a far better outcome than refusing to open the microphone.
 */
export function windowSizeFor(
    sampleRate: number,
    { minWindowSeconds = 0, maxBinWidth = Infinity }: CaptureOptions,
): number {
    let needed = Math.max(sampleRate * minWindowSeconds, sampleRate / maxBinWidth, MIN_FFT_SIZE);
    let size = 2 ** Math.ceil(Math.log2(needed));

    return Math.min(MAX_FFT_SIZE, size);
}

/**
 * The browser's voice-call processing is the single biggest threat to any of this working.
 *
 * Automatic gain control rides over the decay of a plucked string, noise suppression treats a
 * sustained tone as background hum and removes it, and echo cancellation filters in ways that
 * shift phase. All three have to be off, and asking is the only way — a browser is free to
 * ignore it, which is why the tuner reads its actual settings back.
 */
const RAW_AUDIO: MediaTrackConstraints = {
    echoCancellation: false,
    autoGainControl: false,
    noiseSuppression: false,
};

/**
 * A refusal this module worked out for itself, rather than one `getUserMedia` reported. The
 * message is already written for the person reading it, so it survives `describeMicrophoneError`
 * instead of being flattened into the generic wording.
 */
export class MicrophoneUnavailable extends Error {}

export function describeMicrophoneError(error: unknown): string {
    if (error instanceof MicrophoneUnavailable) return error.message;
    if (!(error instanceof Error)) return "The microphone could not be opened.";

    switch (error.name) {
        case "NotAllowedError":
        case "SecurityError":
            return "Microphone access was blocked. Allow it in your browser's site settings, "
                + "then try again.";
        case "NotFoundError":
        case "OverconstrainedError":
            return "No microphone was found.";
        case "NotReadableError":
            return "The microphone is already in use by another application.";
        default:
            return "The microphone could not be opened.";
    }
}

/** Which of the constraints above the browser ignored. */
function unappliedProcessing(track: MediaStreamTrack): string[] {
    let settings = track.getSettings() as MediaTrackSettings & {
        autoGainControl?: boolean;
        noiseSuppression?: boolean;
        echoCancellation?: boolean;
    };

    let names: Record<string, boolean | undefined> = {
        "automatic gain control": settings.autoGainControl,
        "noise suppression": settings.noiseSuppression,
        "echo cancellation": settings.echoCancellation,
    };

    return Object.entries(names).filter(([, on]) => on === true).map(([name]) => name);
}

function decibelsToMagnitude(decibels: Float32Array, into: Float32Array): Float32Array {
    for (let i = 0; i < decibels.length; i++) into[i] = 10 ** (decibels[i] / 20);
    return into;
}

function rootMeanSquare(samples: Float32Array, from = 0): number {
    let total = 0;
    for (let i = from; i < samples.length; i++) total += samples[i] * samples[i];
    return Math.sqrt(total / (samples.length - from));
}

export async function startCapture(options: CaptureOptions = {}): Promise<AudioCapture> {
    // Not a refusal but an absence: on an insecure origin there is no `mediaDevices` to ask, so
    // this has to be told apart from a browser that genuinely cannot record.
    if (!window.isSecureContext) {
        throw new MicrophoneUnavailable(
            "A microphone is only offered to pages served over HTTPS, or from localhost. This "
            + "page was served over plain HTTP, so the browser will not provide one.",
        );
    }

    if (!navigator.mediaDevices?.getUserMedia) {
        throw new MicrophoneUnavailable("This browser cannot record audio.");
    }

    let stream = await navigator.mediaDevices.getUserMedia({ audio: RAW_AUDIO });
    let context = audioContextAt(PREFERRED_SAMPLE_RATE);

    // Autoplay policy leaves a fresh context suspended until a gesture resumes it, and the button
    // that got us here is that gesture.
    if (context.state === "suspended") await context.resume();

    let analyser = context.createAnalyser();
    analyser.fftSize = windowSizeFor(context.sampleRate, options);

    // Averaging across frames would blur the attack of a note, and every reading here is already
    // a whole window of audio.
    analyser.smoothingTimeConstant = 0;

    // Deliberately not connected to the destination: routing a microphone back to the speakers is
    // a feedback loop.
    context.createMediaStreamSource(stream).connect(analyser);

    let samples = new Float32Array(analyser.fftSize);
    let decibels = new Float32Array(analyser.frequencyBinCount);
    let magnitudes = new Float32Array(analyser.frequencyBinCount);

    return {
        sampleRate: context.sampleRate,
        windowSize: analyser.fftSize,
        windowSeconds: analyser.fftSize / context.sampleRate,
        binWidth: context.sampleRate / analyser.fftSize,
        unwantedProcessing: unappliedProcessing(stream.getAudioTracks()[0]),

        readTimeDomain() {
            analyser.getFloatTimeDomainData(samples);
            return samples;
        },

        readSpectrum() {
            analyser.getFloatFrequencyData(decibels);
            return decibelsToMagnitude(decibels, magnitudes);
        },

        readLevel(seconds = Infinity) {
            analyser.getFloatTimeDomainData(samples);

            // The newest audio sits at the end of the buffer, so a shorter reading is its tail.
            let wanted = Math.round(Math.min(samples.length, seconds * context.sampleRate));
            return rootMeanSquare(samples, samples.length - Math.max(1, wanted));
        },

        stop() {
            for (let track of stream.getTracks()) track.stop();
            void context.close();
        },
    };
}
