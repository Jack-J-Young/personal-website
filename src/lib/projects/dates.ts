/**
 * A `yyyy-mm-dd` from the bundle as "2 March 2026", or null if there was no date.
 *
 * Fixed to en-GB and UTC rather than the reader's locale, because the date on a note is the day
 * it was written and not an instant: rendering it in the reader's zone moves it a day for anyone
 * far enough east or west, and prerendering would bake in the build machine's answer anyway.
 */
export function formatDate(iso: string | null): string | null {
    if (iso === null) return null;

    let parsed = new Date(`${iso}T00:00:00Z`);
    if (Number.isNaN(parsed.getTime())) return null;

    return new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
    }).format(parsed);
}
