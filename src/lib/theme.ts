import { browser } from "$app/environment";
import { writable } from "svelte/store";

export type Theme = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "theme";

function storedTheme(): Theme {
    if (!browser) return "system";

    try {
        let stored = localStorage.getItem(STORAGE_KEY);
        return stored === "light" || stored === "dark" ? stored : "system";
    } catch {
        return "system";
    }
}

function systemTheme(): ResolvedTheme {
    if (!browser) return "dark";

    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function resolve(theme: Theme): ResolvedTheme {
    return theme === "system" ? systemTheme() : theme;
}

function apply(theme: Theme) {
    if (!browser) return;

    if (theme === "system") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", theme);

    try {
        if (theme === "system") localStorage.removeItem(STORAGE_KEY);
        else localStorage.setItem(STORAGE_KEY, theme);
    } catch {
        // Private browsing and blocked storage still get a working toggle,
        // it just won't survive a reload.
    }
}

export const theme = writable<Theme>(storedTheme());

theme.subscribe(apply);

export function toggleTheme() {
    theme.update((current) => (resolve(current) === "dark" ? "light" : "dark"));
}
