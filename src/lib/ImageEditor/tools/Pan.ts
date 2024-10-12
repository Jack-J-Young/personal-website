import { Tool } from "../Tool";
import pan_icon from "$lib/ImageEditor/icons/pan.svg";

export class Pan extends Tool {
    constructor() {
        super({
            icon: pan_icon,
            name: "Pan",
            hoverText: "Click and drag to pan the image.",
            selectable: true
        });
    }
}