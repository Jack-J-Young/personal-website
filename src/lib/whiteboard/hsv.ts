/**
 * OpenCV's 8-bit HSV encoding, which is what the deployed pipeline's colour stages are written
 * against: hue is halved to fit a byte, so it runs 0–179 rather than 0–359.
 */
export const HUE_RANGE = 180;

export function rgbToHsv8(r: number, g: number, b: number): [number, number, number] {
    let value = Math.max(r, g, b);
    let range = value - Math.min(r, g, b);

    if (range === 0) return [0, 0, value];

    let saturation = Math.round((255 * range) / value);

    let degrees: number;
    if (value === r) degrees = (60 * (g - b)) / range;
    else if (value === g) degrees = 120 + (60 * (b - r)) / range;
    else degrees = 240 + (60 * (r - g)) / range;

    if (degrees < 0) degrees += 360;

    return [Math.round(degrees / 2) % HUE_RANGE, saturation, value];
}

export function hsv8ToRgb(h: number, s: number, v: number): [number, number, number] {
    if (s === 0) return [v, v, v];

    let sector = ((h * 2) / 60) % 6;
    let index = Math.floor(sector);
    let offset = sector - index;

    let saturation = s / 255;
    let full = v;
    let empty = v * (1 - saturation);
    let falling = v * (1 - saturation * offset);
    let rising = v * (1 - saturation * (1 - offset));

    let channels: [number, number, number] =
        index === 0 ? [full, rising, empty]
        : index === 1 ? [falling, full, empty]
        : index === 2 ? [empty, full, rising]
        : index === 3 ? [empty, falling, full]
        : index === 4 ? [rising, empty, full]
        : [full, empty, falling];

    return [Math.round(channels[0]), Math.round(channels[1]), Math.round(channels[2])];
}
