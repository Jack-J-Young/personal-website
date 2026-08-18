/**
 * The shape of the bundle `scripts/content.mjs` emits from the vault.
 *
 * Nothing here is written by hand — these types describe generated JSON, and the version in
 * `schema.json` is what stops the site rendering a bundle built by a different commit.
 */

export type ProjectStatus = "wip" | "done" | "abandoned";

/** What the index needs to draw a card, without loading the project itself. */
export interface ProjectCard {
    slug: string;
    title: string;
    summary: string;
    status: ProjectStatus;
    /** `yyyy-mm-dd`, or null when the note did not carry one. */
    date: string | null;
    cover: string | null;
    noteCount: number;
}

/** One iteration note. Rendered to HTML at publish time, so nothing parses markdown here. */
export interface Note {
    slug: string;
    title: string;
    date: string | null;
    order: number | null;
    html: string;
}

export interface Project extends ProjectCard {
    /** The project's `index.md`, rendered. */
    html: string;
    images: string[];
    /** Oldest first — a project's notes are a build story rather than a feed. */
    notes: Note[];
}

export interface Manifest {
    schema: number;
    projects: ProjectCard[];
}
