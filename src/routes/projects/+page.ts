import { projectCards } from "$lib/projects/bundle";

export const prerender = true;

export function load() {
    return { projects: projectCards() };
}
