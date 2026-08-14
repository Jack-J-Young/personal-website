/**
 * The trainer's feedback tones.
 *
 * Impure, like `audio/microphone.ts` and for the same reason — it owns an `AudioContext` — so it
 * has no tests. Everything it decides is a note and a duration; there is nothing here that could
 * fail quietly.
 */

/**
 * Rising, and a perfect fifth, so it reads as an answer rather than an alarm. Landing a chord is
 * the common case in a drill that is working, and a sound heard hundreds of times an hour has to
 * be one nobody wants to turn off.
 */
const RIGHT: Note[] = [
    { frequency: 880, at: 0, length: 0.07 },
    { frequency: 1318.5, at: 0.055, length: 0.08 },
];

/** Falling and low. Not harsh: a missed strum is information, not a penalty. */
const WRONG: Note[] = [
    { frequency: 233.1, at: 0, length: 0.09 },
    { frequency: 185, at: 0.07, length: 0.09 },
];

/**
 * How long a tone can still be heard for, which is how long the microphone has to be ignored
 * afterwards. Anything played through a speaker is audio the microphone is about to hear, and a
 * chime landing on a decayed chord clears the onset detector's rise test easily.
 *
 * Left as its own exported number because it is a cost paid by whatever is listening, not a
 * detail of playing the sound: it raises the floor on how fast two strums can be told apart.
 */
export const CHIME_MS = 200;

interface Note {
    frequency: number;
    /** Seconds after the chime starts. */
    at: number;
    length: number;
}

const PEAK = 0.16;

/** Below the smallest gain that can be ramped to, since an exponential ramp cannot reach zero. */
const SILENT = 0.0001;

export interface Chimes {
    right(): void;
    wrong(): void;
    stop(): void;
}

/**
 * Sine waves, deliberately. A tone the microphone picks up is energy in the chromagram, and a
 * sine puts it all in one bin instead of smearing a harmonic series across several — so the worst
 * it can do is add one note, rather than look like a chord.
 */
function play(context: AudioContext, notes: Note[]): void {
    let start = context.currentTime + 0.01;

    for (let note of notes) {
        let oscillator = context.createOscillator();
        oscillator.type = "sine";
        oscillator.frequency.value = note.frequency;

        let gain = context.createGain();
        gain.gain.setValueAtTime(SILENT, start + note.at);
        gain.gain.exponentialRampToValueAtTime(PEAK, start + note.at + 0.008);
        gain.gain.exponentialRampToValueAtTime(SILENT, start + note.at + note.length);

        oscillator.connect(gain);
        gain.connect(context.destination);

        oscillator.start(start + note.at);
        oscillator.stop(start + note.at + note.length + 0.02);
    }
}

/** Call from a user gesture: a context created without one starts suspended. */
export function startChimes(): Chimes {
    let context = new AudioContext();

    return {
        right: () => play(context, RIGHT),
        wrong: () => play(context, WRONG),
        stop: () => void context.close(),
    };
}
