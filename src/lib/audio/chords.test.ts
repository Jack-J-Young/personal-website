import { describe, expect, it } from "vitest";

import { chromaFromSpectrum } from "./chroma";
import { detectChord, matchChords, qualityBySymbol, scoreChord } from "./chords";
import { midiToFrequency } from "./notes";

const SAMPLE_RATE = 44100;
const BINS = 8192;

function chromaOf(...pitchClasses: number[]): Float32Array {
    let chroma = new Float32Array(12);
    for (let pitchClass of pitchClasses) chroma[pitchClass] = 1;
    return chroma;
}

const C = 0;
const D = 2;
const E = 4;
const F = 5;
const F_SHARP = 6;
const G = 7;
const A = 9;
const B = 11;

describe("detectChord", () => {
    it("names a major triad", () => {
        expect(detectChord(chromaOf(C, E, G))?.name).toBe("C");
    });

    it("names a minor triad", () => {
        expect(detectChord(chromaOf(A, C, E))?.name).toBe("Am");
    });

    it("prefers the seventh chord when the seventh is actually there", () => {
        expect(detectChord(chromaOf(G, B, D, F))?.name).toBe("G7");
        expect(detectChord(chromaOf(G, B, D))?.name).toBe("G");
    });

    it("names a power chord rather than guessing at the missing third", () => {
        expect(detectChord(chromaOf(E, B))?.name).toBe("E5");
    });

    it("returns null when every note is present at once", () => {
        // Twelve equal notes is what noise looks like, and no chord should survive it.
        let mush = new Float32Array(12).fill(1);

        expect(detectChord(mush)).toBeNull();
    });

    it("returns null for silence", () => {
        expect(detectChord(new Float32Array(12))).toBeNull();
        expect(matchChords(new Float32Array(12))).toEqual([]);
    });
});

describe("matchChords", () => {
    it("ranks the near misses below the answer", () => {
        let ranked = matchChords(chromaOf(C, E, G));

        expect(ranked[0].name).toBe("C");
        expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
    });

    it("cannot tell a sus2 from the sus4 a fourth below it", () => {
        // The two chords are the same three notes. Nothing in a chromagram separates them,
        // which is why the bass note has to.
        let ranked = matchChords(chromaOf(C, D, G));

        expect(ranked.slice(0, 2).map((match) => match.name).sort())
            .toEqual(["Csus2", "Gsus4"]);
        expect(ranked[0].score).toBeCloseTo(ranked[1].score, 10);
    });

    it("uses the bass note to settle that tie", () => {
        expect(detectChord(chromaOf(C, D, G), { bass: C })?.name).toBe("Csus2");
        expect(detectChord(chromaOf(C, D, G), { bass: G })?.name).toBe("Gsus4");
    });

    it("reports the similarity itself, not the similarity plus the bass nudge", () => {
        // The bass changes which match comes first. It must not change the number shown as a
        // confidence, or a chord picked on a hint would claim to be certain.
        let withoutBass = matchChords(chromaOf(C, E, G))[0];
        let withBass = matchChords(chromaOf(C, E, G), { bass: C })[0];

        expect(withBass.name).toBe(withoutBass.name);
        expect(withBass.score).toBe(withoutBass.score);
        expect(withBass.score).toBeLessThan(1);
    });

    it("does not let the bass invent a chord that isn't being played", () => {
        let mush = new Float32Array(12).fill(1);

        expect(detectChord(mush, { bass: C })).toBeNull();
    });
});

describe("qualityBySymbol", () => {
    it("finds a quality by what gets appended to the root", () => {
        expect(qualityBySymbol("").name).toBe("major");
        expect(qualityBySymbol("m").name).toBe("minor");
    });

    it("throws on a symbol that doesn't exist", () => {
        expect(() => qualityBySymbol("min")).toThrow();
    });
});

describe("scoreChord", () => {
    const MAJOR = qualityBySymbol("");
    const MINOR = qualityBySymbol("m");

    it("agrees exactly with the ranking when the chord asked about is the winner", () => {
        let chroma = chromaOf(C, E, G);

        expect(scoreChord(chroma, C, MAJOR)).toBeCloseTo(matchChords(chroma)[0].score, 10);
    });

    it("scores a chord that isn't being played low", () => {
        expect(scoreChord(chromaOf(C, E, G), D, MAJOR)).toBeLessThan(0.3);
    });

    it("still rates a major highly when its third is too quiet to win", () => {
        // The case this exists for: a D whose F# barely sounds. The power chord wins, because the
        // note that went missing is the one it never asked for — but the D was still played.
        let weakThird = new Float32Array(12);
        weakThird[D] = 1;
        weakThird[F_SHARP] = 0.2;
        weakThird[A] = 1;

        expect(matchChords(weakThird)[0].name).toBe("D5");
        expect(scoreChord(weakThird, D, MAJOR)).toBeGreaterThan(0.85);
    });

    it("does not rate the wrong quality highly when the third is there", () => {
        expect(scoreChord(chromaOf(A, C, E), A, MAJOR)).toBeLessThan(0.85);
        expect(scoreChord(chromaOf(A, C, E), A, MINOR)).toBeGreaterThan(0.95);
    });

    it("returns 0 for silence", () => {
        expect(scoreChord(new Float32Array(12), C, MAJOR)).toBe(0);
    });
});

describe("end to end", () => {
    function spectrumOfChord(midiNotes: number[]): Float32Array {
        let spectrum = new Float32Array(BINS);
        let binWidth = SAMPLE_RATE / (2 * BINS);

        for (let midi of midiNotes) {
            let fundamental = midiToFrequency(midi);
            for (let harmonic = 1; harmonic <= 5; harmonic++) {
                spectrum[Math.round((fundamental * harmonic) / binWidth)] = 1 / harmonic;
            }
        }

        return spectrum;
    }

    it("reads a synthesised C major off a spectrum", () => {
        let chroma = chromaFromSpectrum(spectrumOfChord([48, 52, 55]), SAMPLE_RATE);

        expect(detectChord(chroma)?.name).toBe("C");
    });

    it("reads a synthesised E minor off a spectrum", () => {
        let chroma = chromaFromSpectrum(spectrumOfChord([40, 47, 52, 55, 59, 64]), SAMPLE_RATE);

        expect(detectChord(chroma)?.name).toBe("Em");
    });

    it("does not hear a chord in a single string", () => {
        let chroma = chromaFromSpectrum(spectrumOfChord([40]), SAMPLE_RATE);

        expect(detectChord(chroma)?.name).toBe("E5");
    });
});
