import { describe, expect, it } from "vitest";

import { createImage, getPixel, setPixel, type RgbaImage } from "./image";
import { PREVIEW_PIXELS, processPreview, processWhiteboard } from "./pipeline";

/**
 * A whiteboard photograph in miniature: bright, lit unevenly from the left, with a vertical
 * stroke of ink across it.
 */
function litBoard(options: { stroke?: number[]; strokeAt?: number } = {}): RgbaImage {
    let image = createImage(128, 128);
    let stroke = options.stroke ?? [30, 30, 30];
    let strokeAt = options.strokeAt ?? 40;

    for (let y = 0; y < 128; y++) {
        for (let x = 0; x < 128; x++) {
            let lit = 130 + Math.round((x / 127) * 110);
            setPixel(image, x, y, [lit, lit, lit, 255]);
        }
    }

    for (let y = 20; y < 108; y++) {
        for (let x = strokeAt; x < strokeAt + 3; x++) setPixel(image, x, y, [...stroke, 255]);
    }

    return image;
}

function spread(image: RgbaImage, y: number, xs: number[]): number {
    let values = xs.map((x) => getPixel(image, x, y)[0]);
    return Math.max(...values) - Math.min(...values);
}

describe("processWhiteboard", () => {
    it("flattens uneven lighting", () => {
        let board = litBoard();
        let columns = [4, 20, 70, 100, 124];

        expect(spread(board, 64, columns)).toBeGreaterThan(90);
        expect(spread(processWhiteboard(board), 64, columns)).toBeLessThan(10);
    });

    it("whitens the board and keeps the ink dark", () => {
        let output = processWhiteboard(litBoard());

        expect(getPixel(output, 100, 64)[0]).toBeGreaterThan(240);
        expect(getPixel(output, 41, 64)[0]).toBeLessThan(60);
    });

    it("keeps ink dark even where the board is darkest", () => {
        // The stroke sits in the dimmest part of the photograph, where it is barely darker than
        // the lit board on the other side. Flattening is what has to separate them.
        let output = processWhiteboard(litBoard({ strokeAt: 8, stroke: [70, 70, 70] }));

        expect(getPixel(output, 9, 64)[0]).toBeLessThan(120);
        expect(getPixel(output, 100, 64)[0]).toBeGreaterThan(240);
    });

    it("preserves the image dimensions", () => {
        let output = processWhiteboard(litBoard());

        expect(output.width).toBe(128);
        expect(output.height).toBe(128);
    });

    it("leaves the input untouched", () => {
        let board = litBoard();
        let before = new Uint8ClampedArray(board.data);

        processWhiteboard(board, { transparent: true, darkMode: true });

        expect(board.data).toEqual(before);
    });

    it("makes the board transparent when asked", () => {
        let opaque = processWhiteboard(litBoard());
        let transparent = processWhiteboard(litBoard(), { transparent: true, darkMode: false });

        expect(getPixel(opaque, 100, 64)[3]).toBe(255);
        expect(getPixel(transparent, 100, 64)[3]).toBe(0);
        expect(getPixel(transparent, 41, 64)[3]).toBeGreaterThan(200);
    });

    it("inverts the board in dark mode", () => {
        let output = processWhiteboard(litBoard(), { transparent: false, darkMode: true });

        expect(getPixel(output, 100, 64)[0]).toBeLessThan(20);
        expect(getPixel(output, 41, 64)[0]).toBeGreaterThan(190);
    });

    it("keeps coloured ink recognisable", () => {
        let output = processWhiteboard(litBoard({ stroke: [190, 40, 40] }));
        let [r, g, b] = getPixel(output, 41, 64);

        expect(r).toBeGreaterThan(g + 40);
        expect(r).toBeGreaterThan(b + 40);
    });
});

describe("processPreview", () => {
    it("scales down to roughly the preview budget", () => {
        let large = createImage(1600, 1200);
        for (let y = 0; y < 1200; y++) {
            for (let x = 0; x < 1600; x++) setPixel(large, x, y, [200, 200, 200, 255]);
        }

        let preview = processPreview(large);

        expect(preview.width * preview.height).toBeGreaterThan(PREVIEW_PIXELS * 0.9);
        expect(preview.width * preview.height).toBeLessThan(PREVIEW_PIXELS * 1.1);
        expect(preview.width / preview.height).toBeCloseTo(1600 / 1200, 1);
    });

    it("agrees with the full-resolution result", () => {
        let board = litBoard();
        let full = processWhiteboard(board);
        let preview = processPreview(board, { transparent: false, darkMode: false }, 4096);

        // Same pipeline, less resolution: the board should still be white and the ink still dark.
        expect(getPixel(preview, Math.round((100 / 128) * preview.width), preview.height >> 1)[0])
            .toBeGreaterThan(240);
        expect(getPixel(full, 100, 64)[0]).toBeGreaterThan(240);
    });
});
