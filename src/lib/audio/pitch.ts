import { PitchDetector } from "pitchy";

/**
 * A little below a dropped-D low E and a little above the top string's highest fret. Readings
 * outside this are octave errors or noise, not something a guitar produced.
 */
export const LOWEST_FREQUENCY = 60;
export const HIGHEST_FREQUENCY = 1400;

/**
 * How distinct the periodicity has to be before a reading is believed. MPM reports this itself,
 * and a plucked string clears 0.9 comfortably while room noise does not.
 */
export const MIN_CLARITY = 0.9;

/** Below this the string has decayed into the noise floor and any pitch found is imaginary. */
const MIN_VOLUME_DECIBELS = -50;

export interface PitchReading {
    frequency: number;
    clarity: number;
}

/**
 * Detectors allocate their working buffers up front, so they are made once per window size and
 * kept — building one per frame would allocate megabytes a second.
 */
const detectors = new Map<number, PitchDetector<Float32Array>>();

function detectorFor(length: number): PitchDetector<Float32Array> {
    let detector = detectors.get(length);
    if (detector) return detector;

    detector = PitchDetector.forFloat32Array(length);
    detector.minVolumeDecibels = MIN_VOLUME_DECIBELS;
    detectors.set(length, detector);

    return detector;
}

export function isPlausiblePitch(frequency: number, clarity: number): boolean {
    return clarity >= MIN_CLARITY
        && frequency >= LOWEST_FREQUENCY
        && frequency <= HIGHEST_FREQUENCY;
}

/** The pitch of a window of samples, or `null` when there isn't one worth reporting. */
export function detectPitch(samples: Float32Array, sampleRate: number): PitchReading | null {
    let [frequency, clarity] = detectorFor(samples.length).findPitch(samples, sampleRate);

    return isPlausiblePitch(frequency, clarity) ? { frequency, clarity } : null;
}

/**
 * The middle value, which is what keeps a needle still.
 *
 * A mean would let one octave-error reading drag the display a long way; a median ignores it
 * entirely unless it happens more often than not.
 */
export function median(values: number[]): number {
    let sorted = [...values].sort((a, b) => a - b);
    let middle = Math.floor(sorted.length / 2);

    return sorted.length % 2 === 1
        ? sorted[middle]
        : (sorted[middle - 1] + sorted[middle]) / 2;
}

/**
 * A rolling window of the most recent readings, so the display can settle without lagging a real
 * change by more than the window.
 */
export class PitchHistory {
    private frequencies: number[] = [];

    constructor(private readonly size = 5) {}

    add(frequency: number): void {
        this.frequencies.push(frequency);
        if (this.frequencies.length > this.size) this.frequencies.shift();
    }

    clear(): void {
        this.frequencies = [];
    }

    get count(): number {
        return this.frequencies.length;
    }

    /** `null` until enough readings agree to be worth showing. */
    settled(): number | null {
        return this.frequencies.length < this.size ? null : median(this.frequencies);
    }
}
