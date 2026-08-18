/**
 * Reads the generated content bundle.
 *
 * The bundle is produced by `scripts/content.mjs` from a vault this repo does not contain, so it
 * is gitignored and a fresh clone has none. That is why these are globs rather than imports: a
 * missing bundle has to leave the site building with no projects, not fail to compile.
 *
 * A bundle that is *present* and disagrees about its schema is the opposite case, and throws. It
 * means the vault was processed by a different commit of this repo than the one about to render
 * it, and rendering it anyway would produce a page that is quietly wrong.
 */

import schema from "./schema.json";
import type { Manifest, Project, ProjectCard } from "./types";

const manifests = import.meta.glob<Manifest>("./generated/*.json", {
    eager: true,
    import: "default",
});

// Lazy, so each project's notes and gallery become their own chunk and the index page carries
// none of them.
const projects = import.meta.glob<Project>("./generated/project/*.json", { import: "default" });

function manifest(): Manifest {
    let found = Object.values(manifests)[0];
    if (found === undefined) return { schema: schema.version, projects: [] };

    if (found.schema !== schema.version) {
        throw new Error(
            `Content bundle is schema ${found.schema}, this build expects ${schema.version}. `
                + "Re-run scripts/content.mjs against the vault.",
        );
    }

    return found;
}

export function projectCards(): ProjectCard[] {
    return manifest().projects;
}

export function projectSlugs(): string[] {
    return manifest().projects.map((project) => project.slug);
}

export async function loadProject(slug: string): Promise<Project | null> {
    let load = projects[`./generated/project/${slug}.json`];
    return load === undefined ? null : await load();
}
