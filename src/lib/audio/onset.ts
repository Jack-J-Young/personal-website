/**
 * Finds the moment a string was struck, from nothing but the loudness envelope.
 *
 * The chord recogniser cannot answer *when*. It needs three quarters of a second of audio to
 * separate two adjacent semitones, so by the time it has an answer the moment has long passed, and
 * every window it looks at while a chord is being strummed is part old chord, part silence, part
 * whichever strings the pick has reached so far. An attack, on the other hand, is a step change in
 * loudness, and loudness resolves in a few tens of milliseconds.
 *
 * Splitting the two questions is what lets a strum be timed to a frame and identified a window
 * later — and what stops the recogniser guessing out loud at half-formed chords in between.
 *
 * An onset here is a *rise*: louder now than it was shortly ago, by a factor. A fixed threshold
 * would not do, because the strum that matters most is the one over a chord still ringing, and it
 * is often quieter in absolute terms than the one it interrupts.
 */

/**
 * Long enough to predate the attack, short enough to still be the same note. A plucked string
 * reaches full loudness in around 20ms, so this compares against the string before it was touched.
 */
const LOOKBACK_MS = 80;

/**
 * A strum crosses six strings over something like a tenth of a second and each string is its own
 * small attack; they have to count once. This is also the limit on how fast repeated strumming can
 * be tracked at all — below it, strums merge into one.
 */
const REFRACTORY_MS = 250;

/** Empirical. Low enough to catch a soft strum, high enough that a note's own wobble is not one. */
const RISE_RATIO = 1.8;

/** Room noise can double and still be room noise. An attack has to actually be loud. */
const MIN_ATTACK_LEVEL = 0.02;

export interface OnsetOptions {
    /** How much louder than the recent past counts as an attack, as a ratio. */
    riseRatio?: number;
    /** Loudness an attack has to reach, so that noise rising off nothing cannot be one. */
    floor?: number;
    /** How far back to compare against, in milliseconds. */
    lookbackMs?: number;
    /** Shortest gap between two onsets, in milliseconds. */
    refractoryMs?: number;
}

interface Reading {
    time: number;
    level: number;
}

export class OnsetDetector {
    private readings: Reading[] = [];
    private lastOnset = -Infinity;

    /**
     * Safe to change while running, and the only option that is.
     *
     * How loud a strum has to be depends on the guitar, the room and where the microphone is
     * sitting, none of which this can know — so it is the one setting a player has a reason to
     * move mid-session. Changing it takes effect on the next reading and costs no history.
     */
    floor: number;

    private readonly riseRatio: number;
    private readonly lookbackMs: number;
    private readonly refractoryMs: number;

    constructor(options: OnsetOptions = {}) {
        this.floor = options.floor ?? MIN_ATTACK_LEVEL;
        this.riseRatio = options.riseRatio ?? RISE_RATIO;
        this.lookbackMs = options.lookbackMs ?? LOOKBACK_MS;
        this.refractoryMs = options.refractoryMs ?? REFRACTORY_MS;
    }

    /**
     * Takes one loudness reading and says whether it caught an attack.
     *
     * @param level RMS over a short window — tens of milliseconds. Averaging over anything longer
     *              flattens the transient this is looking for.
     * @param now   any monotonic millisecond timestamp, such as `performance.now()`.
     */
    offer(level: number, now: number): boolean {
        let before = this.levelAt(now - this.lookbackMs);
        this.remember(level, now);

        // No reference yet means the microphone opened moments ago; there is nothing to rise from.
        if (before === null) return false;

        if (level < this.floor) return false;
        if (now - this.lastOnset < this.refractoryMs) return false;
        if (level < before * this.riseRatio) return false;

        this.lastOnset = now;
        return true;
    }

    clear(): void {
        this.readings = [];
        this.lastOnset = -Infinity;
    }

    /** The most recent reading taken at or before `when`, or null if history does not reach it. */
    private levelAt(when: number): number | null {
        let found: number | null = null;

        for (let reading of this.readings) {
            if (reading.time > when) break;
            found = reading.level;
        }

        return found;
    }

    private remember(level: number, now: number): void {
        this.readings.push({ time: now, level });

        // Twice the lookback, so the reading being compared against is always still present.
        let oldest = now - this.lookbackMs * 2;
        while (this.readings.length > 1 && this.readings[0].time < oldest) this.readings.shift();
    }
}
