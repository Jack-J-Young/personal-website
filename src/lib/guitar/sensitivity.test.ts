import { describe, expect, it } from "vitest";

import {
    LOUDEST_ATTACK,
    QUIETEST_ATTACK,
    attackLevelFor,
    windowLevelFor,
} from "./sensitivity";

describe("attackLevelFor", () => {
    it("spans the whole range end to end", () => {
        expect(attackLevelFor(0)).toBeCloseTo(LOUDEST_ATTACK, 10);
        expect(attackLevelFor(1)).toBeCloseTo(QUIETEST_ATTACK, 10);
    });

    it("gets more sensitive as the slider goes up", () => {
        let levels = [0, 0.25, 0.5, 0.75, 1].map(attackLevelFor);

        for (let i = 1; i < levels.length; i++) expect(levels[i]).toBeLessThan(levels[i - 1]);
    });

    it("takes the same proportion off for every equal step", () => {
        // What makes the slider usable: halfway along is the geometric mean of the two ends, not
        // the arithmetic one, so the bottom half of the travel is not wasted.
        let ratio = attackLevelFor(0.25) / attackLevelFor(0.5);

        expect(attackLevelFor(0.5) / attackLevelFor(0.75)).toBeCloseTo(ratio, 10);
        expect(attackLevelFor(0.5)).toBeCloseTo(Math.sqrt(QUIETEST_ATTACK * LOUDEST_ATTACK), 10);
    });
});

describe("windowLevelFor", () => {
    it("sits below the attack it follows, since a chord decays from the moment it is struck", () => {
        for (let sensitivity of [0, 0.32, 0.5, 1]) {
            expect(windowLevelFor(sensitivity)).toBeLessThan(attackLevelFor(sensitivity));
        }
    });

    it("moves with the one control that sets both", () => {
        expect(windowLevelFor(1)).toBeLessThan(windowLevelFor(0));
    });
});
