import { describe, expect, it } from "vitest";

import { getPixel, imageFromPixels } from "./image";
import { rgbToHsv8 } from "./hsv";
import { applyDarkMode, applyTransparency } from "./passes";

describe("applyTransparency", () => {
    it("clears white and keeps ink opaque", () => {
        let output = applyTransparency(imageFromPixels(2, 1, [[255, 255, 255, 255], [0, 0, 0, 255]]));

        expect(getPixel(output, 0, 0)[3]).toBe(0);
        expect(getPixel(output, 1, 0)[3]).toBe(255);
    });

    it("clips the denser half of the range to fully opaque", () => {
        // Peak density is 255, so the scale is 2 and anything at half density or darker saturates.
        let output = applyTransparency(imageFromPixels(3, 1, [[0, 0, 0, 255], [128, 128, 128, 255], [200, 200, 200, 255]]));

        expect(getPixel(output, 1, 0)[3]).toBe(254);
        expect(getPixel(output, 2, 0)[3]).toBe(110);
    });

    it("snaps near-transparent pixels to clear", () => {
        // Density 238 gives alpha 17, doubled to 34, which is under the floor.
        let output = applyTransparency(imageFromPixels(2, 1, [[0, 0, 0, 255], [238, 238, 238, 255]]));

        expect(getPixel(output, 1, 0)[3]).toBe(0);
    });

    it("takes density from the darkest channel, whichever one it is", () => {
        let pixels = [[100, 255, 255, 255], [255, 100, 255, 255], [255, 255, 180, 255]];
        let output = applyTransparency(imageFromPixels(3, 1, pixels));

        expect(getPixel(output, 0, 0)[3]).toBe(getPixel(output, 1, 0)[3]);
        expect(getPixel(output, 0, 0)[3]).toBeGreaterThan(getPixel(output, 2, 0)[3]);
    });

    it("leaves an all-white image fully clear", () => {
        let output = applyTransparency(imageFromPixels(2, 1, [[255, 255, 255, 255], [250, 250, 250, 255]]));

        expect(getPixel(output, 0, 0)[3]).toBe(0);
        expect(getPixel(output, 1, 0)[3]).toBe(0);
    });
});

describe("applyDarkMode", () => {
    it("swaps black and white", () => {
        let output = applyDarkMode(imageFromPixels(2, 1, [[255, 255, 255, 255], [0, 0, 0, 255]]));

        expect(getPixel(output, 0, 0)).toEqual([0, 0, 0, 255]);
        expect(getPixel(output, 1, 0)).toEqual([255, 255, 255, 255]);
    });

    it("keeps hue so ink colours survive the inversion", () => {
        let pixels = [[255, 0, 0, 255], [0, 200, 0, 255], [40, 40, 220, 255]];
        let output = applyDarkMode(imageFromPixels(3, 1, pixels));

        for (let x = 0; x < 3; x++) {
            let before = rgbToHsv8(pixels[x][0], pixels[x][1], pixels[x][2])[0];
            let [r, g, b] = getPixel(output, x, 0);

            expect(Math.abs(rgbToHsv8(r, g, b)[0] - before)).toBeLessThanOrEqual(1);
        }
    });

    it("darkens a light image", () => {
        let pixels = [[240, 230, 230, 255], [255, 255, 255, 255]];
        let output = applyDarkMode(imageFromPixels(2, 1, pixels));

        for (let x = 0; x < 2; x++) {
            let [r, g, b] = getPixel(output, x, 0);
            expect(Math.max(r, g, b)).toBeLessThan(40);
        }
    });

    it("preserves alpha", () => {
        let output = applyDarkMode(imageFromPixels(2, 1, [[255, 255, 255, 128], [0, 0, 0, 0]]));

        expect(getPixel(output, 0, 0)[3]).toBe(128);
        expect(getPixel(output, 1, 0)[3]).toBe(0);
    });
});
