import { createImage, type RgbaImage } from "./image";

export interface Point {
    x: number;
    y: number;
}

/** Row-major 3×3 homography. */
export type Homography = number[];

function solve(matrix: number[][], vector: number[]): number[] {
    let size = vector.length;
    let rows = matrix.map((row, i) => [...row, vector[i]]);

    for (let column = 0; column < size; column++) {
        let pivot = column;
        for (let row = column + 1; row < size; row++) {
            if (Math.abs(rows[row][column]) > Math.abs(rows[pivot][column])) pivot = row;
        }
        if (Math.abs(rows[pivot][column]) < 1e-12) throw new Error("Quadrilateral is degenerate");

        [rows[column], rows[pivot]] = [rows[pivot], rows[column]];

        for (let row = 0; row < size; row++) {
            if (row === column) continue;
            let factor = rows[row][column] / rows[column][column];
            for (let k = column; k <= size; k++) rows[row][k] -= factor * rows[column][k];
        }
    }

    return rows.map((row, i) => row[size] / row[i]);
}

/**
 * Solves for the homography taking each point of `from` onto the matching point of `to`. Both
 * must hold four points in the same order.
 */
export function homographyBetween(from: readonly Point[], to: readonly Point[]): Homography {
    let matrix: number[][] = [];
    let vector: number[] = [];

    for (let i = 0; i < 4; i++) {
        let { x: u, y: v } = from[i];
        let { x, y } = to[i];

        matrix.push([u, v, 1, 0, 0, 0, -x * u, -x * v]);
        vector.push(x);
        matrix.push([0, 0, 0, u, v, 1, -y * u, -y * v]);
        vector.push(y);
    }

    return [...solve(matrix, vector), 1];
}

export function applyHomography(homography: Homography, point: Point): Point {
    let [a, b, c, d, e, f, g, h, i] = homography;
    let w = g * point.x + h * point.y + i;

    return {
        x: (a * point.x + b * point.y + c) / w,
        y: (d * point.x + e * point.y + f) / w,
    };
}

/**
 * The size a quadrilateral should be rectified to: the mean of its opposing edge lengths, so a
 * board photographed at an angle comes out near its true proportions rather than the camera's.
 */
export function rectifiedSize(quad: readonly Point[]): { width: number; height: number } {
    let distance = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y);

    let width = (distance(quad[0], quad[1]) + distance(quad[2], quad[3])) / 2;
    let height = (distance(quad[0], quad[3]) + distance(quad[1], quad[2])) / 2;

    return { width: Math.trunc(width), height: Math.trunc(height) };
}

/** Bilinear sample; anything outside the source reads as transparent black, as OpenCV's constant border does. */
function sampleBilinear(image: RgbaImage, x: number, y: number, out: Float64Array): void {
    let x0 = Math.floor(x);
    let y0 = Math.floor(y);
    let ax = x - x0;
    let ay = y - y0;

    out[0] = out[1] = out[2] = out[3] = 0;

    for (let dy = 0; dy <= 1; dy++) {
        for (let dx = 0; dx <= 1; dx++) {
            let sx = x0 + dx;
            let sy = y0 + dy;
            if (sx < 0 || sy < 0 || sx >= image.width || sy >= image.height) continue;

            let weight = (dx ? ax : 1 - ax) * (dy ? ay : 1 - ay);
            let i = (sy * image.width + sx) * 4;

            out[0] += image.data[i] * weight;
            out[1] += image.data[i + 1] * weight;
            out[2] += image.data[i + 2] * weight;
            out[3] += image.data[i + 3] * weight;
        }
    }
}

/**
 * Rectifies `quad` — four points in source pixels, clockwise from the top-left — onto the whole
 * of a new image sized by {@link rectifiedSize}.
 */
export function warpQuad(image: RgbaImage, quad: readonly Point[]): RgbaImage {
    if (quad.length !== 4) throw new Error("A quadrilateral needs exactly 4 points");

    let { width, height } = rectifiedSize(quad);
    if (width < 1 || height < 1) throw new Error("Quadrilateral is degenerate");

    let corners: Point[] = [
        { x: 0, y: 0 },
        { x: width - 1, y: 0 },
        { x: width - 1, y: height - 1 },
        { x: 0, y: height - 1 },
    ];

    // Solved output-to-source, which is the direction sampling needs; inverting a
    // source-to-output matrix afterwards would compute the same thing less directly.
    let toSource = homographyBetween(corners, quad);

    let output = createImage(width, height);
    let sample = new Float64Array(4);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let source = applyHomography(toSource, { x, y });
            sampleBilinear(image, source.x, source.y, sample);

            let i = (y * width + x) * 4;
            output.data[i] = Math.round(sample[0]);
            output.data[i + 1] = Math.round(sample[1]);
            output.data[i + 2] = Math.round(sample[2]);
            output.data[i + 3] = 255;
        }
    }

    return output;
}
