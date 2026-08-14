/**
 * Holds a value steady until a different one has been offered often enough to be believed.
 *
 * Frame-by-frame detection flickers: a chord in the middle of being strummed passes through
 * partial voicings, and a note decaying passes through silence. Showing every reading makes the
 * display unreadable, and — more importantly for measuring how long a change took — makes the
 * moment of the change impossible to pin down. Requiring a run of agreeing readings turns that
 * into a single crossing.
 *
 * The cost is honest and fixed: a real change is reported `confirmations` readings late.
 */
export class StableChoice<T> {
    private candidate: T | null = null;
    private streak = 0;
    private confirmed: T | null = null;
    private changed = false;

    constructor(private readonly confirmations = 4) {}

    /** The confirmed value after taking this reading into account. */
    offer(value: T | null): T | null {
        if (value === this.candidate) {
            this.streak++;
        } else {
            this.candidate = value;
            this.streak = 1;
        }

        this.changed = false;

        if (this.streak >= this.confirmations && this.confirmed !== value) {
            this.confirmed = value;
            this.changed = true;
        }

        return this.confirmed;
    }

    get current(): T | null {
        return this.confirmed;
    }

    /** True only on the reading that confirmed a change, which is the one worth timestamping. */
    get justChanged(): boolean {
        return this.changed;
    }

    clear(): void {
        this.candidate = null;
        this.streak = 0;
        this.confirmed = null;
        this.changed = false;
    }
}

/**
 * Reports a value only once it has been offered unbroken for long enough.
 *
 * The counted sibling above is the wrong tool when the requirement is a *duration*: readings
 * arrive on animation frames, so a fixed number of them is anywhere between a third of a second
 * and several seconds depending on the machine and what else is on screen.
 *
 * Time is passed in rather than read from a clock, so this stays pure and a test can step through
 * a second without waiting one.
 */
export class SustainedValue<T> {
    private value: T | null = null;
    private since = 0;

    constructor(private readonly durationMs: number) {}

    /** @param now any monotonic millisecond timestamp, such as `performance.now()`. */
    offer(value: T | null, now: number): T | null {
        if (value !== this.value) {
            this.value = value;
            this.since = now;
        }

        if (this.value === null) return null;

        return now - this.since >= this.durationMs ? this.value : null;
    }

    /**
     * How far through the hold, from 0 to 1. Worth showing: a requirement to hold still is
     * indistinguishable from a tool that has stopped working, unless the waiting is visible.
     */
    progress(now: number): number {
        if (this.value === null) return 0;

        return Math.min(1, (now - this.since) / this.durationMs);
    }

    clear(): void {
        this.value = null;
        this.since = 0;
    }
}
