import { describe, expect, it } from "vitest";

import {
    MIN_MIDI,
    bassPitchClass,
    chromaFromSpectrum,
    foldToChroma,
    noteEnergies,
    suppressHarmonics,
} from "./chroma";
import { midiToFrequency } from "./notes";

const SAMPLE_RATE = 44100;

/** The bin count the chord recogniser actually runs at, so these test the real resolution. */
const BINS = 8192;

interface Partial {
    frequency: number;
    magnitude: number;
}

function spectrumWith(partials: Partial[], bins = BINS): Float32Array {
    let spectrum = new Float32Array(bins);
    let binWidth = SAMPLE_RATE / (2 * bins);

    for (let partial of partials) {
        spectrum[Math.round(partial.frequency / binWidth)] = partial.magnitude;
    }

    return spectrum;
}

/** A plucked string: a fundamental with overtones falling away as 1/n. */
function pluck(fundamental: number, count = 5): Partial[] {
    return Array.from({ length: count }, (_, i) => ({
        frequency: fundamental * (i + 1),
        magnitude: 1 / (i + 1),
    }));
}

function energiesFrom(values: Record<number, number>): Float32Array {
    let energies = new Float32Array(49);
    for (let [index, value] of Object.entries(values)) energies[Number(index)] = value;
    return energies;
}

describe("noteEnergies", () => {
    it("finds a tone under the note it belongs to", () => {
        let energies = noteEnergies(spectrumWith([{ frequency: 440, magnitude: 1 }]), SAMPLE_RATE);

        expect(energies[69 - MIN_MIDI]).toBe(1);
        expect(energies[68 - MIN_MIDI]).toBe(0);
        expect(energies[70 - MIN_MIDI]).toBe(0);
    });

    it("does not favour high notes over low ones", () => {
        let spectrum = spectrumWith([
            { frequency: midiToFrequency(40), magnitude: 1 },
            { frequency: midiToFrequency(76), magnitude: 1 },
        ]);
        let energies = noteEnergies(spectrum, SAMPLE_RATE);

        // A semitone is a fixed ratio, so its band covers far more bins at the top of the range
        // than the bottom. Summing them would make the high note read as louder.
        expect(energies[40 - MIN_MIDI]).toBe(energies[76 - MIN_MIDI]);
    });
});

describe("foldToChroma", () => {
    it("adds octaves of the same note together", () => {
        let spectrum = spectrumWith([
            { frequency: midiToFrequency(64), magnitude: 0.5 },
            { frequency: midiToFrequency(76), magnitude: 0.5 },
        ]);
        let chroma = foldToChroma(noteEnergies(spectrum, SAMPLE_RATE));

        expect(chroma[4]).toBe(1);
        expect([...chroma].filter((value) => value > 0)).toHaveLength(1);
    });

    it("scales to the loudest class, so volume drops out", () => {
        let quiet = foldToChroma(energiesFrom({ 0: 0.02, 7: 0.01 }));
        let loud = foldToChroma(energiesFrom({ 0: 0.9, 7: 0.45 }));

        expect([...quiet]).toEqual([...loud]);
        expect(Math.max(...quiet)).toBe(1);
    });

    it("leaves an empty spectrum empty rather than dividing by zero", () => {
        expect([...foldToChroma(new Float32Array(49))].every((value) => value === 0)).toBe(true);
    });
});

describe("suppressHarmonics", () => {
    it("removes an overtone that a lower note fully explains", () => {
        let cleaned = suppressHarmonics(energiesFrom({ 0: 1, 12: 0.5 }));

        expect(cleaned[0]).toBe(1);
        expect(cleaned[12]).toBe(0);
    });

    it("keeps an octave that is too loud to be an overtone", () => {
        let cleaned = suppressHarmonics(energiesFrom({ 0: 1, 12: 1 }));

        expect(cleaned[12]).toBeCloseTo(0.45, 6);
    });

    it("never drives a note below silence", () => {
        let cleaned = suppressHarmonics(energiesFrom({ 0: 10, 12: 0.1 }));

        expect(cleaned[12]).toBe(0);
    });
});

describe("chromaFromSpectrum", () => {
    it("reads a single plucked string as one note", () => {
        let chroma = chromaFromSpectrum(spectrumWith(pluck(midiToFrequency(40))), SAMPLE_RATE);

        expect(chroma[4]).toBe(1);

        // The third harmonic of a low E is a B, and it is the reason an unsuppressed chromagram
        // reads one string as a chord.
        expect(chroma[11]).toBeLessThan(0.01);
    });

    it("leaves that B behind when harmonic suppression is off", () => {
        let chroma = chromaFromSpectrum(
            spectrumWith(pluck(midiToFrequency(40))),
            SAMPLE_RATE,
            { suppressHarmonics: false },
        );

        expect(chroma[11]).toBeGreaterThan(0.15);
    });

    it("keeps the notes of a chord that is genuinely being played", () => {
        let spectrum = spectrumWith([
            ...pluck(midiToFrequency(48)),
            ...pluck(midiToFrequency(52)),
            ...pluck(midiToFrequency(55)),
        ]);
        let chroma = chromaFromSpectrum(spectrum, SAMPLE_RATE);

        for (let pitchClass of [0, 4, 7]) expect(chroma[pitchClass]).toBeGreaterThan(0.3);
    });
});

describe("bassPitchClass", () => {
    it("returns the lowest note carrying real energy", () => {
        expect(bassPitchClass(energiesFrom({ 0: 1, 7: 0.8 }))).toBe(4);
    });

    it("steps over rumble too quiet to be a played note", () => {
        expect(bassPitchClass(energiesFrom({ 0: 0.1, 5: 1 }))).toBe(9);
    });

    it("returns null when nothing is playing", () => {
        expect(bassPitchClass(new Float32Array(49))).toBeNull();
    });
});
