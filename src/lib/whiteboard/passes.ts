import { cloneImage, type RgbaImage } from "./image";
import { HUE_RANGE, hsv8ToRgb, rgbToHsv8 } from "./hsv";

const WHITE_CUTOFF = 240;
const ALPHA_FLOOR = 40;

/**
 * Derives alpha from ink density, so the result can sit on any background: the darker a pixel,
 * the more opaque it becomes, and anything close enough to white disappears.
 *
 * Alpha is then stretched against *twice* the image's peak density, which clips the top half of
 * the range to fully opaque — strokes come out solid instead of ghostly, while their feathered
 * edges survive. Whatever remains below {@link ALPHA_FLOOR} is snapped to clear so the edges do
 * not haze.
 */
export function applyTransparency(image: RgbaImage): RgbaImage {
    let output = cloneImage(image);
    let peak = 0;

    for (let i = 0; i < output.data.length; i += 4) {
        let density = Math.min(output.data[i], output.data[i + 1], output.data[i + 2]);
        let alpha = density > WHITE_CUTOFF ? 0 : 255 - density;

        output.data[i + 3] = alpha;
        if (alpha > peak) peak = alpha;
    }

    if (peak === 0) return output;

    let scale = 255 / (peak / 2);

    for (let i = 3; i < output.data.length; i += 4) {
        let alpha = Math.round(Math.min(255, output.data[i] * scale));
        output.data[i] = alpha < ALPHA_FLOOR ? 0 : alpha;
    }

    return output;
}

/**
 * Inverts the image and rotates hue by a half turn. The inversion alone would flip every colour
 * to its opposite — red ink to cyan — and the rotation puts it back, so only lightness changes
 * and a dark board keeps its original marker colours.
 */
export function applyDarkMode(image: RgbaImage): RgbaImage {
    let output = cloneImage(image);

    for (let i = 0; i < output.data.length; i += 4) {
        let [h, s, v] = rgbToHsv8(255 - output.data[i], 255 - output.data[i + 1], 255 - output.data[i + 2]);
        let [r, g, b] = hsv8ToRgb((h + HUE_RANGE / 2) % HUE_RANGE, s, v);

        output.data[i] = r;
        output.data[i + 1] = g;
        output.data[i + 2] = b;
    }

    return output;
}
