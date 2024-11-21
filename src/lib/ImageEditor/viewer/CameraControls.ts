import type { ViewerProperties, ViewerPropertiesStore } from "./ViewerProperties";

export function centerCamera(vps: ViewerPropertiesStore) {
    let vp: ViewerProperties = vps.get();
    if (!vp.editor) return;

    let editorRect = vp.editor!.getBoundingClientRect();
    
    let newZoom = Math.min(
        editorRect.width / vp.imageWidth,
        editorRect.height / vp.imageHeight
    );

    vps.set({
        zoom: newZoom,
        camX: (editorRect.width/2)/newZoom - vp.imageWidth/2,
        camY: 0,
        // camX: -(editorRect.width/2) / vp.zoom + vp.imageWidth/2,
        // camY: -(editorRect.height/2) / vp.zoom + vp.imageHeight/2,
    });
}

export function fancyZoom(delta: number, vps: ViewerPropertiesStore, changes: Partial<ViewerProperties> = {}): Partial<ViewerProperties> {
    let vp = vps.get();

    if (!changes.camX) changes.camX = vp.camX;
    if (!changes.camY) changes.camY = vp.camY;

    changes.camX -= vp.mouseX * (1 - delta) / vp.zoom;
    changes.camY += vp.mouseY * (1 - delta) / vp.zoom;
    changes.zoom = vp.zoom / delta;

    return changes;
}