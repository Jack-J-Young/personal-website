import { Tool } from "./Tool";
import upload_icon from "$lib/ImageEditor/icons/upload.svg";
import { get } from "svelte/store";
import type { ViewerProperties } from "$lib/ImageEditor/viewer/ViewerProperties";
import UploadAlert from "../components/UploadAlert.svelte";

export class Upload extends Tool {
    constructor() {
        super({
            icon: upload_icon,
            name: "Upload Image",
            hoverText: `Upload image from your device${false ? " and undo changes" : ""}.`,
        });
    }

    onSelect(): void {
        console.log("select");
        let alert = !get(this.selected);
        console.log(alert);
        
        this.selected.set(alert);

        let changes: Partial<ViewerProperties> = {};
        if (alert) {
            changes.alertBody = UploadAlert;
        }

        this.vps?.set({ ...changes, alert });
    }
}
