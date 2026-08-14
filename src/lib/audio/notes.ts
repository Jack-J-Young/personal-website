export const A4_FREQUENCY = 440;
export const A4_MIDI = 69;

export const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export const SEMITONES_PER_OCTAVE = 12;
export const CENTS_PER_SEMITONE = 100;

export interface Note {
    /** The nearest semitone, as a MIDI number. */
    midi: number;
    name: string;
    octave: number;
    /** How far the measured frequency sits from that semitone, in the range [-50, 50). */
    cents: number;
    frequency: number;
}

export interface GuitarString {
    /** 1 is the thinnest string, 6 the thickest — the way string numbers are written on tab. */
    number: number;
    name: string;
    midi: number;
    frequency: number;
}

/**
 * MIDI numbers are a continuous scale here, not integers: the fractional part is how sharp or
 * flat the frequency is, which is the whole quantity a tuner cares about.
 */
export function frequencyToMidi(frequency: number): number {
    return A4_MIDI + SEMITONES_PER_OCTAVE * Math.log2(frequency / A4_FREQUENCY);
}

export function midiToFrequency(midi: number): number {
    return A4_FREQUENCY * 2 ** ((midi - A4_MIDI) / SEMITONES_PER_OCTAVE);
}

export function midiToName(midi: number): string {
    return NOTE_NAMES[pitchClassOf(midi)];
}

/** C-1 is MIDI 0, so C4 — middle C — is 60 and the octave number changes at C, not at A. */
export function midiToOctave(midi: number): number {
    return Math.floor(midi / SEMITONES_PER_OCTAVE) - 1;
}

/** Which of the twelve notes this is, ignoring the octave. 0 is C. */
export function pitchClassOf(midi: number): number {
    let wrapped = Math.round(midi) % SEMITONES_PER_OCTAVE;
    return wrapped < 0 ? wrapped + SEMITONES_PER_OCTAVE : wrapped;
}

export function centsBetween(frequency: number, reference: number): number {
    return CENTS_PER_SEMITONE * SEMITONES_PER_OCTAVE * Math.log2(frequency / reference);
}

export function noteFromFrequency(frequency: number): Note {
    let exact = frequencyToMidi(frequency);
    let midi = Math.round(exact);

    return {
        midi,
        name: midiToName(midi),
        octave: midiToOctave(midi),
        cents: (exact - midi) * CENTS_PER_SEMITONE,
        frequency,
    };
}

function stringAt(number: number, midi: number): GuitarString {
    return { number, name: midiToName(midi), midi, frequency: midiToFrequency(midi) };
}

/** Thickest string first, so the array reads in the order the strings sit under your hand. */
export const STANDARD_TUNING: GuitarString[] = [
    stringAt(6, 40),
    stringAt(5, 45),
    stringAt(4, 50),
    stringAt(3, 55),
    stringAt(2, 59),
    stringAt(1, 64),
];

/**
 * The string a measured frequency is most likely meant to be.
 *
 * Compared in cents rather than hertz: the strings are spaced evenly in pitch but not in
 * frequency, so a hertz comparison would bias every reading towards the low E.
 */
export function nearestString(
    frequency: number,
    tuning: GuitarString[] = STANDARD_TUNING,
): GuitarString {
    let best = tuning[0];
    for (let string of tuning) {
        if (Math.abs(centsBetween(frequency, string.frequency))
            < Math.abs(centsBetween(frequency, best.frequency))) best = string;
    }
    return best;
}
