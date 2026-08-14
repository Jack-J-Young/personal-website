export type { GuitarString, Note } from "./notes";
export {
    NOTE_NAMES,
    STANDARD_TUNING,
    centsBetween,
    midiToFrequency,
    nearestString,
    noteFromFrequency,
} from "./notes";

export {
    CHROMA_BINS,
    bassPitchClass,
    chromaFromSpectrum,
    foldToChroma,
    noteEnergies,
    suppressHarmonics,
} from "./chroma";

export { StableChoice, SustainedValue } from "./stability";

export type { OnsetOptions } from "./onset";
export { OnsetDetector } from "./onset";

export type { ChordMatch, ChordQuality } from "./chords";
export {
    CHORD_QUALITIES,
    chordName,
    detectChord,
    matchChords,
    qualityBySymbol,
    scoreChord,
} from "./chords";

export type { PitchReading } from "./pitch";
export { PitchHistory, detectPitch } from "./pitch";

export type { AudioCapture, CaptureOptions } from "./microphone";
export { MicrophoneUnavailable, describeMicrophoneError, startCapture } from "./microphone";
