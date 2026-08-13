import { describe, expect, it } from "vitest";

import { createImage, getPixel, setPixel } from "./image";
import { applyHomography, homographyBetween, rectifiedSize, warpQuad, type Point } from "./perspective";

const UNIT_SQUARE: Point[] = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 },
];

describe("homographyBetween", () => {
    it("maps every source point onto its target", () => {
        let quad: Point[] = [
            { x: 3, y: 1 },
            { x: 40, y: 7 },
            { x: 35, y: 28 },
            { x: 1, y: 22 },
        ];
        let homography = homographyBetween(UNIT_SQUARE, quad);

        for (let i = 0; i < 4; i++) {
            let mapped = applyHomography(homography, UNIT_SQUARE[i]);
            expect(mapped.x).toBeCloseTo(quad[i].x, 6);
            expect(mapped.y).toBeCloseTo(quad[i].y, 6);
        }
    });

    it("is the identity when both quads match", () => {
        let mapped = applyHomography(homographyBetween(UNIT_SQUARE, UNIT_SQUARE), { x: 4, y: 6 });

        expect(mapped.x).toBeCloseTo(4, 6);
        expect(mapped.y).toBeCloseTo(6, 6);
    });

    it("rejects a collapsed quadrilateral", () => {
        let collapsed = UNIT_SQUARE.map(() => ({ x: 0, y: 0 }));

        expect(() => homographyBetween(UNIT_SQUARE, collapsed)).toThrow(/degenerate/i);
    });
});

describe("rectifiedSize", () => {
    it("averages opposing edges", () => {
        let quad: Point[] = [
            { x: 0, y: 0 },
            { x: 20, y: 0 },
            { x: 30, y: 10 },
            { x: 0, y: 10 },
        ];

        // Top 20, bottom 30 -> 25 wide. Left 10, right sqrt(10^2 + 10^2) -> 12 high after truncation.
        expect(rectifiedSize(quad)).toEqual({ width: 25, height: 12 });
    });
});

describe("warpQuad", () => {
    it("crops an axis-aligned quad without resampling artefacts", () => {
        let image = createImage(8, 8);
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) setPixel(image, x, y, [x * 8, y * 8, 0, 255]);
        }

        let quad: Point[] = [
            { x: 2, y: 2 },
            { x: 6, y: 2 },
            { x: 6, y: 6 },
            { x: 2, y: 6 },
        ];
        let output = warpQuad(image, quad);

        expect(output.width).toBe(4);
        expect(output.height).toBe(4);
        // The quad's corners land on the output's corners, so this is an exact crop of 2..5.
        expect(getPixel(output, 0, 0)).toEqual([16, 16, 0, 255]);
        expect(getPixel(output, 3, 3)).toEqual([48, 48, 0, 255]);
    });

    it("puts the marked corners at the output corners under perspective", () => {
        let image = createImage(32, 32);
        for (let y = 0; y < 32; y++) {
            for (let x = 0; x < 32; x++) setPixel(image, x, y, [0, 0, 0, 255]);
        }

        let quad: Point[] = [
            { x: 4, y: 6 },
            { x: 27, y: 2 },
            { x: 30, y: 28 },
            { x: 2, y: 25 },
        ];
        for (let corner of quad) setPixel(image, corner.x, corner.y, [255, 0, 0, 255]);

        let output = warpQuad(image, quad);

        expect(getPixel(output, 0, 0)[0]).toBe(255);
        expect(getPixel(output, output.width - 1, 0)[0]).toBe(255);
        expect(getPixel(output, output.width - 1, output.height - 1)[0]).toBe(255);
        expect(getPixel(output, 0, output.height - 1)[0]).toBe(255);
    });

    it("reads outside the source as black rather than wrapping", () => {
        let image = createImage(8, 8);
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) setPixel(image, x, y, [200, 200, 200, 255]);
        }

        let quad: Point[] = [
            { x: -4, y: -4 },
            { x: 4, y: -4 },
            { x: 4, y: 4 },
            { x: -4, y: 4 },
        ];
        let output = warpQuad(image, quad);

        expect(getPixel(output, 0, 0)).toEqual([0, 0, 0, 255]);
        expect(getPixel(output, output.width - 1, output.height - 1)[0]).toBeGreaterThan(150);
    });

    it("requires four points", () => {
        let image = createImage(4, 4);

        expect(() => warpQuad(image, UNIT_SQUARE.slice(0, 3))).toThrow(/4 points/);
    });
});
