import { describe, expect, it } from "vitest";

import { getPixel, imageFromPixels } from "./image";
import { boostSaturation, flattenAgainstBackground, stretchContrast } from "./tone";

function grey(values: number[]): number[][] {
    return values.map((v) => [v, v, v, 255]);
}

describe("flattenAgainstBackground", () => {
    it("lifts each pixel by its background's complement", () => {
        let image = imageFromPixels(2, 1, grey([100, 100]));
        let background = imageFromPixels(2, 1, grey([200, 150]));

        expect(getPixel(flattenAgainstBackground(image, background), 0, 0)[0]).toBe(155);
        expect(getPixel(flattenAgainstBackground(image, background), 1, 0)[0]).toBe(205);
    });

    it("clamps rather than wrapping", () => {
        let image = imageFromPixels(1, 1, grey([250]));
        let background = imageFromPixels(1, 1, grey([100]));

        expect(getPixel(flattenAgainstBackground(image, background), 0, 0)[0]).toBe(255);
    });

    it("turns a pixel matching its background white", () => {
        let image = imageFromPixels(1, 1, grey([137]));
        let background = imageFromPixels(1, 1, grey([137]));

        expect(getPixel(flattenAgainstBackground(image, background), 0, 0)[0]).toBe(255);
    });

    it("rejects a mismatched background", () => {
        let image = imageFromPixels(2, 1, grey([0, 0]));
        let background = imageFromPixels(1, 1, grey([0]));

        expect(() => flattenAgainstBackground(image, background)).toThrow(/match the image size/);
    });
});

describe("stretchContrast", () => {
    it("maps the extremes onto full range", () => {
        let output = stretchContrast(imageFromPixels(3, 1, grey([100, 150, 200])));

        expect(getPixel(output, 0, 0)[0]).toBe(0);
        expect(getPixel(output, 1, 0)[0]).toBe(127);
        expect(getPixel(output, 2, 0)[0]).toBe(255);
    });

    it("takes one range across all three channels", () => {
        // Red spans 0-255 on its own, but blue's 60 is the darkest sample anywhere, so it is
        // blue that defines the low end for every channel.
        let output = stretchContrast(imageFromPixels(2, 1, [[200, 200, 60, 255], [255, 255, 255, 255]]));

        expect(getPixel(output, 0, 0)).toEqual([183, 183, 0, 255]);
        expect(getPixel(output, 1, 0)).toEqual([255, 255, 255, 255]);
    });

    it("leaves a flat image alone", () => {
        let output = stretchContrast(imageFromPixels(2, 1, grey([90, 90])));

        expect(getPixel(output, 0, 0)[0]).toBe(90);
    });

    it("does not touch alpha", () => {
        let output = stretchContrast(imageFromPixels(2, 1, [[10, 10, 10, 40], [200, 200, 200, 90]]));

        expect(getPixel(output, 0, 0)[3]).toBe(40);
        expect(getPixel(output, 1, 0)[3]).toBe(90);
    });
});

describe("boostSaturation", () => {
    it("leaves greys untouched", () => {
        let output = boostSaturation(imageFromPixels(2, 1, grey([40, 200])));

        expect(getPixel(output, 0, 0)).toEqual([40, 40, 40, 255]);
        expect(getPixel(output, 1, 0)).toEqual([200, 200, 200, 255]);
    });

    it("pushes the most saturated pixel to full saturation", () => {
        let output = boostSaturation(imageFromPixels(2, 1, [[255, 128, 128, 255], [255, 255, 255, 255]]));

        expect(getPixel(output, 0, 0)).toEqual([255, 0, 0, 255]);
        expect(getPixel(output, 1, 0)).toEqual([255, 255, 255, 255]);
    });

    it("preserves the brightest channel of every pixel", () => {
        let pixels = [[200, 120, 40, 255], [17, 200, 190, 255], [90, 30, 160, 255]];
        let output = boostSaturation(imageFromPixels(3, 1, pixels));

        for (let x = 0; x < 3; x++) {
            let [r, g, b] = getPixel(output, x, 0);
            expect(Math.max(r, g, b)).toBe(Math.max(...pixels[x].slice(0, 3)));
        }
    });
});
