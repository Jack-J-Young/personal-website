import { Tool } from "../Tool";
import UploadIcon from "../icons/UploadIcon.svelte";

/**
 * Opens the upload dialog.
 *
 * The action arrives as a callback rather than through the store, because a dialog is a DOM
 * element a `Tool` has no way to reach — and a request to open something once is not editor
 * state, which is what putting it in the store would make it look like.
 */
export class Upload extends Tool {
    private requestUpload: () => void;

    constructor(requestUpload: () => void) {
        super({
            icon: UploadIcon,
            name: "Upload Image",
            hoverText: "Load a different image from your device.",
        });

        this.requestUpload = requestUpload;
    }

    onSelect(): void {
        this.requestUpload();
    }
}
