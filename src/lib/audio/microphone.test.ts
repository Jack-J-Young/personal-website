import { describe, expect, it } from "vitest";

import { MicrophoneUnavailable, describeMicrophoneError, windowSizeFor } from "./microphone";

describe("windowSizeFor", () => {
    it("covers at least the span asked for", () => {
        expect(windowSizeFor(44100, { minWindowSeconds: 0.09 })).toBe(4096);
        expect(4096 / 44100).toBeGreaterThan(0.09);
    });

    it("resolves at least as finely as asked for", () => {
        let size = windowSizeFor(44100, { maxBinWidth: 3 });

        expect(size).toBe(16384);
        expect(44100 / size).toBeLessThan(3);
    });

    it("asks for a longer window at a higher sample rate, keeping the resolution", () => {
        // The same requirement in hertz needs twice the samples at twice the rate. A fixed window
        // would silently halve the frequency detail instead.
        expect(windowSizeFor(96000, { maxBinWidth: 3 })).toBe(32768);
        expect(96000 / 32768).toBeLessThan(3);
    });

    it("satisfies whichever requirement is the harder one", () => {
        expect(windowSizeFor(44100, { minWindowSeconds: 0.09, maxBinWidth: 3 })).toBe(16384);
        expect(windowSizeFor(44100, { minWindowSeconds: 1, maxBinWidth: 3 })).toBe(32768);
    });

    it("always returns a power of two an AnalyserNode accepts", () => {
        for (let rate of [8000, 22050, 44100, 48000, 96000, 192000]) {
            for (let binWidth of [0.5, 1, 3, 10, 100]) {
                let size = windowSizeFor(rate, { maxBinWidth: binWidth });

                expect(Number.isInteger(Math.log2(size))).toBe(true);
                expect(size).toBeGreaterThanOrEqual(32);
                expect(size).toBeLessThanOrEqual(32768);
            }
        }
    });

    it("gives back a usable window when asked for nothing", () => {
        expect(windowSizeFor(44100, {})).toBe(32);
    });
});

describe("describeMicrophoneError", () => {
    it("explains a refused permission in terms of what to do about it", () => {
        let denied = new Error("Permission denied");
        denied.name = "NotAllowedError";

        expect(describeMicrophoneError(denied)).toContain("site settings");
    });

    it("distinguishes no microphone from a busy one", () => {
        let missing = new Error("");
        missing.name = "NotFoundError";

        let busy = new Error("");
        busy.name = "NotReadableError";

        expect(describeMicrophoneError(missing)).not.toBe(describeMicrophoneError(busy));
    });

    it("falls back rather than throwing on something that isn't an Error", () => {
        expect(describeMicrophoneError("nope")).toBe("The microphone could not be opened.");
    });

    it("passes through a refusal this module worked out for itself", () => {
        // A plain Error has the name "Error" and so falls to the generic wording, which used to
        // swallow the one message that says what to actually do about it.
        let insecure = new MicrophoneUnavailable("A microphone is only offered to pages over HTTPS");

        expect(describeMicrophoneError(insecure)).toBe(insecure.message);
    });
});
