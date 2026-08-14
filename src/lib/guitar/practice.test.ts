import { describe, expect, it } from "vitest";

import { matchChords } from "$lib/audio";
import {
    CHORD_SETS,
    DEFAULT_ACCEPTANCE,
    DEFAULT_CHORDS,
    EVERY_CHORD,
    chordScores,
    chordsIn,
    isDrillable,
    judgeAttempt,
    leadBarFor,
    pickNext,
    sortScores,
    transitionScores,
    type DrillChord,
    type DrillScore,
    type Strum,
} from "./practice";
import { barresOf, fretWindow } from "./shapes";

const OPEN_CHORDS = chordsIn(DEFAULT_CHORDS);

function labelsOf(id: string): string[] {
    let set = CHORD_SETS.find((candidate) => candidate.id === id);
    if (!set) throw new Error(`No chord set called "${id}"`);

    return set.chords.map((chord) => chord.label);
}

function chordNamed(name: string): DrillChord {
    let chord = OPEN_CHORDS.find((candidate) => candidate.name === name);
    if (!chord) throw new Error(`No drill chord named "${name}"`);

    return chord;
}

function chordLabelled(label: string): DrillChord {
    let chord = EVERY_CHORD.find((candidate) => candidate.label === label);
    if (!chord) throw new Error(`No drill chord labelled "${label}"`);

    return chord;
}

function chromaOf(...pitchClasses: number[]): Float32Array {
    let chroma = new Float32Array(12);
    for (let pitchClass of pitchClasses) chroma[pitchClass] = 1;
    return chroma;
}

/** Puts a chroma through the same ranking the page does, then asks the drill about it. */
function attempt(target: string, chroma: Float32Array, acceptance?: number) {
    return judgeAttempt(chordNamed(target), chroma, matchChords(chroma)[0] ?? null, acceptance);
}

const C = 0;
const D = 2;
const E = 4;
const F_SHARP = 6;
const G = 7;
const A = 9;
const B = 11;

describe("the chord sets", () => {
    it("starts on the eight open chords, named the way they are written", () => {
        expect(OPEN_CHORDS.map((chord) => chord.label))
            .toEqual(["C", "D", "E", "G", "A", "Em", "Am", "Dm"]);
    });

    it("gives every chord a label of its own", () => {
        // The scoreboard groups by label. A barre G and an open G sound identical and are two
        // different things to practise, so sharing a row would average them together.
        let labels = EVERY_CHORD.map((chord) => chord.label);

        expect(new Set(labels).size).toBe(labels.length);
    });

    it("tags a barre chord and leaves the rest alone", () => {
        let barre = EVERY_CHORD.find((chord) => chord.label === "G barre");

        expect(barre?.name).toBe("G");
        expect(barre?.tag).toBe("barre");
        expect(chordNamed("G").tag).toBeNull();
    });

    it("names the power chords after their own quality, so they need no tag", () => {
        let power = chordsIn(labelsOf("power"));

        expect(power.map((chord) => chord.label))
            .toEqual(["E5", "F5", "G5", "A5", "B5", "C5", "D5"]);
        expect(power.every((chord) => chord.tag === null)).toBe(true);
    });

    it("draws every shape on six strings, with a bar wherever the set says barre", () => {
        for (let chord of EVERY_CHORD) {
            expect(chord.shape.frets).toHaveLength(6);
            expect(chord.shape.fingers).toHaveLength(6);
            expect(fretWindow(chord.shape).rows).toBeGreaterThanOrEqual(4);
        }

        for (let chord of chordsIn(labelsOf("barre"))) {
            expect(barresOf(chord.shape).length).toBeGreaterThan(0);
        }
        for (let chord of OPEN_CHORDS) {
            expect(barresOf(chord.shape)).toEqual([]);
        }
    });
});

