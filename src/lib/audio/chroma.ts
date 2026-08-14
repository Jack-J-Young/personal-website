import { SEMITONES_PER_OCTAVE, midiToFrequency, pitchClassOf } from "./notes";

/**
 * The range the note energies are measured over: the guitar's open low E up to two octaves above
 * its top open string. Below that is body thump and mains hum; above it, string harmonics
 * dominate over anything actually fretted.
 */
export const MIN_MIDI = 40;
export const MAX_MIDI = 88;

export const CHROMA_BINS = 12;

/**
 * Where a note's harmonics land, in semitones above it, and how much of its energy to expect
 * there.
 *
 * The offsets are `12·log2(n)` for the nth harmonic, rounded — the harmonic series does not line
 * up with equal temperament, so several of these are a good fraction of a semitone out and the
 * rounding is why suppression can never be exact.
 *
 * The series has to run well past the fifth harmonic. Stopping there leaves the 7th, 9th and 11th
 * to pile up on pitch classes unrelated to the note that produced them, which is exactly how a
 * plain D major comes to look like a Dmaj7.
 *
 * The weights are empirical. A plucked string's overtones fall away roughly as 1/n, but the first
 * two are deliberately set *above* that: an octave or a fifth that is really an overtone is the
 * most damaging kind of false note, and over-subtracting them costs less than leaving them.
 */
const HARMONIC_OFFSETS = [12, 19, 24, 28, 31, 34, 36, 38, 40, 42, 43];
const HARMONIC_WEIGHTS = [0.55, 0.4, 0.28, 0.18, 0.14, 0.12, 0.1, 0.09, 0.08, 0.07, 0.06];

/** Half a semitone, as a frequency ratio: the edge of the band belonging to one note. */
const SEMITONE_EDGE = 2 ** (0.5 / SEMITONES_PER_OCTAVE);

export interface ChromaOptions {
    /**
     * Whether to subtract each note's expected harmonics from the notes above it. On by default;
     * without it a single strummed E reads as an E chord stacked with its own overtones.
     */
    suppressHarmonics?: boolean;
}

/**
 * The energy of every note in range, read out of a linear magnitude spectrum.
 *
 * Indexed from `MIN_MIDI`, so entry `i` is MIDI note `MIN_MIDI + i`.
 *
 * Each note takes the strongest bin within half a semitone of its centre rather than the sum
 * across that band. A sum would make low notes look quiet and high notes loud, because the band
 * is a fixed *ratio* of the frequency and so covers steadily more bins as it rises.
 */
export function noteEnergies(spectrum: Float32Array, sampleRate: number): Float32Array {
    let binWidth = sampleRate / (2 * spectrum.length);
    let energies = new Float32Array(MAX_MIDI - MIN_MIDI + 1);

    for (let midi = MIN_MIDI; midi <= MAX_MIDI; midi++) {
        let centre = midiToFrequency(midi);
        let lowest = Math.max(0, Math.round((centre / SEMITONE_EDGE) / binWidth));
        let highest = Math.min(spectrum.length - 1, Math.round((centre * SEMITONE_EDGE) / binWidth));

        let peak = 0;
        for (let bin = lowest; bin <= highest; bin++) peak = Math.max(peak, spectrum[bin]);

        energies[midi - MIN_MIDI] = peak;
    }

    return energies;
}

/**
 * Removes the overtones a note leaves further up the spectrum, so that only notes actually being
 * played keep their energy.
 *
 * Works upwards, because by the time a note is reached everything below it that could have
 * contributed to it has already been accounted for. The offsets are the harmonic series rounded
 * to semitones — the third harmonic is 19.02 semitones up, the fifth 27.86 — and the rounding is
 * why this cannot be exact.
 */
export function suppressHarmonics(energies: Float32Array): Float32Array {
    let cleaned = Float32Array.from(energies);

    for (let i = 0; i < cleaned.length; i++) {
        let fundamental = cleaned[i];
        if (fundamental <= 0) continue;

        for (let h = 0; h < HARMONIC_OFFSETS.length; h++) {
            let target = i + HARMONIC_OFFSETS[h];
            if (target >= cleaned.length) break;

            cleaned[target] = Math.max(0, cleaned[target] - fundamental * HARMONIC_WEIGHTS[h]);
        }
    }

    return cleaned;
}

/**
 * Collapses note energies onto the twelve pitch classes, scaled so the loudest reads 1.
 *
 * Scaling to the peak rather than to the total is what makes the result comparable between a
 * quiet single note and a hard strum — chord matching cares about the shape of the vector, not
 * how loud the guitar was.
 */
export function foldToChroma(energies: Float32Array): Float32Array {
    let chroma = new Float32Array(CHROMA_BINS);

    for (let i = 0; i < energies.length; i++) {
        chroma[pitchClassOf(MIN_MIDI + i)] += energies[i];
    }

    let loudest = 0;
    for (let value of chroma) loudest = Math.max(loudest, value);
    if (loudest > 0) {
        for (let i = 0; i < chroma.length; i++) chroma[i] /= loudest;
    }

    return chroma;
}

export function chromaFromSpectrum(
    spectrum: Float32Array,
    sampleRate: number,
    options: ChromaOptions = {},
): Float32Array {
    let energies = noteEnergies(spectrum, sampleRate);
    if (options.suppressHarmonics ?? true) energies = suppressHarmonics(energies);

    return foldToChroma(energies);
}

/**
 * The lowest note carrying real energy, as a pitch class, or `null` if nothing stands out.
 *
 * Chord matching uses this to break ties: C major and A minor share two of their three notes, and
 * which one is playing is mostly a question of what the bass string is doing.
 */
export function bassPitchClass(energies: Float32Array, threshold = 0.2): number | null {
    let loudest = 0;
    for (let value of energies) loudest = Math.max(loudest, value);
    if (loudest <= 0) return null;

    for (let i = 0; i < energies.length; i++) {
        if (energies[i] >= loudest * threshold) return pitchClassOf(MIN_MIDI + i);
    }

    return null;
}
