import { describe, expect, it } from "vitest";

import { OnsetDetector } from "./onset";

const FRAME_MS = 1000 / 60;

/** The quiet a microphone reports in a still room, which is never actually zero. */
const ROOM_NOISE = 0.003;

/**
 * Short-window RMS of a plucked string, `sinceMs` after it was struck: a fast rise into an
 * exponential decay. Silent before the strike.
 */
function pluck(peak: number, sinceMs: number, halfLifeMs = 800): number {
    if (sinceMs < 0) return 0;

    let attack = Math.min(1, sinceMs / 20);
    return peak * attack * 0.5 ** (sinceMs / halfLifeMs);
}

/** Feeds a level function frame by frame and returns the timestamps of the onsets found. */
function playThrough(
    detector: OnsetDetector,
    durationMs: number,
    level: (time: number) => number,
): number[] {
    let onsets: number[] = [];

    for (let time = 0; time <= durationMs; time += FRAME_MS) {
        if (detector.offer(level(time), time)) onsets.push(time);
    }

    return onsets;
}

describe("OnsetDetector", () => {
    it("catches a pluck within a frame or two of the strike", () => {
        let onsets = playThrough(new OnsetDetector(), 2000, (time) =>
            Math.max(ROOM_NOISE, pluck(0.3, time - 500)));

        expect(onsets).toHaveLength(1);
        expect(onsets[0]).toBeGreaterThanOrEqual(500);
        expect(onsets[0]).toBeLessThan(560);
    });

    it("counts a strum once, not once per string", () => {
        // Six strings entering 18ms apart, which is a brisk downstroke.
        let onsets = playThrough(new OnsetDetector(), 2000, (time) => {
            let total = 0;
            for (let string = 0; string < 6; string++) total += pluck(0.05, time - 500 - string * 18);
            return Math.max(ROOM_NOISE, total);
        });

        expect(onsets).toHaveLength(1);
    });

    it("says nothing further while a note rings and decays", () => {
        let onsets = playThrough(new OnsetDetector(), 4000, (time) =>
            Math.max(ROOM_NOISE, pluck(0.3, time - 100)));

        expect(onsets).toHaveLength(1);
        expect(onsets[0]).toBeLessThan(200);
    });

    it("catches a second strum over the first still ringing", () => {
        // The point of comparing against the recent past rather than a threshold: at 1500ms the
        // first chord is still louder than the room, and the second strum is what stands out.
        let onsets = playThrough(new OnsetDetector(), 3000, (time) =>
            Math.max(ROOM_NOISE, pluck(0.3, time - 400), pluck(0.25, time - 1900)));

        expect(onsets).toHaveLength(2);
        expect(onsets[1] - onsets[0]).toBeGreaterThan(1400);
        expect(onsets[1] - onsets[0]).toBeLessThan(1600);
    });

    it("ignores noise however sharply it rises", () => {
        // A tenfold rise, and still nothing anyone played.
        let onsets = playThrough(new OnsetDetector(), 3000, (time) =>
            time > 1000 && time < 1200 ? 0.01 : 0.001);

        expect(onsets).toEqual([]);
    });

    it("waits for enough history before it will call anything an onset", () => {
        let detector = new OnsetDetector();

        expect(detector.offer(0.5, 0)).toBe(false);
    });

    it("holds off a second onset until the refractory period has passed", () => {
        let detector = new OnsetDetector({ refractoryMs: 400 });
        let onsets = playThrough(detector, 2000, (time) =>
            Math.max(ROOM_NOISE, pluck(0.3, time - 500), pluck(0.3, time - 700)));

        expect(onsets).toHaveLength(1);
    });

    it("takes a lower rise ratio when asked, for playing over a ringing chord", () => {
        // A gentle strum over a chord still sounding is a modest rise, not a jump out of silence.
        let gentle = (time: number) => (time >= 1000 ? 0.16 : 0.1);

        expect(playThrough(new OnsetDetector({ riseRatio: 1.8 }), 2000, gentle)).toEqual([]);
        expect(playThrough(new OnsetDetector({ riseRatio: 1.5 }), 2000, gentle)).toHaveLength(1);
    });

    it("takes a new floor while running", () => {
        let detector = new OnsetDetector({ floor: 0.2 });
        let level = (time: number) =>
            Math.max(ROOM_NOISE, pluck(0.05, time - 500), pluck(0.05, time - 2500));

        let onsets: number[] = [];
        for (let time = 0; time <= 3000; time += FRAME_MS) {
            if (time >= 1500) detector.floor = 0.01;
            if (detector.offer(level(time), time)) onsets.push(time);
        }

        // Two identical plucks. The first was below the floor at the time; the second was not.
        expect(onsets).toHaveLength(1);
        expect(onsets[0]).toBeGreaterThan(2500);
    });

    it("forgets its history when cleared", () => {
        let detector = new OnsetDetector();
        playThrough(detector, 1000, () => ROOM_NOISE);
        detector.clear();

        expect(detector.offer(0.5, 1000)).toBe(false);
    });
});
