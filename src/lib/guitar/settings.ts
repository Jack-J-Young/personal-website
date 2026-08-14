import { browser } from "$app/environment";
import { writable, type Writable } from "svelte/store";

import { DEFAULT_ACCEPTANCE, LOOSEST_ACCEPTANCE, STRICTEST_ACCEPTANCE } from "./practice";
import { DEFAULT_SENSITIVITY } from "./sensitivity";

/**
 * The two settings that are about the player's *room* rather than their playing: how loud a strum
 * arrives, and how close the recogniser gets to naming it.
 *
 * Both are compensating for a microphone and a guitar that do not change between visits, so having
 * to set them on every load is asking the same question over and over and ignoring the answer.
 *
 * Stores rather than props threaded down, because the sensitivity slider appears on two pages and
 * a setting that meant different things on each would be worse than no setting at all.
 */

function read(key: string, fallback: number, low: number, high: number): number {
    if (!browser) return fallback;

    try {
        let raw = localStorage.getItem(key);
        if (raw === null || raw.trim() === "") return fallback;

        let stored = Number(raw);
        if (!Number.isFinite(stored)) return fallback;

        // Clamped rather than trusted. The range is ours and may change, and a value saved under
        // an older one would otherwise come back as a setting the slider cannot express — leaving
        // a control that does nothing until it is moved.
        return Math.min(high, Math.max(low, stored));
    } catch {
        return fallback;
    }
}

function remembered(key: string, fallback: number, low: number, high: number): Writable<number> {
    let store = writable(read(key, fallback, low, high));

    store.subscribe((value) => {
        if (!browser) return;

        try {
            localStorage.setItem(key, String(value));
        } catch {
            // Private browsing and blocked storage still get a working slider. It just won't
            // survive a reload, which is where it was before this existed.
        }
    });

    return store;
}

export const sensitivity = remembered("guitar.sensitivity", DEFAULT_SENSITIVITY, 0, 1);

export const acceptance = remembered(
    "guitar.acceptance",
    DEFAULT_ACCEPTANCE,
    LOOSEST_ACCEPTANCE,
    STRICTEST_ACCEPTANCE,
);
