import {
    NOTE_NAMES,
    chordName,
    qualityBySymbol,
    scoreChord,
    type ChordMatch,
    type ChordQuality,
} from "$lib/audio";
import { chordShape, type ChordShape } from "./shapes";

export interface DrillChord {
    /** What the recogniser calls it, which is what a strum is judged against. */
    name: string;
    /**
     * The shape family, where the name alone does not say it — "barre". Null when it does.
     *
     * It exists because a barre G and an open G are the same chord: the same six notes, the same
     * name, and nothing in the audio that could tell them apart. Only the tag distinguishes them.
     */
    tag: string | null;
    /** Unique across every set: what the prompt shows and what the scoreboard groups by. */
    label: string;
    /** Pitch class of the root, 0 being C. */
    root: number;
    quality: ChordQuality;
    /** Where the fingers go. Shown on request rather than always — see the trainer page. */
    shape: ChordShape;
}

const MAJOR = qualityBySymbol("");
const MINOR = qualityBySymbol("m");
const POWER = qualityBySymbol("5");

function drillChord(
    note: string,
    quality: ChordQuality,
    shape: ChordShape,
    tag: string | null = null,
): DrillChord {
    let root = NOTE_NAMES.indexOf(note);
    if (root === -1) throw new Error(`"${note}" is not a note name`);

    let name = chordName(root, quality);

    return { name, tag, label: tag === null ? name : `${name} ${tag}`, root, quality, shape };
}

export interface ChordSet {
    id: string;
    name: string;
    /** One line beside the tick box on what the set is for. */
    about: string;
    chords: DrillChord[];
}

/**
 * The eight open chords a beginner meets first, and between them most of what anyone plays in
 * their first year.
 *
 * Deliberately far short of the hundred and twenty the recogniser knows: a drill is only worth
 * doing if every prompt is something you can nearly play already, and being asked for F#m7 in the
 * first week is a way of being told to stop.
 */
const OPEN: ChordSet = {
    id: "open",
    name: "Open chords",
    about: "The eight most songs are built from.",
    chords: [
        drillChord("C", MAJOR, chordShape([null, 3, 2, 0, 1, 0], [null, 3, 2, null, 1, null])),
        drillChord("D", MAJOR, chordShape([null, null, 0, 2, 3, 2], [null, null, null, 1, 3, 2])),
        drillChord("E", MAJOR, chordShape([0, 2, 2, 1, 0, 0], [null, 2, 3, 1, null, null])),
        drillChord("G", MAJOR, chordShape([3, 2, 0, 0, 0, 3], [2, 1, null, null, null, 3])),
        drillChord("A", MAJOR, chordShape([null, 0, 2, 2, 2, 0], [null, null, 1, 2, 3, null])),
        drillChord("E", MINOR, chordShape([0, 2, 2, 0, 0, 0], [null, 2, 3, null, null, null])),
        drillChord("A", MINOR, chordShape([null, 0, 2, 2, 1, 0], [null, null, 2, 3, 1, null])),
        drillChord("D", MINOR, chordShape([null, null, 0, 2, 3, 1], [null, null, null, 2, 3, 1])),
    ],
};

/**
 * The movable shapes, at the frets where the songs are.
 *
 * All seven are one of three shapes — an open E, Em or Am with the index finger standing in for
 * the nut — which is the thing worth learning and the thing a diagram shows better than a name
 * does. Two of them land on chords the open set already has, so they carry the tag; the drill
 * cannot hear the difference, but the player is being asked for a different hand.
 */
const BARRE: ChordSet = {
    id: "barre",
    name: "Barre chords",
    about: "E, Em and Am shapes moved up the neck. The tool hears the chord, not the shape.",
    chords: [
        drillChord("F", MAJOR, chordShape([1, 3, 3, 2, 1, 1], [1, 3, 4, 2, 1, 1]), "barre"),
        drillChord("F#", MINOR, chordShape([2, 4, 4, 2, 2, 2], [1, 3, 4, 1, 1, 1]), "barre"),
        drillChord("G", MAJOR, chordShape([3, 5, 5, 4, 3, 3], [1, 3, 4, 2, 1, 1]), "barre"),
        drillChord("B", MINOR, chordShape([null, 2, 4, 4, 3, 2], [null, 1, 3, 4, 2, 1]), "barre"),
        drillChord("B", MAJOR, chordShape([null, 2, 4, 4, 4, 2], [null, 1, 2, 3, 4, 1]), "barre"),
        drillChord("C#", MINOR, chordShape([null, 4, 6, 6, 5, 4], [null, 1, 3, 4, 2, 1]), "barre"),
        drillChord("D", MINOR, chordShape([null, 5, 7, 7, 6, 5], [null, 1, 3, 4, 2, 1]), "barre"),
    ],
};

/**
 * Root and fifth on the bottom two string pairs, which is one shape slid around.
 *
 * They need no tag: `chordName` already writes them as E5 and A5, so nothing they contain can
 * collide with a chord from another set.
 */