describe("chordsIn", () => {
    it("returns chords in the order the sets are offered, not the order they were ticked", () => {
        // The selection is a set. One that reordered itself as it was edited would be a different
        // list every time it was read, and the prompt is drawn from an index into it.
        let jumbled = ["D5", "Am", "F barre", "C"];

        expect(chordsIn(jumbled).map((chord) => chord.label)).toEqual(["C", "Am", "F barre", "D5"]);
    });

    it("ignores a label that names nothing", () => {
        expect(chordsIn(["C", "H diminished-ninth"]).map((chord) => chord.label)).toEqual(["C"]);
    });

    it("has nothing to offer when nothing is chosen", () => {
        expect(chordsIn([])).toEqual([]);
    });
});

describe("isDrillable", () => {
    it("needs two chords, because one chord has no change to time", () => {
        expect(isDrillable(chordsIn(["C"]))).toBe(false);
        expect(isDrillable(chordsIn(["C", "G"]))).toBe(true);
        expect(isDrillable([])).toBe(false);
    });

    it("needs two that sound different, not merely two entries", () => {
        // An open G and a barre G are one sound. `pickNext` excludes by name, so a pool of exactly
        // those two would leave it nothing to pick and every prompt following itself.
        expect(isDrillable(chordsIn(["G", "G barre"]))).toBe(false);
        expect(isDrillable(chordsIn(["G", "G barre", "C"]))).toBe(true);
    });

    it("counts every chord there is as drillable", () => {
        expect(isDrillable(EVERY_CHORD)).toBe(true);
    });
});

describe("judgeAttempt", () => {
    it("accepts the chord it asked for", () => {
        expect(attempt("C", chromaOf(C, E, G)).accepted).toBe(true);
        expect(attempt("Am", chromaOf(A, C, E)).accepted).toBe(true);
    });

    it("rejects a different chord", () => {
        expect(attempt("C", chromaOf(G, B, D)).accepted).toBe(false);
    });

    it("rejects the same root played as the other quality", () => {
        // Not a near miss to be generous about — this is the mistake a drill exists to catch, and
        // it is nowhere near the bar. Both directions, because only one of them is a subset.
        expect(attempt("A", chromaOf(A, C, E)).score).toBeLessThan(0.75);
        expect(attempt("A", chromaOf(A, C, E)).accepted).toBe(false);
        expect(attempt("Am", chromaOf(A, C + 1, E)).accepted).toBe(false);
    });

    it("accepts a major whose third was too quiet to win the ranking", () => {
        // The whole reason there are two bars. D5 matches better, but a D was played.
        let weakThird = new Float32Array(12);
        weakThird[D] = 1;
        weakThird[F_SHARP] = 0.2;
        weakThird[A] = 1;

        let judged = attempt("D", weakThird);

        expect(judged.heard?.name).toBe("D5");
        expect(judged.accepted).toBe(true);
    });

    it("does not accept a bare power chord as the major", () => {
        // No third at all is a different thing from a quiet one: nothing was played that says
        // major rather than minor, so there is nothing to be generous about.
        expect(attempt("D", chromaOf(D, A)).accepted).toBe(false);
    });

    it("reports what it heard even when that is what was asked for", () => {
        expect(attempt("E", chromaOf(E, G + 1, B)).heard?.name).toBe("E");
    });

    it("scores the chord asked for, not the one that won", () => {
        let judged = attempt("C", chromaOf(G, B, D));

        expect(judged.heard?.name).toBe("G");
        expect(judged.score).toBeLessThan(0.5);
    });

    it("accepts a power chord played as a power chord", () => {
        let chroma = chromaOf(D, A);
        let judged = judgeAttempt(chordLabelled("D5"), chroma, matchChords(chroma)[0] ?? null);

        expect(judged.heard?.name).toBe("D5");
        expect(judged.accepted).toBe(true);
    });

    it("does not accept a full major when a power chord was asked for", () => {
        // The two-bar rule handles this with no special case. D5's two notes are a subset of D's
        // three, so a D scores well against the D5 template — but the D wins the ranking, which
        // puts the prompt on the higher bar, and a subset scores just under it.
        let chroma = chromaOf(D, F_SHARP, A);
        let judged = judgeAttempt(chordLabelled("D5"), chroma, matchChords(chroma)[0] ?? null);

        expect(judged.heard?.name).toBe("D");
        expect(judged.score).toBeGreaterThan(0.75);
        expect(judged.accepted).toBe(false);
    });

    it("passes a chord it would have refused once the bar is lowered", () => {
        // A bare power chord scores 0.847 against the major, which the default just refuses. The
        // player with a quiet third and a laptop microphone is the reason the slider exists.
        let chroma = chromaOf(D, A);

        expect(attempt("D", chroma).accepted).toBe(false);
        expect(attempt("D", chroma, 0.8).accepted).toBe(true);
    });

    it("still refuses the wrong quality until the bar goes under where it scores", () => {
        // An Am against A reaches 0.69, so 0.7 is the point at which leniency turns into being
        // wrong — which is what the control's floor and its amber readout are about.
        let chroma = chromaOf(A, C, E);

        expect(attempt("A", chroma, 0.7).accepted).toBe(false);
        expect(attempt("A", chroma, 0.65).accepted).toBe(true);
    });

    it("moves the bar for a chord that won the ranking by the same amount", () => {
        expect(leadBarFor(DEFAULT_ACCEPTANCE)).toBeCloseTo(0.7);
        expect(leadBarFor(0.7)).toBeCloseTo(0.55);
    });

    it("rejects silence rather than dividing by it", () => {
        let judged = judgeAttempt(chordNamed("C"), new Float32Array(12), null);

        expect(judged.score).toBe(0);
        expect(judged.accepted).toBe(false);
    });
});

