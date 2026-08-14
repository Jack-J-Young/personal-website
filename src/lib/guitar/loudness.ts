/**
 * RMS mapped to the 0–1 a meter or a waveform should draw.
 *
 * Loudness is perceived closer to the square root of amplitude, and a linear scale barely moves
 * for anything short of a hard strum. The doubling puts a comfortable playing level near the top
 * of the scale rather than in the bottom fifth of it.
 */
export function perceivedLevel(rms: number): number {
    return Math.min(1, Math.sqrt(rms) * 2);
}