const POWER_CHORDS: ChordSet = {
    id: "power",
    name: "Power chords",
    about: "Root and fifth, rooted on the low E and A strings.",
    chords: [
        drillChord("E", POWER, chordShape([0, 2, 2, null, null, null], [null, 1, 2, null, null, null])),
        drillChord("F", POWER, chordShape([1, 3, 3, null, null, null], [1, 3, 4, null, null, null])),
        drillChord("G", POWER, chordShape([3, 5, 5, null, null, null], [1, 3, 4, null, null, null])),
        drillChord("A", POWER, chordShape([null, 0, 2, 2, null, null], [null, null, 1, 2, null, null])),
        drillChord("B", POWER, chordShape([null, 2, 4, 4, null, null], [null, 1, 3, 4, null, null])),
        drillChord("C", POWER, chordShape([null, 3, 5, 5, null, null], [null, 1, 3, 4, null, null])),
        drillChord("D", POWER, chordShape([null, 5, 7, 7, null, null], [null, 1, 3, 4, null, null])),
    ],
};

export const CHORD_SETS: ChordSet[] = [OPEN, BARRE, POWER_CHORDS];

/** Every chord there is, which is what a label has to be unique across. */
export const EVERY_CHORD: DrillChord[] = CHORD_SETS.flatMap((set) => set.chords);

/** What the drill starts on, since it has to be asking for something. */
export const DEFAULT_CHORDS = OPEN.chords.map((chord) => chord.label);

/**
 * The chosen chords, always in the order the sets are offered rather than the order they were
 * ticked in — the list is a set, and a set that reordered itself as it was edited would be a
 * different list every time it was read.
 */
export function chordsIn(labels: string[]): DrillChord[] {
    return EVERY_CHORD.filter((chord) => labels.includes(chord.label));
}

/**
 * Whether a selection can be drilled at all.
 *
 * Two chords, and two that *sound* different: the drill measures changes, and there is no change
 * to measure between a chord and itself. An open G and a barre G are two entries and one sound, so
 * a pool of exactly those would leave `pickNext` with nothing to pick and every prompt following
 * itself.
 */
export function isDrillable(chords: DrillChord[]): boolean {
    return new Set(chords.map((chord) => chord.name)).size >= 2;
}

/**
 * The bar the prompted chord has to clear when something else matched it better, and what the
 * acceptance control sets.
 *
 * A chord can be a good match without being the best one, and the usual reason is a chord tone
 * that came out quiet rather than a chord that wasn't played — a muted third leaves a major
 * fitting the power chord's template more closely than its own, because the template that beats
 * it is the one not asking for the note that went missing. Refusing anything short of first place
 * would fail chords that were played correctly enough to count.
 *
 * The default is not arbitrary: a triad scored against its own template lands at 0.88 with its
 * third at a tenth of full strength and 0.85 with no third at all, so this sits in the gap and
 * amounts to insisting the third was audible.
 */
export const DEFAULT_ACCEPTANCE = 0.85;

/**
 * How far the control can be moved, and the reason it stops where it does.
 *
 * The floor is where being lenient starts being wrong rather than forgiving: a minor scored
 * against the major sharing its root reaches 0.69, so anything under about 0.7 begins accepting
 * the one mistake a drill exists to catch. It is offered anyway — a bad microphone in a quiet room
 * is a real problem and the player knows what they played — but not without a limit.
 */
export const LOOSEST_ACCEPTANCE = 0.6;
export const STRICTEST_ACCEPTANCE = 0.95;

/**
 * How far below the acceptance bar a chord that *won* the ranking is judged.
 *
 * One control rather than two. The two bars are the same question asked of different evidence, and
 * a tool with two confidence sliders would be asking the player to reconcile them — the same
 * reasoning that keeps the window threshold derived from the strum threshold in `sensitivity.ts`.
 */
const LEAD_GAP = 0.15;

/** The bar when the prompted chord did win, which is also what the recogniser will name at all. */
export function leadBarFor(acceptance: number): number {
    return acceptance - LEAD_GAP;
}

export interface Attempt {
    /** What the recogniser would have called it — worth showing when the answer is no. */
    heard: ChordMatch | null;
    /** How well the prompted chord matched, wherever it ranked. */
    score: number;
    accepted: boolean;
}

/**
 * Whether a strum counts as the chord that was asked for.
 *
 * Two bars rather than one, because winning the ranking is itself evidence: a chord that came
 * first only has to be plausible, while one that came second has to be convincing on its own.
 */
export function judgeAttempt(
    target: DrillChord,
    chroma: Float32Array,
    heard: ChordMatch | null,
    acceptance = DEFAULT_ACCEPTANCE,
): Attempt {
    let score = scoreChord(chroma, target.root, target.quality);
    let led = heard !== null && heard.name === target.name;

    return { heard, score, accepted: score >= (led ? leadBarFor(acceptance) : acceptance) };
}

/**
 * The chord to prompt for next, never the one just asked for: a change from a chord to itself is
 * not a change, and takes no time.
 *
 * Excluded by *name* rather than by identity, which matters once the barre set is on. An open G
 * followed by a barre G is a real thing to practise, but it is not a thing this tool can measure —
 * the two are the same six notes, so the second strum would be accepted by sounding identical to
 * the first, and the time would be a number about nothing.
 */
