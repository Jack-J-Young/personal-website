import { describe, expect, it } from "vitest";

import { imageFromPixels } from "./image";
import { resize, resizeToTargetPixels } from "./resample";

function redChannel(image: { data: Uint8ClampedArray }): number[] {
    let values: number[] = [];
    for (let i = 0; i < image.data.length; i += 4) values.push(image.data[i]);
    return values;
}

function grey(values: number[]): number[][] {
    return values.map((v) => [v, v, v, 255]);
}

describe("resize", () => {
    it("samples at half-pixel centres when upscaling", () => {
        let image = imageFromPixels(2, 1, grey([0, 100]));

        // Centres land at -0.25, 0.25, 0.75 and 1.25 in source pixels; the outer two clamp.
        expect(redChannel(resize(image, 4, 1))).toEqual([0, 25, 75, 100]);
    });

    it("averages pixel pairs when halving", () => {
        let image = imageFromPixels(4, 1, grey([0, 100, 40, 80]));

        expect(redChannel(resize(image, 2, 1))).toEqual([50, 60]);
    });

    it("returns an equal copy at the same size", () => {
        let image = imageFromPixels(2, 2, grey([1, 2, 3, 4]));
        let output = resize(image, 2, 2);

        expect(output.data).toEqual(image.data);
        expect(output.data).not.toBe(image.data);
    });

    it("preserves a uniform image exactly", () => {
        let image = imageFromPixels(4, 4, grey(Array(16).fill(37)));

        expect(redChannel(resize(image, 9, 7))).toEqual(Array(63).fill(37));
    });
});

describe("resizeToTargetPixels", () => {
    it("lands near the target while keeping the aspect ratio", () => {
        let image = imageFromPixels(4, 2, grey([0, 0, 0, 0, 0, 0, 0, 0]));
        let output = resizeToTargetPixels(image, 800);

        expect(output.width / output.height).toBeCloseTo(2, 1);
        expect(output.width * output.height).toBeGreaterThan(700);
        expect(output.width * output.height).toBeLessThan(900);
    });

    it("never produces a zero dimension", () => {
        let image = imageFromPixels(4, 2, grey(Array(8).fill(0)));
        let output = resizeToTargetPixels(image, 1);

        expect(output.width).toBeGreaterThanOrEqual(1);
        expect(output.height).toBeGreaterThanOrEqual(1);
    });
});
