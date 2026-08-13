import { estimateBackground } from "./background";
import type { RgbaImage } from "./image";
import { applyDarkMode, applyTransparency } from "./passes";
import { resizeToTargetPixels } from "./resample";
import { boostSaturation, flattenAgainstBackground, stretchContrast } from "./tone";

export interface ProcessorSettings {
    transparent: boolean;
    darkMode: boolean;
}

export const DEFAULT_SETTINGS: ProcessorSettings = { transparent: false, darkMode: false };

/** Roughly the pixel budget the preview is scaled to, independent of the camera's resolution. */
export const PREVIEW_PIXELS = 600_000;

/**
 * Cleans up a photograph of a whiteboard: flattens the lighting, then pushes contrast and colour
 * back out. Expects an image already rectified by {@link warpQuad}.
 */
export function processWhiteboard(image: RgbaImage, settings: ProcessorSettings = DEFAULT_SETTINGS): RgbaImage {
    let flattened = flattenAgainstBackground(image, estimateBackground(image));
    let output = boostSaturation(stretchContrast(flattened));

    if (settings.transparent) output = applyTransparency(output);
    if (settings.darkMode) output = applyDarkMode(output);

    return output;
}

/**
 * The same pipeline at preview resolution. Downscaling first is the only difference, so what the
 * preview shows is what the full-resolution result will look like.
 */
export function processPreview(
    image: RgbaImage,
    settings: ProcessorSettings = DEFAULT_SETTINGS,
    targetPixels: number = PREVIEW_PIXELS,
): RgbaImage {
    return processWhiteboard(resizeToTargetPixels(image, targetPixels), settings);
}
