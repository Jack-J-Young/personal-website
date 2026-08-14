export const STRINGS = 6;

/** The fewest fret rows a diagram draws, so a two-fret shape does not come out as a stub. */
export const DIAGRAM_FRETS = 4;

/**
 * One way of playing a chord, string by string from the low E.
 *
 * Frets are absolute — an A-shape barre at the fifth fret says 5, not 1 — and where the diagram
 * starts is worked out from them. An explicit offset alongside absolute frets would be two facts
 * that have to agree, and the failure when they don't is a diagram that looks right and teaches
 * the wrong shape.
 */
export interface ChordShape {
    /** Fret stopped on each string. 0 is open, null is not played. */
    frets: (number | null)[];
    /** Which finger stops each string, 1 index to 4 little. Null wherever nothing is stopped. */
    fingers: (number | null)[];
}

/**
 * Throws on a shape that isn't six strings long, which is the whole class of mistake a hand-typed
 * table makes. A chord silently short of a string would render as a plausible diagram.
 */
export function chordShape(frets: (number | null)[], fingers: (number | null)[]): ChordShape {
    if (frets.length !== STRINGS) throw new Error(`A shape needs ${STRINGS} frets, got ${frets.length}`);
    if (fingers.length !== STRINGS) throw new Error(`A shape needs ${STRINGS} fingers, got ${fingers.length}`);

    return { frets, fingers };
}

export interface FretWindow {
    /** The fret shown on the top row. */
    first: number;
    /** How many fret rows to draw. */
    rows: number;
    /** Whether the top line is the nut rather than a fret, which is what makes it drawn thick. */
    atNut: boolean;
}

/**
 * Which stretch of neck the diagram covers.
 *
 * Anything reachable from the nut is drawn from the nut, because "third fret" means nothing to a
 * hand that cannot see where the neck starts. Only once a shape is out of that reach does the
 * diagram slide up the neck and say where it went.
 */
export function fretWindow(shape: ChordShape, minRows = DIAGRAM_FRETS): FretWindow {
    let stopped = shape.frets.filter((fret): fret is number => fret !== null && fret > 0);
    if (stopped.length === 0) return { first: 1, rows: minRows, atNut: true };

    let highest = Math.max(...stopped);
    if (highest <= minRows) return { first: 1, rows: minRows, atNut: true };

    let first = Math.min(...stopped);
    return { first, rows: Math.max(minRows, highest - first + 1), atNut: false };
}

export interface Barre {
    finger: number;
    fret: number;
    /**
     * Every string the finger stops, low string first — the ends of which are where the bar is
     * drawn from and to.
     *
     * The strings *between* those ends are not in here, and must not be: an A-shape major bars the
     * second fret from the A string to the high E while three fingers sit at the fourth fret in
     * between. Those three are under the bar on the diagram and are not part of it.
     */
    strings: number[];
}

/**
 * The bars to draw, worked out from the fingering rather than stated alongside it.
 *
 * A barre *is* one finger on several strings at one fret — there is nothing else it could be — so
 * recording it separately would be a second copy of a fact already written down, free to disagree
 * with the first.
 */
export function barresOf(shape: ChordShape): Barre[] {
    let held = new Map<number, number[]>();

    shape.fingers.forEach((finger, string) => {
        let fret = shape.frets[string];
        if (finger === null || fret === null || fret === 0) return;

        let strings = held.get(finger);
        if (strings) strings.push(string);
        else held.set(finger, [string]);
    });

    let barres: Barre[] = [];

    for (let [finger, strings] of held) {
        // The lowest string a finger is on is the one it is anchored by; anything it reaches at a
        // different fret is a different note, not part of the bar.
        let fret = shape.frets[strings[0]];
        let across = strings.filter((string) => shape.frets[string] === fret);
        if (across.length < 2 || fret === null) continue;

        barres.push({ finger, fret, strings: across });
    }

    return barres;
}

/** The way a shape is written down in text — "x32010" is how anyone would say it out loud. */
export function describeShape(shape: ChordShape): string {
    return shape.frets.map((fret) => (fret === null ? "x" : String(fret))).join(" ");
}
