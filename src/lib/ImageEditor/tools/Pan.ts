import { Tool } from "../Tool";
import PanIcon from "../icons/PanIcon.svelte";

export class Pan extends Tool {
    constructor() {
        super({
            icon: PanIcon,
            name: "Pan",
            hoverText: "Click and drag to pan the image.",
            selectable: true
        });
    }
}