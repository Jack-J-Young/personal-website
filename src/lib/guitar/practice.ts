import {
    NOTE_NAMES,
    chordName,
    qualityBySymbol,
    scoreChord,
    type ChordMatch,
    type ChordQuality,
} from "$lib/audio";

export interface DrillChord {
    name: string;
    /** Pitch class of the root, 0 being C. */
    root: number;
    quality: ChordQuality;
}

const MAJOR = qualityBySymbol("");
const MINOR = qualityBySymbol("m");

function drillChord(note: string, quality: ChordQuality): DrillChord {
    let root = NOTE_NAMES.indexOf(note);
    if (root === -1) throw new Error(`"${note}" is not a note name`);

    return { name: chordName(root, quality), root, quality };
}

/**
 * The eight open chords a beginner meets first, and between them most of what anyone plays in
 * their first year.
 *
 * Deliberately far short of the hundred and twenty the recogniser knows: a drill is only worth
 * doing if every prompt is something you can nearly play already, and being asked for F#m7 in the
 * first week is a way of being told to stop.
 */
export const BEGINNER_CHORDS: DrillChord[] = [
    drillChord("C", MAJOR),
    drillChord("D", MAJOR),
    drillChord("E", MAJOR),
    drillChord("G", MAJOR),
    drillChord("A", MAJOR),
    drillChord("E", MINOR),
    drillChord("A", MINOR),
    drillChord("D", MINOR),
];

/**
 * The bar the prompted chord has to clear when something else matched it better.
 *
 * A chord can be a good match without being the best one, and the usual reason is a chord tone
 * that came out quiet rather than a chord that wasn't played — a muted third leaves a major
 * fitting the power chord's template more closely than its own, because the template that beats
 * it is the one not asking for the note that went missing. Refusing anything short of first place
 * would fail chords that were played correctly enough to count.
 *
 * The value is not arbitrary: a triad scored against its own template lands at 0.88 with its
 * third at a tenth of full strength and 0.85 with no third at all, so this sits in the gap and
 * amounts to insisting the third was audible. It is nowhere near the wrong chords — a minor
 * scored against the major sharing its root reaches only 0.69 — so the leniency costs nothing
 * where it would actually matter.
 */
export const CLEAR_SCORE = 0.85;

/** The bar when the prompted chord did win, which is what the recogniser calls a chord at all. */
export const LEAD_SCORE = 0.7;

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
): Attempt {
    let score = scoreChord(chroma, target.root, target.quality);
    let led = heard !== null && heard.name === target.name;

    return { heard, score, accepted: score >= (led ? LEAD_SCORE : CLEAR_SCORE) };
}

/**
 * The chord to prompt for next, never the one just asked for: a change from a chord to itself is
 * not a change, and takes no time.
 */
export function pickNext(
    chords: DrillChord[],
    just: DrillChord | null,
    random: () => number = Math.random,
): DrillChord {
    let options = chords.filter((chord) => chord !== just);
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
