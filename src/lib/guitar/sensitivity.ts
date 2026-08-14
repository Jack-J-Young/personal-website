/**
 * The range the sensitivity slider spans, as the loudness an attack has to reach.
 *
 * How loud a strum arrives depends on the guitar, the room, and how far away the microphone is —
 * a laptop lid two feet from an acoustic and a phone resting on the soundboard differ by more
 * than an order of magnitude — so there is no one value that works everywhere.
 */
export const QUIETEST_ATTACK = 0.002;
export const LOUDEST_ATTACK = 0.06;

export const DEFAULT_SENSITIVITY = 0.32;

/**
 * The loudness a strum has to reach, for a slider position where 0 is the least sensitive.
 *
 * Geometric, so that equal movements of the slider are equal steps in loudness rather than equal
 * steps in amplitude. A linear scale would spend most of its travel in a range no microphone
 * reports and then cross everything useful in the last few pixels.
 */
export function attackLevelFor(sensitivity: number): number {
    return LOUDEST_ATTACK * (QUIETEST_ATTACK / LOUDEST_ATTACK) ** sensitivity;
}

/**
 * The loudness a whole analysis window has to hold before a chord found in it means anything.
 *
 * Derived from the attack level rather than exposed separately, because the two are the same
 * judgement about how loud this setup is asked at two different moments, and a tool with two
 * loudness sliders would be asking the user to reconcile them.
 */
export function windowLevelFor(sensitivity: number): number {
    return attackLevelFor(sensitivity) * 0.75;
}
