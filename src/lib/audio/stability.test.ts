import { describe, expect, it } from "vitest";

import { StableChoice, SustainedValue } from "./stability";

describe("StableChoice", () => {
    it("says nothing until a value has been offered enough times", () => {
        let choice = new StableChoice<string>(3);

        expect(choice.offer("C")).toBeNull();
        expect(choice.offer("C")).toBeNull();
        expect(choice.offer("C")).toBe("C");
    });

    it("holds the old value through a brief wrong reading", () => {
        let choice = new StableChoice<string>(3);
        for (let i = 0; i < 3; i++) choice.offer("C");

        expect(choice.offer("G")).toBe("C");
        expect(choice.offer("C")).toBe("C");
        expect(choice.current).toBe("C");
    });

    it("restarts the count when the reading changes", () => {
        let choice = new StableChoice<string>(3);
        choice.offer("G");
        choice.offer("G");
        choice.offer("C");

        expect(choice.offer("G")).toBeNull();
    });

    it("flags exactly the reading that confirmed a change", () => {
        let choice = new StableChoice<string>(2);

        choice.offer("C");
        expect(choice.justChanged).toBe(false);

        choice.offer("C");
        expect(choice.justChanged).toBe(true);

        choice.offer("C");
        expect(choice.justChanged).toBe(false);
    });

    it("treats falling silent as a change like any other", () => {
        let choice = new StableChoice<string>(2);
        choice.offer("C");
        choice.offer("C");

        expect(choice.offer(null)).toBe("C");
        expect(choice.offer(null)).toBeNull();
        expect(choice.justChanged).toBe(true);
    });

    it("forgets everything when cleared", () => {
        let choice = new StableChoice<string>(2);
        choice.offer("C");
        choice.offer("C");
        choice.clear();

        expect(choice.current).toBeNull();
        expect(choice.offer("C")).toBeNull();
    });
});

describe("SustainedValue", () => {
    it("withholds the value until the full duration has passed", () => {
        let held = new SustainedValue<number>(1000);

        expect(held.offer(6, 0)).toBeNull();
        expect(held.offer(6, 999)).toBeNull();
        expect(held.offer(6, 1000)).toBe(6);
    });

    it("keeps reporting the value once it is held", () => {
        let held = new SustainedValue<number>(1000);
        held.offer(6, 0);

        expect(held.offer(6, 1500)).toBe(6);
        expect(held.offer(6, 9000)).toBe(6);
    });

    it("restarts the clock when the value changes", () => {
        let held = new SustainedValue<number>(1000);
        held.offer(6, 0);
        held.offer(5, 900);

        // The 900ms already spent belonged to the sixth string, not the fifth.
        expect(held.offer(5, 1000)).toBeNull();
        expect(held.offer(5, 1900)).toBe(5);
    });

    it("restarts the clock after any break, however brief", () => {
        // One dropped reading in the middle is exactly the misfire this exists to reject.
        let held = new SustainedValue<number>(1000);
        held.offer(6, 0);
        held.offer(null, 950);

        expect(held.offer(6, 960)).toBeNull();
        expect(held.offer(6, 1900)).toBeNull();
        expect(held.offer(6, 1960)).toBe(6);
    });

    it("never reports a value for a moment's misfire", () => {
        let held = new SustainedValue<number>(1000);

        for (let frame = 0; frame < 200; frame++) {
            // A steady 6 with a single stray 5 every tenth reading, 16ms apart.
            expect(held.offer(frame % 10 === 0 ? 5 : 6, frame * 16)).toBeNull();
        }
    });

    it("measures the hold in time, not in readings", () => {
        let slow = new SustainedValue<number>(1000);
        let fast = new SustainedValue<number>(1000);

        // Four readings on a struggling machine cover the same second as sixty on a healthy one.
        for (let i = 0; i < 4; i++) slow.offer(6, i * 250);
        for (let i = 0; i < 60; i++) fast.offer(6, i * (1000 / 60));

        expect(slow.offer(6, 1000)).toBe(6);
        expect(fast.offer(6, 1000)).toBe(6);
    });

    it("reports progress so the wait can be shown", () => {
        let held = new SustainedValue<number>(1000);
        held.offer(6, 0);

        expect(held.progress(0)).toBe(0);
        expect(held.progress(250)).toBeCloseTo(0.25, 10);
        expect(held.progress(1000)).toBe(1);
        expect(held.progress(5000)).toBe(1);
    });

    it("reports no progress when nothing is being held", () => {
        let held = new SustainedValue<number>(1000);

        expect(held.progress(500)).toBe(0);

        held.offer(6, 0);
        held.offer(null, 500);
        expect(held.progress(500)).toBe(0);
    });

    it("starts over when cleared", () => {
        let held = new SustainedValue<number>(1000);
        held.offer(6, 0);
        held.clear();

        expect(held.offer(6, 1000)).toBeNull();
        expect(held.offer(6, 2000)).toBe(6);
    });
});
