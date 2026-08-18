# projects issues

See the [wiki index](../../../README.md#issues) for the tag format.

## A project page ships its photos at full size
`open` `high` `scripts/content.mjs` `src/lib/projects/Gallery.svelte`

Images are copied through at whatever size they left the camera. The three placeholders in
`sample-vault/` come to **20MB for one project page** — 11.7MB for a single photo — and phone
photos are worse, because they are more numerous.

`loading="lazy"` is on every image, so the cost is deferred rather than paid at load, and the
gallery only fetches what scrolls into view. That is not a fix. It is the difference between a
page that is slow immediately and one that is slow shortly afterwards.

What it needs is derivative generation in the process step: a mid-size webp for the grid, the
original behind a lightbox, and a tiny blurred placeholder inlined into the JSON so the grid paints
before anything is fetched. `vite-imagetools` is the wrong tool here — it works on assets Vite can
see, and these arrive from outside the repo — so this is `sharp` in `scripts/content.mjs`.

It is left open rather than done because it is the whole of the image phase, and phase one was
about getting a note onto a page.

## Only JPEG metadata is stripped
`open` `medium` `scripts/content.mjs`

`stripJpegMetadata` removes Exif, XMP, IPTC and comments from JPEGs, which is where a phone writes
the coordinates it was standing at. **PNG, WebP and AVIF are copied through untouched**, and all
three can carry an `eXIf` chunk.

In practice phones shoot JPEG and screenshots carry nothing interesting, so the gap is narrow —
but it is a gap in the one part of this pipeline whose failure is a disclosure rather than a bug,
and "narrow in practice" is exactly the reasoning that leaves those in place.

Both fixes are the same shape as the JPEG walk: PNG and WebP are chunk containers, and dropping
the ancillary chunks that are not `PLTE`/`tRNS`/`iCCP` is a short function. Doing it under `sharp`
instead would come free with
[the resize work](#a-project-page-ships-its-photos-at-full-size), which is the argument for waiting.

## The gallery repeats what the prose already showed
`known` `low` `src/routes/projects/[slug]/+page.svelte`

Photos sit at the top of a project, above its write-up, and a note that embeds an image shows it
again further down. On a project where every photo is referenced in prose, the gallery is pure
duplication.

It is at the top because that is where a project's files belong once there are 3D files to put
beside them, and building it somewhere else first would mean moving it. The duplication is the
price of not having the other half yet.

The tempting fix — show only images no note referenced — is worse than it sounds: it makes the
gallery's contents depend on prose edits, so adding a sentence silently removes a photo from it.

## Long notes are shown in full on the project page
`open` `low` `src/routes/projects/[slug]/+page.svelte`

Every iteration note is rendered inline under the project, at full length. Three short notes read
as a build story; twelve long ones read as a wall, and the project's own write-up is a long way
above the fold by then.

Each note already has its own page, so the fix is truncation with a "read on" link rather than new
routing. What is not decided is where to cut — by rendered height, by the first paragraph, or by
an explicit marker in the note — and the wrong choice reads as a bug rather than a design.

## Nothing tells the build that the content is missing
`open` `medium` `src/lib/projects/bundle.ts`

A missing bundle deliberately builds to an empty projects section, because a fresh clone must
still `npm run check`. The same behaviour on the deploy path would push a live site whose projects
had silently vanished.

The two cases want opposite defaults and the module cannot tell them apart, so the assertion
belongs in the site's CI: fail the build if the downloaded bundle is absent or publishes zero
projects. That is a workflow step that does not exist yet, since
[the pipeline is not wired up](../../../guides/publishing-notes.md) — only the script it would run.

## Obsidian's own link syntax is ignored
`planned` `low` `scripts/content.mjs`

`[[wikilinks]]` and `![[embeds]]` pass through as literal text. Standard markdown links and images
work, so a note written with them renders correctly — but that is a habit to keep up rather than
something the tool enforces, and Obsidian's autocomplete pushes the other way.

Resolving them is a pre-pass over the markdown mapping a link target to a slug. The part that
needs deciding first is what an embed of something that is not an image should do, since
`![[some-note]]` means "inline this note here", and this pipeline already inlines notes for its own
reasons.

## Every project is one folder deep
`known` `low` `scripts/content.mjs`

`projects/*/index.md` is the only pattern discovered, so a project cannot contain a sub-project and
a nested folder holding its own `index.md` is invisible.

Deliberate. Nesting makes the URL a path rather than a slug, the manifest a tree rather than a
list, and "which project is this note in" a question with more than one answer. None of that is
hard; none of it is worth having before there is a project that wants it.