export function pickNext(
    chords: DrillChord[],
    just: DrillChord | null,
    random: () => number = Math.random,
): DrillChord {
    let options = chords.filter((chord) => chord.name !== just?.name);
    if (options.length === 0) options = chords;

    return options[Math.floor(random() * options.length)];
}

/**
 * One strum the recogniser could put a name to, judged against the chord being asked for.
 *
 * Misses are kept as well as landings, because a chord you reach every time and a chord you reach
 * on the third attempt can have identical times, and only one of them is learned. A strum too
 * quiet or too short to name at all is not recorded: that says nothing about the chord.
 */
export interface Strum {
    /** The chord that was being asked for. */
    chord: string;
    /**
     * The chord moved from, or null when there was nothing to move from — the first strum of a
     * session, and the one after a skip.
     */
    from: string | null;
    /**
     * Milliseconds since the strum that landed `from`. Null when there is nothing to time from,
     * and null on a miss: a time measures a change that completed.
     */
    ms: number | null;
    landed: boolean;
}

export interface DrillScore {
    /** The chord on the chord board, `from → to` on the changes board. */
    label: string;
    landed: number;
    /** Strums that named a chord, but not the one asked for. */
    missed: number;
    /** `missed` as a share of every strum that got named at all. */
    error: number;
    /** Null until something has been *timed*, which is not the same as until something landed. */
    best: number | null;
    last: number | null;
    average: number | null;
}

interface Tally {
    label: string;
    landed: number;
    missed: number;
    times: number[];
}

/** How a change is written wherever one is named, so the board and the prompt cannot disagree. */
export function transitionLabel(from: string, to: string): string {
    return `${from} → ${to}`;
}

function summarise(row: Tally): DrillScore {
    let timed = row.times.length;
    let total = row.times.reduce((sum, ms) => sum + ms, 0);

    return {
        label: row.label,
        landed: row.landed,
        missed: row.missed,
        error: row.missed / (row.landed + row.missed),
        best: timed === 0 ? null : Math.min(...row.times),
        last: timed === 0 ? null : row.times[timed - 1],
        average: timed === 0 ? null : total / timed,
    };
}

/**
 * Folds a session into one row per label, whichever way the strums are being named.
 *
 * The two boards differ only in that: a strum belongs to a chord and, if it followed one, to a
 * change. Everything after that — counting, timing, the error share — is the same question asked
 * of a different grouping, so it is written once.
 */
function tally(history: Strum[], labelOf: (strum: Strum) => string | null): DrillScore[] {
    let rows = new Map<string, Tally>();

    for (let strum of history) {
        let label = labelOf(strum);
        if (label === null) continue;

        let row = rows.get(label);
        if (!row) {
            row = { label, landed: 0, missed: 0, times: [] };
            rows.set(label, row);
        }

        if (strum.landed) row.landed++;
        else row.missed++;

        if (strum.ms !== null) row.times.push(strum.ms);
    }

    return [...rows.values()].map(summarise);
}

/** One row per chord asked for, however it was arrived at. */
export function chordScores(history: Strum[]): DrillScore[] {
    return tally(history, (strum) => strum.chord);
}

/**
 * One row per pair, which is the honest unit — C→G and Em→G are different changes and only one of
 * them is hard. The cost is that sixty-four pairs take far longer to fill with evidence than eight
 * chords do, which is why both boards exist rather than this one replacing the other.
 */
export function transitionScores(history: Strum[]): DrillScore[] {
    return tally(history, (strum) =>
        strum.from === null ? null : transitionLabel(strum.from, strum.chord));
}

export type ScoreColumn = "label" | "landed" | "error" | "best" | "average" | "last";
export type SortDirection = "asc" | "desc";

/**
 * Slowest best time first: the order worth practising in, and the reason the times are kept.
 *
 * Ranked on the best rather than the latest, because one slow attempt is a fumble while a best
 * time that stays high is a chord your hand cannot reach yet.
 */
export const DEFAULT_SORT: { column: ScoreColumn; direction: SortDirection } = {
    column: "best",
    direction: "desc",
};

/**
 * A row with no time yet sorts last whichever way the column points.
 *
 * It is not the fastest and not the slowest — it has no answer, and putting an unmeasured chord at
 * the top of a list of times would read as a claim about it.
 */
export function sortScores(
    scores: DrillScore[],
    column: ScoreColumn,
    direction: SortDirection,
): DrillScore[] {
    let sign = direction === "asc" ? 1 : -1;
    let byLabel = (a: DrillScore, b: DrillScore) => a.label.localeCompare(b.label);

    if (column === "label") return [...scores].sort((a, b) => sign * byLabel(a, b));

    return [...scores].sort((a, b) => {
        let left = a[column];
        let right = b[column];

        if (left === null || right === null) {
            if (left === right) return byLabel(a, b);
            return left === null ? 1 : -1;
        }

        // Ties broken by name so the order is the same every render, rather than depending on the
        // order the chords happened to be played in.
        return left === right ? byLabel(a, b) : sign * (left - right);
    });
}
