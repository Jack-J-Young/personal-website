import { get, writable, type Writable } from "svelte/store";
import type { ProcessorSession } from "./ProcessorSession";

export enum ViewerState {
    Editing,
    Preview,
    Processed,
}

export interface ProcessorSettings {
    transparent: boolean;
    darkMode: boolean;
}

export interface ViewerProperties {
    loading: boolean;
    preview: boolean;
    camX: number;
    camY: number;
    zoom: number;
    imageWidth: number;
    imageHeight: number;
    mouseX: number;
    mouseY: number;
    editor: HTMLElement | null;
    transformPoints: {x: number, y: number}[];
    imageRaw: File | null;
    image: string | null;
    imageBlob: Blob | null;
    sessionApi: ProcessorSession | null;
    state: ViewerState;
    setting: boolean;
    settings: ProcessorSettings;
}

/**
 * Whether leaving the editor, or loading a different photo, would throw away something the user
 * has done. Any loaded image counts, however far through the session they are.
 *
 * Shared so that every "are you sure" in the editor asks the same question.
 */
export function hasWorkInProgress(vp: ViewerProperties): boolean {
    return vp.image != null || vp.imageRaw != null;
}

export class ViewerPropertiesStore {
    private _vpStore: Writable<ViewerProperties>;

    constructor(vp: ViewerProperties) {
        this._vpStore = writable(vp);        
    }

    ref(): Writable<ViewerProperties> {
        return this._vpStore;
    }

    get(): ViewerProperties {
        return get(this._vpStore);
    }

    set(json: Partial<ViewerProperties>): void {
        this._vpStore.update((vp) => {
            return {...vp, ...json};
        });
    }
}

// export class ViewerProperty {
//     private _vpStore: ViewerPropertiesStore;

//     constructor(vp: ViewerProperties) {
//         this._vpStore = new ViewerPropertiesStore(vp);
//     }

//     get store(): ViewerProperties {
//         return this._vpStore.store;
//     }

//     set store(changes: Partial<ViewerProperties>) {
//         this._vpStore.store = changes;
//     }
// }