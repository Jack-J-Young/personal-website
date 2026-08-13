import { processPreview, processWhiteboard, warpQuad, type Point, type RgbaImage } from "$lib/whiteboard";

import type { ProcessorSession } from "./ProcessorSession";
import type { ProcessorSettings } from "./ViewerProperties";

/**
 * Runs the whiteboard pipeline in the browser instead of calling the hosted API. Same interface
 * as the remote session it replaces, so the editor is unaware of the difference.
 *
 * There is no session in any real sense — the rectified image is simply held in memory for as
 * long as the page lives, which is also why nothing survives a refresh.
 */
export class LocalWhiteboardSession implements ProcessorSession {
    private source: RgbaImage | null = null;
    private settings: ProcessorSettings = { transparent: false, darkMode: false };
    private previewUrl: string | null = null;

    async startSession(image: File, points: Point[]): Promise<string> {
        let decoded = await decode(image);

        this.source = points.length === 4 ? warpQuad(decoded, points) : decoded;
        await this.renderPreview();

        return "local";
    }

    async setOptions(settings: ProcessorSettings): Promise<void> {
        this.settings = settings;
        await this.renderPreview();
    }

    getPreviewUrl(): string {
        return this.previewUrl ?? "";
    }

    async process(): Promise<Blob> {
        if (!this.source) throw new Error("No image has been loaded");

        await yieldToPaint();
        return encodePng(processWhiteboard(this.source, this.settings));
    }

    /**
     * Object URLs are minted fresh and the previous one released, so the caller never has to
     * defeat the browser's cache the way a fixed remote URL required.
     */
    private async renderPreview(): Promise<void> {
        if (!this.source) return;

        await yieldToPaint();
        let blob = await encodePng(processPreview(this.source, this.settings));

        if (this.previewUrl) URL.revokeObjectURL(this.previewUrl);
        this.previewUrl = URL.createObjectURL(blob);
    }
}

/**
 * Lets the editor paint its loading state before a long synchronous pass blocks the thread.
 *
 * A frame callback is the reliable way to wait for that paint, but it never fires while the tab
 * is in the background — so a timer races it. Without the race, switching tabs mid-process would
 * hang the pipeline until the user came back.
 */
function yieldToPaint(): Promise<void> {
    return new Promise((resolve) => {
        let settle = () => resolve();

        requestAnimationFrame(() => setTimeout(settle, 0));
        setTimeout(settle, 50);
    });
}

function canvasFor(width: number, height: number): CanvasRenderingContext2D {
    let canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    let context = canvas.getContext("2d");
    if (!context) throw new Error("Could not get a 2D canvas context");

    return context;
}

/**
 * Decodes onto white rather than onto transparency, so a PNG with an alpha channel arrives as
 * the flat colour image the pipeline expects — it has no alpha of its own until the
 * `transparent` option adds one.
 *
 * EXIF rotation is applied during decode; phone photos are routinely stored sideways, and the
 * corner points the user marked are in upright coordinates.
 */
async function decode(file: File): Promise<RgbaImage> {
    let bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });

    try {
        let context = canvasFor(bitmap.width, bitmap.height);
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, bitmap.width, bitmap.height);
        context.drawImage(bitmap, 0, 0);

        return context.getImageData(0, 0, bitmap.width, bitmap.height);
    } finally {
        bitmap.close();
    }
}

function encodePng(image: RgbaImage): Promise<Blob> {
    let context = canvasFor(image.width, image.height);
    context.putImageData(new ImageData(image.data, image.width, image.height), 0, 0);

    return new Promise((resolve, reject) => {
        context.canvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error("Could not encode the image"))),
            "image/png",
        );
    });
}
