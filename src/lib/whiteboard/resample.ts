import { createImage, type RgbaImage } from "./image";

/** One axis of a bilinear tap: the lower source index and the weight of the upper one. */
interface Tap {
    index: number;
    weight: number;
}

/**
 * Maps a destination coordinate onto the source using the half-pixel-centre convention
 * (`src = (dst + 0.5) · scale − 0.5`) and clamps at the edges by zeroing the weight, which is
 * what OpenCV's `INTER_LINEAR` does. Sampling the source at whole pixels instead would shift the
 * whole image by half a pixel at every resize.
 */
function linearTap(destination: number, scale: number, sourceSize: number): Tap {
    let position = (destination + 0.5) * scale - 0.5;
    let index = Math.floor(position);
    let weight = position - index;

    if (index < 0) return { index: 0, weight: 0 };
    if (index >= sourceSize - 1) return { index: sourceSize - 1, weight: 0 };

    return { index, weight };
}

export function resize(image: RgbaImage, width: number, height: number): RgbaImage {
    if (width === image.width && height === image.height) {
        return { data: new Uint8ClampedArray(image.data), width, height };
    }

    let output = createImage(width, height);
    let scaleX = image.width / width;
    let scaleY = image.height / height;

    let columns: Tap[] = [];
    for (let x = 0; x < width; x++) columns.push(linearTap(x, scaleX, image.width));

    for (let y = 0; y < height; y++) {
        let row = linearTap(y, scaleY, image.height);
        let rowBelow = Math.min(row.index + 1, image.height - 1);

        for (let x = 0; x < width; x++) {
            let column = columns[x];
            let columnRight = Math.min(column.index + 1, image.width - 1);

            let topLeft = (row.index * image.width + column.index) * 4;
            let topRight = (row.index * image.width + columnRight) * 4;
            let bottomLeft = (rowBelow * image.width + column.index) * 4;
            let bottomRight = (rowBelow * image.width + columnRight) * 4;

            let target = (y * width + x) * 4;
            for (let channel = 0; channel < 4; channel++) {
                let top = image.data[topLeft + channel] * (1 - column.weight)
                    + image.data[topRight + channel] * column.weight;
                let bottom = image.data[bottomLeft + channel] * (1 - column.weight)
                    + image.data[bottomRight + channel] * column.weight;

                output.data[target + channel] = Math.round(top * (1 - row.weight) + bottom * row.weight);
            }
        }
    }

    return output;
}

/**
 * Scales the image to approximately `targetPixels` while preserving aspect ratio. Used for the
 * preview, where the point is a predictable amount of work regardless of the camera's resolution.
 */
export function resizeToTargetPixels(image: RgbaImage, targetPixels: number): RgbaImage {
    let aspectRatio = image.width / image.height;
    let height = Math.trunc(Math.sqrt(targetPixels / aspectRatio));
    let width = Math.trunc(height * aspectRatio);

    return resize(image, Math.max(1, width), Math.max(1, height));
}
