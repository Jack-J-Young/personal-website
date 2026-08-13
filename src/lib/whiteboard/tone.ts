import { cloneImage, type RgbaImage } from "./image";

const SATURATION_BOOST = 1.2;

/**
 * Lifts the image by the complement of its background estimate, so unevenly lit board turns
 * uniformly white while marks — which the estimate deliberately missed — stay dark.
 */
export function flattenAgainstBackground(image: RgbaImage, background: RgbaImage): RgbaImage {
    if (background.width !== image.width || background.height !== image.height) {
        throw new Error("Background estimate must match the image size");
    }

    let output = cloneImage(image);

    for (let i = 0; i < output.data.length; i += 4) {
        output.data[i] += 255 - background.data[i];
        output.data[i + 1] += 255 - background.data[i + 1];
        output.data[i + 2] += 255 - background.data[i + 2];
    }

    return output;
}

/**
 * Rescales the colour channels so the darkest and brightest samples anywhere in the image become
 * 0 and 255. One global range for all three channels, so a colour cast is preserved rather than
 * corrected.
 */
export function stretchContrast(image: RgbaImage): RgbaImage {
    let low = 255;
    let high = 0;

    for (let i = 0; i < image.data.length; i += 4) {
        for (let channel = 0; channel < 3; channel++) {
            let value = image.data[i + channel];
            if (value < low) low = value;
            if (value > high) high = value;
        }
    }

    if (high <= low) return cloneImage(image);

    // Truncated rather than rounded, matching the cast in the C++ lookup table it replaces.
    let lookup = new Uint8Array(256);
    for (let value = low; value <= high; value++) {
        lookup[value] = Math.trunc((255 * (value - low)) / (high - low));
    }

    let output = cloneImage(image);
    for (let i = 0; i < output.data.length; i += 4) {
        output.data[i] = lookup[output.data[i]];
        output.data[i + 1] = lookup[output.data[i + 1]];
        output.data[i + 2] = lookup[output.data[i + 2]];
    }

    return output;
}

function saturationOf(r: number, g: number, b: number): { value: number; saturation: number } {
    let value = Math.max(r, g, b);
    if (value === 0) return { value, saturation: 0 };

    return { value, saturation: Math.round((255 * (value - Math.min(r, g, b))) / value) };
}

function boosted(saturation: number): number {
    return Math.min(255, Math.round(saturation * SATURATION_BOOST));
}

/**
 * Multiplies saturation by a fixed factor and then stretches the result across the full range.
 * The stretch is the dominant effect: it is what makes marker colours read as vivid rather than
 * washed out under fluorescent light.
 *
 * Hue and brightness are untouched, so this scales each channel's distance from the pixel's
 * brightest channel instead of round-tripping through HSV — algebraically the same result,
 * without the hue quantisation a round trip would introduce.
 */
export function boostSaturation(image: RgbaImage): RgbaImage {
    let low = 255;
    let high = 0;

    for (let i = 0; i < image.data.length; i += 4) {
        let { saturation } = saturationOf(image.data[i], image.data[i + 1], image.data[i + 2]);
        let target = boosted(saturation);

        if (target < low) low = target;
        if (target > high) high = target;
    }

    if (high <= low) return cloneImage(image);

    let output = cloneImage(image);

    for (let i = 0; i < output.data.length; i += 4) {
        let { value, saturation } = saturationOf(output.data[i], output.data[i + 1], output.data[i + 2]);
        if (saturation === 0) continue;

        let stretched = Math.round((255 * (boosted(saturation) - low)) / (high - low));
        let scale = stretched / saturation;

        for (let channel = 0; channel < 3; channel++) {
            output.data[i + channel] = Math.round(value - (value - output.data[i + channel]) * scale);
        }
    }

    return output;
}
