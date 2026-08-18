import { error } from "@sveltejs/kit";

import { loadProject, projectSlugs } from "$lib/projects/bundle";
import type { EntryGenerator, PageLoad } from "./$types";

export const prerender = true;

// Every note gets a page of its own even though the project shows them all inline, because a note
// that cannot be linked to cannot be pointed at — by another note, or by anyone reading it.
export const entries: EntryGenerator = async () => {
    let found = [];

    for (let slug of projectSlugs()) {
        let project = await loadProject(slug);
        for (let note of project?.notes ?? []) found.push({ slug, note: note.slug });
    }

    return found;
};

export const load: PageLoad = async ({ params }) => {
    let project = await loadProject(params.slug);
    if (project === null) error(404, `No project called "${params.slug}"`);

    let at = project.notes.findIndex((note) => note.slug === params.note);
    if (at === -1) error(404, `No note called "${params.note}" in "${params.slug}"`);

    return {
        project,
        note: project.notes[at],
        previous: project.notes[at - 1] ?? null,
        next: project.notes[at + 1] ?? null,
    };
};
