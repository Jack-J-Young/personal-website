# src/lib/projects/

Everything the site does with the content bundle. Nothing here parses markdown or knows what a
vault looks like — that is [`scripts/content.mjs`](../../../guides/publishing-notes.md), which runs
somewhere else entirely and leaves JSON behind.

[Issues](issues.md)

## Reading the bundle

`bundle.ts` is the only module that touches generated files, and it makes two decisions that pull
in opposite directions on purpose.

**A missing bundle is fine.** The generated tree is gitignored and built from a vault this repo
does not contain, so a fresh clone has none. That is why it uses `import.meta.glob` rather than a
plain `import`: a glob that matches nothing is an empty object, and the site builds with no
projects instead of failing to compile. `import` would make the repo uncheckable until someone
ran the content step.

**A bundle that disagrees about its schema throws.** `schema.json` holds one number, written into
the manifest by the script and compared on read. A mismatch means the vault was processed by a
different commit of this repo than the one about to render it, and rendering it anyway produces a
page that is quietly wrong rather than visibly broken. The message says what to re-run.

The two cases look inconsistent until you notice they are the same rule: **absent is a state the
system is designed for, wrong is not.**

Project JSON is globbed lazily, so each project's notes and gallery become their own chunk and the
index page carries none of them.

## The publish filter

It lives in the script rather than here, but it is worth knowing where it is when reading this
directory: nothing in `src/` filters anything. By the time the bundle exists, every private note
is already gone. The site cannot leak what it was never given.

That is the reason the boundary is a build step in a private repo instead of a check at render
time — a filter the site performs is a filter that can be got wrong by a page.

## types.ts

Describes generated JSON, so nothing here is written by hand.

`ProjectCard` is what the index needs to draw a card; `Project` extends it with the rendered HTML,
the image list and the notes. The split is why `/projects` loads one small manifest rather than
every project's full text.

`Note.html` is rendered at publish time. There is no markdown in the browser.

## dates.ts

`formatDate` turns `2026-03-02` into "2 March 2026", fixed to en-GB and UTC.

**Both halves of that are the same bug avoided.** A date on a note is a day, not an instant.
Parsing `2026-01-01` in local time and formatting it in local time each shift it independently, so
a new year's day note renders as 31 December for anyone west of Greenwich — and prerendering would
bake in whatever the build machine happened to think.

## Prose

Long-form HTML lives in [`ui/Prose.svelte`](../ui/README.md#prose) rather than here, because
styling generated markup is a design-system problem and not a content one.

## StatusChip.svelte

`wip` / `done` / `abandoned` as a mono uppercase chip.

Only `wip` is coloured, in `--caution`. A finished project needs no emphasis, and an abandoned one
is worth *reading* rather than worth warning about — colouring all three would say the status
matters more than the title next to it.

## Gallery.svelte

Every image in the project, including the ones no note put in its prose — which is the only thing
it does that scrolling the page does not.

Each opens the original file in a new tab rather than a lightbox. That is honest about what exists
today: images are published at their original size, so "open" is the only larger view there is to
offer. It is [the wrong default at these file sizes](issues.md#a-project-page-ships-its-photos-at-full-size).
