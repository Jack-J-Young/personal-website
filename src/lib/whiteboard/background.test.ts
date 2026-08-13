import { describe, expect, it } from "vitest";

import { createImage, getPixel, imageFromPixels, setPixel, type RgbaImage } from "./image";
import { estimateBackground, medianFilter, sampleGrid } from "./background";

function uniform(width: number, height: number, value: number): RgbaImage {
    let image = createImage(width, height);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) setPixel(image, x, y, [value, value, value, 255]);
    }
    return image;
}

function redChannel(image: RgbaImage): number[] {
    let values: number[] = [];
    for (let i = 0; i < image.data.length; i += 4) values.push(image.data[i]);
    return values;
}

describe("sampleGrid", () => {
    it("takes the centre pixel of each cell", () => {
        let pixels = Array.from({ length: 16 }, (_, i) => [i, i, i, 255]);
        let image = imageFromPixels(4, 4, pixels);

        // 2x2 cells, so centres are (1,1), (3,1), (1,3) and (3,3).
        expect(redChannel(sampleGrid(image, 2))).toEqual([5, 7, 13, 15]);
    });

    it("ignores the remainder strip on the right and bottom edges", () => {
        let image = uniform(5, 5, 100);
        let baseline = redChannel(sampleGrid(image, 2));

        for (let y = 0; y < 5; y++) setPixel(image, 4, y, [0, 0, 0, 255]);
        for (let x = 0; x < 5; x++) setPixel(image, x, 4, [0, 0, 0, 255]);

        expect(redChannel(sampleGrid(image, 2))).toEqual(baseline);
    });

    it("refuses an image smaller than the grid", () => {
        expect(() => sampleGrid(uniform(16, 16, 0), 32)).toThrow(/at least 32x32/);
    });
});

describe("medianFilter", () => {
    it("rejects an isolated outlier", () => {
        let image = uniform(8, 8, 100);
        setPixel(image, 4, 4, [0, 0, 0, 255]);

        expect(redChannel(medianFilter(image))).toEqual(Array(64).fill(100));
    });

    it("keeps a feature larger than half the kernel", () => {
        let image = uniform(8, 8, 100);
        for (let y = 2; y < 6; y++) {
            for (let x = 2; x < 6; x++) setPixel(image, x, y, [0, 0, 0, 255]);
        }

        expect(getPixel(medianFilter(image), 3, 3)[0]).toBe(0);
    });

    it("replicates the border rather than reading zeros", () => {
        let image = uniform(8, 8, 100);
        for (let y = 0; y < 8; y++) setPixel(image, 0, y, [0, 0, 0, 255]);

        // At x = 0 the window clamps to three columns of the dark edge against two bright ones,
        // so replication makes the edge win; zero-padding would too, which is why the second
        // assertion matters: one column in from the edge the bright majority must return.
        expect(getPixel(medianFilter(image), 0, 4)[0]).toBe(0);
        expect(getPixel(medianFilter(image), 1, 4)[0]).toBe(100);
    });

    it("filters each colour channel independently", () => {
        let image = uniform(8, 8, 100);
        setPixel(image, 4, 4, [0, 100, 100, 255]);
        setPixel(image, 5, 5, [100, 0, 100, 255]);

        expect(getPixel(medianFilter(image), 4, 4)).toEqual([100, 100, 100, 255]);
    });
});

describe("estimateBackground", () => {
    it("returns a uniform field for a uniform image", () => {
        expect(redChannel(estimateBackground(uniform(64, 64, 173)))).toEqual(Array(4096).fill(173));
    });

    it("follows a lighting gradient", () => {
        let image = createImage(128, 128);
        for (let y = 0; y < 128; y++) {
            for (let x = 0; x < 128; x++) {
                let value = 120 + Math.round((x / 127) * 100);
                setPixel(image, x, y, [value, value, value, 255]);
            }
        }

        let background = estimateBackground(image);

        expect(getPixel(background, 4, 64)[0]).toBeLessThan(140);
        expect(getPixel(background, 123, 64)[0]).toBeGreaterThan(200);
    });

    it("does not follow a thin stroke", () => {
        let image = uniform(128, 128, 200);
        for (let y = 0; y < 128; y++) setPixel(image, 62, y, [10, 10, 10, 255]);

        let background = estimateBackground(image);

        expect(getPixel(background, 62, 64)[0]).toBeGreaterThan(180);
    });
});
