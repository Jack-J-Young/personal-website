import { describe, expect, it } from "vitest";

import { formatDate } from "./dates";

describe("formatDate", () => {
    it("spells the month out", () => {
        expect(formatDate("2026-03-02")).toBe("2 March 2026");
    });

    it("keeps the day the note was dated", () => {
        // Parsed as UTC and formatted as UTC. Either half done in local time moves a new year's
        // day note into the previous year for half the world.
        expect(formatDate("2026-01-01")).toBe("1 January 2026");
        expect(formatDate("2026-12-31")).toBe("31 December 2026");
    });

    it("passes a missing date through", () => {
        expect(formatDate(null)).toBeNull();
    });

    it("returns null rather than 'Invalid Date' for nonsense", () => {
        expect(formatDate("not a date")).toBeNull();
    });
});
