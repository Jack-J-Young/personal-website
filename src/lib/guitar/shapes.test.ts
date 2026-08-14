import { describe, expect, it } from "vitest";

import { barresOf, chordShape, describeShape, fretWindow } from "./shapes";

const OPEN_C = chordShape([null, 3, 2, 0, 1, 0], [null, 3, 2, null, 1, null]);
const F_BARRE = chordShape([1, 3, 3, 2, 1, 1], [1, 3, 4, 2, 1, 1]);
const D_POWER = chordShape([null, 5, 7, 7, null, null], [null, 1, 3, 4, null, null]);
const OPEN_E_MINOR = chordShape([0, 2, 2, 0, 0, 0], [null, 2, 3, null, null, null]);

describe("chordShape", () => {
    it("refuses a shape that is not six strings long", () => {
        // The mistake a hand-typed table makes, and one string short renders as a plausible chord.
        expect(() => chordShape([0, 2, 2], [null, 2, 3])).toThrow();
        expect(() => chordShape([0, 2, 2, 0, 0, 0], [null, 2, 3])).toThrow();
    });
});

describe("fretWindow", () => {
    it("starts at the nut for anything within reach of it", () => {
        expect(fretWindow(OPEN_C)).toEqual({ first: 1, rows: 4, atNut: true });
        expect(fretWindow(F_BARRE)).toEqual({ first: 1, rows: 4, atNut: true });
    });

    it("slides up the neck once a shape is out of that reach", () => {
        expect(fretWindow(D_POWER)).toEqual({ first: 5, rows: 4, atNut: false });
    });

    it("starts at the nut for a chord with nothing stopped at all", () => {
        expect(fretWindow(chordShape([0, 0, 0, 0, 0, 0], [null, null, null, null, null, null])))
            .toEqual({ first: 1, rows: 4, atNut: true });
    });

    it("grows rather than clipping a shape wider than the window", () => {
        let stretched = chordShape([null, 5, 7, 7, 9, null], [null, 1, 2, 3, 4, null]);

        expect(fretWindow(stretched)).toEqual({ first: 5, rows: 5, atNut: false });
    });
});

describe("barresOf", () => {
    it("finds one finger lying across several strings", () => {
        // An E-shape barre: the bar runs the full width, but the only strings it *stops* are the
        // low E and the top two. The three in between belong to the other three fingers and keep
        // their own dots.
        expect(barresOf(F_BARRE)).toEqual([{ finger: 1, fret: 1, strings: [0, 4, 5] }]);
    });

    it("finds nothing in a shape where every finger stops one string", () => {
        expect(barresOf(OPEN_C)).toEqual([]);
        expect(barresOf(OPEN_E_MINOR)).toEqual([]);
        expect(barresOf(D_POWER)).toEqual([]);
    });

    it("bars only the strings at the finger's own fret", () => {
        // An A-shape major: the index finger bars the second fret while three fingers sit at the
        // fourth. The bar is drawn from the A string to the high E and the three in between are
        // still their own notes — a bar that claimed them would erase three dots.
        let a_shape = chordShape([null, 2, 4, 4, 4, 2], [null, 1, 2, 3, 4, 1]);

        expect(barresOf(a_shape)).toEqual([{ finger: 1, fret: 2, strings: [1, 5] }]);
    });

    it("ignores a finger that appears to be shared with an open string", () => {
        let odd = chordShape([0, 2, 2, 0, 0, 0], [1, 1, 1, null, null, null]);

        expect(barresOf(odd)).toEqual([{ finger: 1, fret: 2, strings: [1, 2] }]);
    });
});

describe("describeShape", () => {
    it("writes a shape the way anyone would say it", () => {
        expect(describeShape(OPEN_C)).toBe("x 3 2 0 1 0");
        expect(describeShape(D_POWER)).toBe("x 5 7 7 x x");
    });
});
