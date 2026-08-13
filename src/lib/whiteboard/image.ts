/**
 * Interleaved 8-bit RGBA, structurally compatible with the DOM's `ImageData` so a canvas
 * `ImageData` can be passed straight in and the result handed back without copying.
 */
export interface RgbaImage {
    data: Uint8ClampedArray;
    width: number;
    height: number;
}

export function createImage(width: number, height: number): RgbaImage {
    let data = new Uint8ClampedArray(width * height * 4);
    for (let i = 3; i < data.length; i += 4) data[i] = 255;
    return { data, width, height };
}

export function cloneImage(image: RgbaImage): RgbaImage {
    return {
        data: new Uint8ClampedArray(image.data),
        width: image.width,
        height: image.height,
    };
}

export function pixelIndex(image: RgbaImage, x: number, y: number): number {
    return (y * image.width + x) * 4;
}

/** Reads one pixel as `[r, g, b, a]`. For hot loops, index `data` directly instead. */
export function getPixel(image: RgbaImage, x: number, y: number): [number, number, number, number] {
    let i = pixelIndex(image, x, y);
    return [image.data[i], image.data[i + 1], image.data[i + 2], image.data[i + 3]];
}

export function setPixel(image: RgbaImage, x: number, y: number, rgba: readonly number[]): void {
    let i = pixelIndex(image, x, y);
    image.data[i] = rgba[0];
    image.data[i + 1] = rgba[1];
    image.data[i + 2] = rgba[2];
    image.data[i + 3] = rgba[3] ?? 255;
}

/**
 * Builds an image from a `[r, g, b] | [r, g, b, a]` per pixel, row-major. Test helper — the
 * pipeline itself never constructs images this way.
 */
export function imageFromPixels(width: number, height: number, pixels: readonly number[][]): RgbaImage {
    let image = createImage(width, height);
    for (let i = 0; i < pixels.length; i++) {
        setPixel(image, i % width, Math.floor(i / width), pixels[i]);
    }
    return image;
}
