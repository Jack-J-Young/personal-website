import { describe, expect, it } from "vitest";

import { PitchHistory, detectPitch, isPlausiblePitch, median } from "./pitch";
import { midiToFrequency } from "./notes";

const SAMPLE_RATE = 44100;
const WINDOW = 4096;

/** A plucked string is a fundamental plus overtones, not a sine — detection has to survive that. */
function pluckedString(frequency: number, harmonics = 6): Float32Array {
    let samples = new Float32Array(WINDOW);

    for (let i = 0; i < WINDOW; i++) {
        let time = i / SAMPLE_RATE;
        for (let harmonic = 1; harmonic <= harmonics; harmonic++) {
            samples[i] += Math.sin(2 * Math.PI * frequency * harmonic * time) / harmonic;
        }
    }

    return samples;
}

describe("detectPitch", () => {
    it("finds concert A in a sine wave", () => {
        let samples = new Float32Array(WINDOW);
        for (let i = 0; i < WINDOW; i++) samples[i] = Math.sin(2 * Math.PI * 440 * i / SAMPLE_RATE);

        expect(detectPitch(samples, SAMPLE_RATE)?.frequency).toBeCloseTo(440, 0);
    });

    it("finds the fundamental of every open string, not an overtone", () => {
        for (let midi of [40, 45, 50, 55, 59, 64]) {
            let expected = midiToFrequency(midi);
            let reading = detectPitch(pluckedString(expected), SAMPLE_RATE);

            expect(reading, `MIDI ${midi}`).not.toBeNull();

            // Within a couple of cents, which is finer than anyone can hear.
            expect(reading!.frequency, `MIDI ${midi}`).toBeCloseTo(expected, 0);
        }
    });

    it("returns null for silence", () => {
        expect(detectPitch(new Float32Array(WINDOW), SAMPLE_RATE)).toBeNull();
    });

    it("returns null for noise", () => {
        let samples = new Float32Array(WINDOW);
        // A fixed pattern rather than Math.random, so a failure here is reproducible.
        for (let i = 0; i < WINDOW; i++) samples[i] = Math.sin(i * i * 0.0007) * 0.5;

        expect(detectPitch(samples, SAMPLE_RATE)).toBeNull();
    });
});

describe("isPlausiblePitch", () => {
    it("rejects a confident reading outside a guitar's range", () => {
        expect(isPlausiblePitch(30, 0.99)).toBe(false);
        expect(isPlausiblePitch(3000, 0.99)).toBe(false);
    });

    it("rejects an in-range reading nothing was confident about", () => {
        expect(isPlausiblePitch(220, 0.4)).toBe(false);
    });

    it("accepts a confident reading in range", () => {
        expect(isPlausiblePitch(220, 0.95)).toBe(true);
    });
});

describe("median", () => {
    it("ignores an outlier a mean would follow", () => {
        expect(median([110, 111, 220, 110, 112])).toBe(111);
    });

    it("averages the middle pair when there is no single middle", () => {
        expect(median([100, 110, 120, 130])).toBe(115);
    });
});

describe("PitchHistory", () => {
    it("says nothing until it has enough to be sure", () => {
        let history = new PitchHistory(3);

        history.add(110);
        expect(history.settled()).toBeNull();

        history.add(111);
        expect(history.settled()).toBeNull();

        history.add(110);
        expect(history.settled()).toBe(110);
    });

    it("forgets readings older than its window", () => {
        let history = new PitchHistory(3);
        for (let frequency of [110, 110, 110, 220, 220, 220]) history.add(frequency);

        expect(history.settled()).toBe(220);
        expect(history.count).toBe(3);
    });

    it("shrugs off a single wild reading", () => {
        let history = new PitchHistory(5);
        for (let frequency of [110, 110, 440, 110, 111]) history.add(frequency);

        expect(history.settled()).toBe(110);
    });
});
