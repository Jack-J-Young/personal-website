import type { GestureCustomEvent, PinchPointerEventDetail } from "svelte-gestures";
import type { ViewerProperties, ViewerPropertiesStore } from "./ViewerProperties";
import { fancyZoom } from "./CameraControls";
import { writable, type Writable } from "svelte/store";

export class Tool {
    vps: ViewerPropertiesStore | null = null;
    icon: string;
    name: string;
    hoverText: string;
    selectable: boolean;
    selected: Writable<boolean> = writable(false);
    disabled: boolean = false;

    // Default: Pan
    private isPanning: boolean;

    private startX: number;
    private startY: number;
    private startDetailX: number;
    private startDetailY: number;

    private lastPinch: number;

    constructor(json: Partial<Tool> = {}) {
        this.icon = json.icon!;
        this.name = json.name!;
        this.hoverText = json.hoverText ?? "TODO: set hoverText to change this";
        this.selectable = json.selectable ?? false;

        // Pan
        this.isPanning = false;
        this.startX = 0;
        this.startY = 0;
        this.startDetailX = 0;
        this.startDetailY = 0;
        this.lastPinch = -1;
    }

    public setVps(vps: ViewerPropertiesStore): void {
        this.vps = vps;
    }

    onSelect(): void {
        this.selected.set(true);
    }

    onDeselect(): void {
        this.selected.set(false);
    }

    // On Click
    onClick(event: MouseEvent): void {
        return;
    }

    // On Pan / Click & Drag
    panOn(event: GestureCustomEvent): void {
        if (!this.vps) return;
        let vp = this.vps.get();

        this.startX = vp.camX;
        this.startY = vp.camY;
        this.startDetailX = event.detail.x;
        this.startDetailY = event.detail.y;
        this.isPanning = true;

        // if (!this.vpStore) return;
        // this.startX = this.vpStore.camX;
        // this.startY = this.vpStore.camY;
        // this.startDetailX = event.detail.x;
        // this.startDetailY = event.detail.y;
        // this.isPanning = true;
    }

    panOff(event: GestureCustomEvent): void {
        this.isPanning = false;
    }
    
    pan(event: GestureCustomEvent): void {
        if (!this.vps) return;
        if (!this.isPanning) return;
        let vp = this.vps.get();

        // vp.camX = this.startX + this.startDetailX/vp.zoom - event.detail.x/vp.zoom;
        // vp.camY = this.startY + this.startDetailY/vp.zoom - event.detail.y/vp.zoom;
        this.vps.set({
            camX: this.startX - this.startDetailX/vp.zoom + event.detail.x/vp.zoom,
            camY: this.startY + this.startDetailY/vp.zoom - event.detail.y/vp.zoom
        });
    }

    // On Zoom
    zoom(event: WheelEvent | CustomEvent<PinchPointerEventDetail>): void {
        if (event instanceof WheelEvent) {
            this.wheel(event);
            return;
        }
        if (event instanceof CustomEvent) {
            // this.pinch(event);
            return;
        }
    }

    wheel(event: WheelEvent): void {
        if (!this.vps) return;

        let vp = this.vps.get();
        if (!vp.editor) return;

        let changes: Partial<ViewerProperties> = {};

        let rect = vp.editor.getBoundingClientRect();
        
        if (this.isPanning) {
            // changes.camX = this.startX - this.startDetailX/vp.zoom + event.x/vp.zoom;
            // changes.camY = this.startY + this.startDetailY/vp.zoom - event.y/vp.zoom;
            // vp.camX = this.startX + this.startDetailX/vp.zoom - (event.x - rect.left)/vp.zoom;
            // vp.camY = this.startY + this.startDetailY/vp.zoom - (event.y - rect.top)/vp.zoom;
            this.isPanning = false;
        }

        let delta = 1 + event.deltaY / 1000;

        // if (vp.zoom / delta < 0.1) {
        //     delta = vp.zoom / 0.1;
        // }
        this.vps.set({
            mouseX: event.x,
            mouseY: event.y,
        })
        // vp.mouseX = event.x - rect.left;
        // vp.mouseY = event.y - rect.top;

        // set a merge of changes and fancyZoom with fancyZoom taking precedence

        this.vps.set({
            ...fancyZoom(delta, this.vps, changes)
        });
        
        // fancyZoom(delta, this.vps);
    }

    // pinchOn(event: GestureCustomEvent): void {
    //     this.lastPinch = -1;
    // }

    // private startPinch(event: CustomEvent<PinchPointerEventDetail>): void {
    //     if (!this.vps) return;
    //     if (this.isPanning) {
    //         this.vps.store.camX = this.startX + this.startDetailX/this.vps.store.zoom - event.detail.center.x/this.vps.store.zoom;
    //         this.vps.store.camY = this.startY + this.startDetailY/this.vps.store.zoom - event.detail.center.y/this.vps.store.zoom;
    //         this.isPanning = false;
    //     }
    //     this.lastPinch = event.detail.scale;
    //     this.vps.store.mouseX = event.detail.center.x;
    //     this.vps.store.mouseY = event.detail.center.y;
    // }

    // pinch(event: CustomEvent<PinchPointerEventDetail>): void {
    //     if (!this.vps) return;
    //     if (this.lastPinch == -1) {
    //         this.startPinch(event);
    //         return;
    //     }
    //     let delta = this.lastPinch / event.detail.scale;

    //     fancyZoom(delta, this.vps);

    //     this.lastPinch = event.detail.scale;
    // }
}