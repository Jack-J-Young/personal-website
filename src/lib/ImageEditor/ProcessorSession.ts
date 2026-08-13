import type { ProcessorSettings } from "./ViewerProperties";

/**
 * What the editor needs from an image processor, whichever side of the network it runs on.
 *
 * The editor never learns which implementation it holds: it starts a session, pushes settings,
 * shows a preview URL, and asks for a finished blob.
 */
export interface ProcessorSession {
    /** Takes the uploaded file and, if exactly 4 are given, the corners to rectify to. */
    startSession(image: File, points: { x: number; y: number }[]): Promise<string>;

    setOptions(settings: ProcessorSettings): Promise<void>;

    /** Always safe to assign straight to an `<img>`; staleness is the implementation's problem. */
    getPreviewUrl(): string;

    /** The full-resolution result, as a PNG. */
    process(): Promise<Blob>;
}
