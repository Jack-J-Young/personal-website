import { CHROMA_BINS } from "./chroma";
import { NOTE_NAMES } from "./notes";

export interface ChordQuality {
    /** What gets appended to the root's name, so "m" gives "Am" and "" gives "A". */
    symbol: string;
    name: string;
    /** Semitones above the root. */
    intervals: number[];
}

export interface ChordMatch {
    /** Pitch class of the root, 0 being C. */
    root: number;
    quality: ChordQuality;
    name: string;
    /**
     * How closely the chroma matched, from 0 to 1.
     *
     * This is the similarity itself and nothing else. The bass note shifts the *order* matches
     * come back in, but adding it in here would inflate a number that is shown to the user as a
     * confidence, and would let a chord claim certainty it hasn't got.
     */
    score: number;
}

export interface MatchOptions {
    /** Pitch class of the lowest note heard, used to break ties between rival roots. */
    bass?: number | null;
    /** Matches scoring below this are treated as noise rather than a chord. */
    threshold?: number;
}

/**
 * Ordered by how often they turn up on a guitar, which decides ties: several of these share a
 * pitch-class set with another, and the earlier entry wins.
 */
export const CHORD_QUALITIES: ChordQuality[] = [
    { symbol: "", name: "major", intervals: [0, 4, 7] },
    { symbol: "m", name: "minor", intervals: [0, 3, 7] },
    { symbol: "7", name: "dominant 7th", intervals: [0, 4, 7, 10] },
    { symbol: "m7", name: "minor 7th", intervals: [0, 3, 7, 10] },
    { symbol: "maj7", name: "major 7th", intervals: [0, 4, 7, 11] },
    { symbol: "sus4", name: "suspended 4th", intervals: [0, 5, 7] },
    { symbol: "sus2", name: "suspended 2nd", intervals: [0, 2, 7] },
    { symbol: "5", name: "power chord", intervals: [0, 7] },
    { symbol: "dim", name: "diminished", intervals: [0, 3, 6] },
    { symbol: "aug", name: "augmented", intervals: [0, 4, 8] },
];

/**
 * The root counts for more than the other chord tones because guitar voicings double it — an open
 * G has three Gs in it — so a real chroma leans on the root more than an even template expects.
 */
const ROOT_WEIGHT = 1.3;
const CHORD_TONE_WEIGHT = 1;

/** Enough to settle a tie between rival roots, not enough to invent a chord that isn't there. */
const BASS_BONUS = 0.06;

const DEFAULT_THRESHOLD = 0.7;

export function chordName(root: number, quality: ChordQuality): string {
    return NOTE_NAMES[root] + quality.symbol;
}

/**
 * Throws rather than returning undefined: the only way to ask for a symbol that doesn't exist is
 * to mistype a literal, and a chord set that silently drops an entry is worse than one that fails
 * to load.
 */
export function qualityBySymbol(symbol: string): ChordQuality {
    let quality = CHORD_QUALITIES.find((candidate) => candidate.symbol === symbol);
    if (!quality) throw new Error(`No chord quality has the symbol "${symbol}"`);

    return quality;
}

function templateFor(root: number, quality: ChordQuality): Float32Array {
    let template = new Float32Array(CHROMA_BINS);

    for (let interval of quality.intervals) {
        template[(root + interval) % CHROMA_BINS] =
            interval === 0 ? ROOT_WEIGHT : CHORD_TONE_WEIGHT;
    }

    return template;
}

interface Candidate {
    root: number;
    quality: ChordQuality;
    template: Float32Array;
    magnitude: number;
}

function magnitudeOf(vector: Float32Array): number {
    let total = 0;
    for (let value of vector) total += value * value;
    return Math.sqrt(total);
}

const CANDIDATES: Candidate[] = CHORD_QUALITIES.flatMap((quality) =>
    Array.from({ length: CHROMA_BINS }, (_, root) => {
        let template = templateFor(root, quality);
        return { root, quality, template, magnitude: magnitudeOf(template) };
    }),
);

/**
 * Cosine similarity, which compares the shape of the two vectors and ignores their size. That is
 * what makes a quiet chord and a loud one score the same, and it is also what penalises energy
 * sitting outside the template: a note that shouldn't be there lengthens the chroma without
 * lengthening its shadow on the template.
 */
function similarity(
    chroma: Float32Array,
    chromaMagnitude: number,
    template: Float32Array,
    templateMagnitude: number,
): number {
    let dot = 0;
    for (let i = 0; i < CHROMA_BINS; i++) dot += chroma[i] * template[i];

    return dot / (chromaMagnitude * templateMagnitude);
}

/**
 * How well the chroma matches one particular chord, on the same scale `matchChords` scores on.
 *
 * This answers a question the ranking cannot. A chord can be a good match without being the best
 * one: a major triad whose third is quiet — a muted B string, a thumb not quite clearing the fret
 * — fits the power chord's two-note template more closely than its own three-note one, because
 * the template that beats it is the one not asking for the note that went missing. Anything that
 * knows which chord it wants should ask about that chord rather than read the top of a list.
 */
export function scoreChord(chroma: Float32Array, root: number, quality: ChordQuality): number {
    let chromaMagnitude = magnitudeOf(chroma);
    if (chromaMagnitude === 0) return 0;

    let template = templateFor(root, quality);
    return similarity(chroma, chromaMagnitude, template, magnitudeOf(template));
}

/** Every chord scored against the chroma, best first. */
export function matchChords(chroma: Float32Array, options: MatchOptions = {}): ChordMatch[] {
    let chromaMagnitude = magnitudeOf(chroma);
    if (chromaMagnitude === 0) return [];

    let ranked = CANDIDATES.map((candidate) => {
        let score = similarity(chroma, chromaMagnitude, candidate.template, candidate.magnitude);
        let rootedInTheBass = options.bass != null && options.bass === candidate.root;

        return {
            rank: rootedInTheBass ? score + BASS_BONUS : score,
            match: {
                root: candidate.root,
                quality: candidate.quality,
                name: chordName(candidate.root, candidate.quality),
                score,
            },
        };
    });

    return ranked.sort((a, b) => b.rank - a.rank).map((entry) => entry.match);
}

export function detectChord(chroma: Float32Array, options: MatchOptions = {}): ChordMatch | null {
    let best = matchChords(chroma, options)[0];
    if (!best) return null;

    return best.score >= (options.threshold ?? DEFAULT_THRESHOLD) ? best : null;
}