describe("pickNext", () => {
    it("never asks for the chord just played", () => {
        for (let chord of OPEN_CHORDS) {
            for (let roll = 0; roll < OPEN_CHORDS.length; roll++) {
                let picked = pickNext(OPEN_CHORDS, chord, () => roll / OPEN_CHORDS.length);
                expect(picked).not.toBe(chord);
            }
        }
    });

    it("never follows a chord with one that sounds the same", () => {
        // An open G into a barre G is a real thing to practise and not a thing this can measure:
        // the two are the same six notes, so the second strum would be accepted for sounding like
        // the first and the time would be a number about nothing.
        let both = chordsIn(["open", "barre"]);
        let openG = both.find((chord) => chord.label === "G");

        for (let roll = 0; roll < both.length; roll++) {
            let picked = pickNext(both, openG ?? null, () => roll / both.length);
            expect(picked.name).not.toBe("G");
        }
    });

    it("can pick anything, including the first and the last", () => {
        expect(pickNext(OPEN_CHORDS, null, () => 0)).toBe(OPEN_CHORDS[0]);
        expect(pickNext(OPEN_CHORDS, null, () => 0.999))
            .toBe(OPEN_CHORDS[OPEN_CHORDS.length - 1]);
    });

    it("repeats rather than failing when there is nothing else to pick", () => {
        let only = [chordNamed("C")];

        expect(pickNext(only, only[0], () => 0)).toBe(only[0]);
    });
});

function landed(chord: string, from: string | null, ms: number | null): Strum {
    return { chord, from, ms, landed: true };
}

function missed(chord: string, from: string | null): Strum {
    return { chord, from, ms: null, landed: false };
}

function rowFor(scores: DrillScore[], label: string): DrillScore {
    let row = scores.find((score) => score.label === label);
    if (!row) throw new Error(`No row labelled "${label}"`);

    return row;
}

