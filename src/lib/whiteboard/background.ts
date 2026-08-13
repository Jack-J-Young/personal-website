import { createImage, type RgbaImage } from "./image";
import { resize } from "./resample";

export const GRID_SIZE = 32;
const MEDIAN_KERNEL = 5;

/**
 * Reduces the image to a `gridSize × gridSize` map by taking the single pixel at the centre of
 * each cell — a point sample, not an average.
 *
 * Cell size is floored, so a strip of up to `gridSize − 1` pixels on the right and bottom edges
 * is never sampled. That is faithful to the deployed service; see the wiki before changing it,
 * because covering the full frame moves every output pixel.
 */
export function sampleGrid(image: RgbaImage, gridSize: number = GRID_SIZE): RgbaImage {
    let cellWidth = Math.floor(image.width / gridSize);
    let cellHeight = Math.floor(image.height / gridSize);

    if (cellWidth < 1 || cellHeight < 1) {
        throw new Error(`Image must be at least ${gridSize}x${gridSize} to sample a ${gridSize} grid`);
    }

    let grid = createImage(gridSize, gridSize);

    for (let row = 0; row < gridSize; row++) {
        let y = row * cellHeight + Math.floor(cellHeight / 2);

        for (let column = 0; column < gridSize; column++) {
            let x = column * cellWidth + Math.floor(cellWidth / 2);

            let source = (y * image.width + x) * 4;
            let target = (row * gridSize + column) * 4;

            grid.data[target] = image.data[source];
            grid.data[target + 1] = image.data[source + 1];
            grid.data[target + 2] = image.data[source + 2];
            grid.data[target + 3] = 255;
        }
    }

    return grid;
}

/** Square median filter over the colour channels, with edges replicated as OpenCV's `medianBlur` does. */
export function medianFilter(image: RgbaImage, kernelSize: number = MEDIAN_KERNEL): RgbaImage {
    let radius = Math.floor(kernelSize / 2);
    let output = createImage(image.width, image.height);
    let window = new Uint8Array(kernelSize * kernelSize);
    let middle = Math.floor(window.length / 2);

    for (let y = 0; y < image.height; y++) {
        for (let x = 0; x < image.width; x++) {
            for (let channel = 0; channel < 3; channel++) {
                let count = 0;

                for (let dy = -radius; dy <= radius; dy++) {
                    let sy = Math.min(image.height - 1, Math.max(0, y + dy));

                    for (let dx = -radius; dx <= radius; dx++) {
                        let sx = Math.min(image.width - 1, Math.max(0, x + dx));
                        window[count++] = image.data[(sy * image.width + sx) * 4 + channel];
                    }
                }

                output.data[(y * image.width + x) * 4 + channel] = window.sort()[middle];
            }

            output.data[(y * image.width + x) * 4 + 3] = 255;
        }
    }

    return output;
}

/**
 * Estimates the lighting across the board: a point-sampled grid, median filtered so pen strokes
 * are rejected as outliers, then smoothly upscaled back to full size.
 */
export function estimateBackground(image: RgbaImage, gridSize: number = GRID_SIZE): RgbaImage {
    let grid = sampleGrid(image, gridSize);
    let smoothed = medianFilter(grid);

    return resize(smoothed, image.width, image.height);
}
