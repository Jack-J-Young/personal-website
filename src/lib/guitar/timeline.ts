/** One loudness reading, kept so the recent past can be drawn rather than only the present. */
export interface LevelSample {
    time: number;
    level: number;
}

/** A strum found by the onset detector, labelled once the chord it started has been identified. */
export interface TimelineMark {
    time: number;
    label: string | null;
}

/**
 * Drops whatever has scrolled off the far end of the timeline.
 *
 * Takes items in ascending time order and returns the same array untouched when nothing has
 * expired, so the common case of a frame that drops nothing costs a comparison.
 */
export function withinSpan<T extends { time: number }>(
    items: T[],
    now: number,
    spanMs: number,
): T[] {
    let oldest = now - spanMs;
    let first = items.findIndex((item) => item.time >= oldest);

    if (first === -1) return [];
    return first === 0 ? items : items.slice(first);
}