describe("chordScores", () => {
    const history: Strum[] = [
        landed("C", "G", 1800),
        landed("G", "C", 900),
        missed("C", "G"),
        landed("C", "Am", 1200),
        landed("G", "C", 2400),
    ];

    it("keeps the best, the latest and the mean for each chord", () => {
        expect(rowFor(chordScores(history), "C"))
            .toEqual({ label: "C", landed: 2, missed: 1, error: 1 / 3, best: 1200, last: 1200, average: 1500 });
    });

    it("groups by the chord moved to, whatever it was moved from", () => {
        // G→C and Am→C are different changes and get their own board; this one answers the other
        // question, which is whether the shape itself is learned.
        expect(rowFor(chordScores(history), "C").landed).toBe(2);
    });

    it("counts a wrong chord against what was asked for, and leaves the times alone", () => {
        // A miss is evidence about the chord and no evidence at all about how fast it can be
        // reached, because the change it was part of never completed.
        let stumbled = chordScores([missed("Dm", "A"), landed("Dm", "A", 1000)]);

        expect(rowFor(stumbled, "Dm").error).toBe(0.5);
        expect(rowFor(stumbled, "Dm").average).toBe(1000);
    });

    it("shows a chord that has landed but never been timed", () => {
        // The first chord of a session has nothing to be timed from. It was still played.
        let opening = rowFor(chordScores([landed("E", null, null)]), "E");

        expect(opening).toEqual({
            label: "E", landed: 1, missed: 0, error: 0, best: null, last: null, average: null,
        });
    });

    it("has nothing to say about a session with nothing played", () => {
        expect(chordScores([])).toEqual([]);
    });
});

describe("transitionScores", () => {
    const history: Strum[] = [
        landed("C", "G", 1800),
        landed("G", "C", 900),
        missed("C", "Am"),
        landed("C", "Am", 1200),
    ];

    it("keeps each pair apart", () => {
        expect(transitionScores(history).map((score) => score.label))
            .toEqual(["G → C", "C → G", "Am → C"]);
    });

    it("scores a pair on its own strums", () => {
        expect(rowFor(transitionScores(history), "Am → C"))
            .toEqual({ label: "Am → C", landed: 1, missed: 1, error: 0.5, best: 1200, last: 1200, average: 1200 });
    });

    it("drops a strum with nothing before it, since a change needs a chord at each end", () => {
        expect(transitionScores([landed("E", null, null), missed("A", null)])).toEqual([]);
    });
});

describe("sortScores", () => {
    const scores = chordScores([
        landed("C", "G", 1000),
        landed("G", "C", 2000),
        missed("G", "C"),
        landed("Am", null, null),
    ]);

    function order(column: Parameters<typeof sortScores>[1], direction: "asc" | "desc") {
        return sortScores(scores, column, direction).map((score) => score.label);
    }

    it("ranks on the best time, so one fumble does not top the list", () => {
        expect(order("best", "desc")).toEqual(["G", "C", "Am"]);
        expect(order("best", "asc")).toEqual(["C", "G", "Am"]);
    });

    it("keeps an untimed row at the bottom whichever way the column points", () => {
        expect(order("average", "desc").at(-1)).toBe("Am");
        expect(order("average", "asc").at(-1)).toBe("Am");
    });

    it("sorts the counts and the error share", () => {
        expect(order("error", "desc")).toEqual(["G", "Am", "C"]);
        expect(order("landed", "asc")).toEqual(["Am", "C", "G"]);
    });

    it("sorts by name both ways", () => {
        expect(order("label", "asc")).toEqual(["Am", "C", "G"]);
        expect(order("label", "desc")).toEqual(["G", "C", "Am"]);
    });

    it("breaks ties by name rather than by the order they were played in", () => {
        // Am and C both have a zero error rate; without the tie-break the board would reshuffle
        // itself as the session went on, for no reason the player could see.
        expect(order("error", "asc").slice(0, 2)).toEqual(["Am", "C"]);
    });

    it("leaves the array it was given alone", () => {
        let before = scores.map((score) => score.label);
        sortScores(scores, "label", "desc");

        expect(scores.map((score) => score.label)).toEqual(before);
    });
});
