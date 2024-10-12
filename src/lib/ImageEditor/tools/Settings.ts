import { Tool } from "../Tool";
import settings_icon from "$lib/ImageEditor/icons/settings.svg";
import { get } from "svelte/store";

export class Settings extends Tool {
    constructor() {
        super({
            icon: settings_icon,
            name: "Settings",
            hoverText: "Change settings for the image processor.",
            // selectable: true
        });
    }

    onSelect(): void {
        let selected = !get(this.selected);
        this.selected.set(selected);

        this.vps?.set({
            setting: selected
        });
    }

    // onDeselect(): void {
    //     console.log("Settings deselected");
    //     if (!this.vps) return;
    //     console.log("Settings deselected2");
    //     this.vps.set({ settings: false });
    // }
}