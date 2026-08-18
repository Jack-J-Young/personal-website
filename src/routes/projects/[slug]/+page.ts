import { error } from "@sveltejs/kit";

import { loadProject, projectSlugs } from "$lib/projects/bundle";
import type { EntryGenerator, PageLoad } from "./$types";

export const prerender = true;

// Without this the route would only exist inside the SPA: a hard load of /projects/x would be
// served the fallback and assembled in the browser, so there would be no HTML for a crawler or a
// link preview to read. That is most of the point of a project page.
export const entries: EntryGenerator = () => projectSlugs().map((slug) => ({ slug }));

export const load: PageLoad = async ({ params }) => {
    let project = await loadProject(params.slug);
    if (project === null) error(404, `No project called "${params.slug}"`);

    return { project };
};
