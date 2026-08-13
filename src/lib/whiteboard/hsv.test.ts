import { describe, expect, it } from "vitest";

import { HUE_RANGE, hsv8ToRgb, rgbToHsv8 } from "./hsv";

describe("rgbToHsv8", () => {
    it("puts hue on OpenCV's 0-179 scale", () => {
        expect(rgbToHsv8(255, 0, 0)).toEqual([0, 255, 255]);
        expect(rgbToHsv8(0, 255, 0)).toEqual([60, 255, 255]);
        expect(rgbToHsv8(0, 0, 255)).toEqual([120, 255, 255]);
    });

    it("reports no saturation for greys", () => {
        expect(rgbToHsv8(80, 80, 80)).toEqual([0, 0, 80]);
        expect(rgbToHsv8(0, 0, 0)).toEqual([0, 0, 0]);
    });

    it("takes value from the brightest channel", () => {
        expect(rgbToHsv8(10, 200, 40)[2]).toBe(200);
    });
});

describe("hsv8ToRgb", () => {
    it("inverts the primaries", () => {
        expect(hsv8ToRgb(0, 255, 255)).toEqual([255, 0, 0]);
        expect(hsv8ToRgb(60, 255, 255)).toEqual([0, 255, 0]);
        expect(hsv8ToRgb(120, 255, 255)).toEqual([0, 0, 255]);
    });

    it("round-trips saturated colours within a quantisation step", () => {
        let colours = [
            [255, 0, 0],
            [0, 255, 0],
            [0, 0, 255],
            [200, 120, 40],
            [17, 200, 190],
            [90, 30, 160],
        ];

        for (let [r, g, b] of colours) {
            let [h, s, v] = rgbToHsv8(r, g, b);
            let [r2, g2, b2] = hsv8ToRgb(h, s, v);

            expect(Math.abs(r2 - r)).toBeLessThanOrEqual(2);
            expect(Math.abs(g2 - g)).toBeLessThanOrEqual(2);
            expect(Math.abs(b2 - b)).toBeLessThanOrEqual(2);
        }
    });

    it("treats hue as a full turn across the range", () => {
        expect(hsv8ToRgb(HUE_RANGE, 255, 255)).toEqual(hsv8ToRgb(0, 255, 255));
    });
});
