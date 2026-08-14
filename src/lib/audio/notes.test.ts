import { describe, expect, it } from "vitest";

import {
    STANDARD_TUNING,
    centsBetween,
    frequencyToMidi,
    midiToFrequency,
    nearestString,
    noteFromFrequency,
    pitchClassOf,
} from "./notes";

describe("frequencyToMidi", () => {
    it("puts concert A at 69", () => {
        expect(frequencyToMidi(440)).toBeCloseTo(69, 10);
    });

    it("moves twelve numbers per octave", () => {
        expect(frequencyToMidi(880)).toBeCloseTo(81, 10);
        expect(frequencyToMidi(220)).toBeCloseTo(57, 10);
    });

    it("reports the fractional part rather than rounding", () => {
        // A quarter tone above A4 is half a semitone, so half a MIDI number.
        expect(frequencyToMidi(440 * 2 ** (0.5 / 12))).toBeCloseTo(69.5, 10);
    });
});

describe("midiToFrequency", () => {
    it("inverts frequencyToMidi", () => {
        for (let midi of [40, 45, 50, 55, 59, 64]) {
            expect(frequencyToMidi(midiToFrequency(midi))).toBeCloseTo(midi, 10);
        }
    });

    it("gives the open low E its published frequency", () => {
        expect(midiToFrequency(40)).toBeCloseTo(82.41, 2);
    });
});

describe("pitchClassOf", () => {
    it("folds octaves together", () => {
        expect(pitchClassOf(60)).toBe(0);
        expect(pitchClassOf(72)).toBe(0);
    });

    it("stays positive below MIDI zero", () => {
        expect(pitchClassOf(-1)).toBe(11);
    });
});

describe("noteFromFrequency", () => {
    it("names concert A and reports it as in tune", () => {
        let note = noteFromFrequency(440);

        expect(note.name).toBe("A");
        expect(note.octave).toBe(4);
        expect(note.midi).toBe(69);
        expect(note.cents).toBeCloseTo(0, 10);
    });

    it("changes octave at C, not at A", () => {
        expect(noteFromFrequency(261.6256).octave).toBe(4);
        expect(noteFromFrequency(246.9417).octave).toBe(3);
    });

    it("measures how far out of tune a frequency is", () => {
        let sharp = noteFromFrequency(440 * 2 ** (10 / 1200));

        expect(sharp.midi).toBe(69);
        expect(sharp.cents).toBeCloseTo(10, 6);
    });

    it("snaps to the nearer semitone once past the midpoint", () => {
        let note = noteFromFrequency(440 * 2 ** (60 / 1200));

        expect(note.name).toBe("A#");
        expect(note.cents).toBeCloseTo(-40, 6);
    });
});

describe("centsBetween", () => {
    it("makes an octave 1200 cents", () => {
        expect(centsBetween(880, 440)).toBeCloseTo(1200, 10);
    });

    it("is negative when flat of the reference", () => {
        expect(centsBetween(220, 440)).toBeCloseTo(-1200, 10);
    });
});

describe("nearestString", () => {
    it("picks the string a slightly flat note belongs to", () => {
        expect(nearestString(80).number).toBe(6);
        expect(nearestString(108).number).toBe(5);
        expect(nearestString(325).number).toBe(1);
    });

    it("compares in cents rather than hertz", () => {
        // 287 Hz is nearer B3 in hertz but nearer E4 in pitch, and pitch is what a player means.
        // Comparing in hertz would bias every reading towards the thicker strings.
        expect(nearestString(287).number).toBe(1);
    });

    it("covers standard tuning bottom to top", () => {
        expect(STANDARD_TUNING.map((string) => string.name))
            .toEqual(["E", "A", "D", "G", "B", "E"]);
        expect(STANDARD_TUNING.map((string) => string.number)).toEqual([6, 5, 4, 3, 2, 1]);
    });
});
