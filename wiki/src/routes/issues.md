# Route issues

See the [wiki index](../../README.md#issues) for the tag format.

## Mobile detection is an aspect-ratio heuristic
`known` `low` `src/routes/whiteboard/+page.svelte`

`mobileSite` is `innerWidth < innerHeight * 1.3` — a shape test, not a width breakpoint. A
landscape phone reads as desktop and a narrow desktop window reads as mobile. Intentional, but
surprising next to the Tailwind `md:` breakpoints used elsewhere.

## Uploads are retained indefinitely
`open` `high` `src/routes/whiteboard/+page.svelte`

The privacy copy on `/whiteboard` states uploads are kept until manually deleted, and lists
auto-expiry and manual session deletion as intended but not built. No client-side delete call
exists in [`WhiteboardSession`](../lib/ImageEditor/WhiteboardSession.ts.md), so there is
currently no way for a user to remove an image they've uploaded.

Fixing the client side is small; the retention policy itself lives in the backend repo.

## The /whiteboard copy advertises the UI as unfinished
`open` `low` `src/routes/whiteboard/+page.svelte`

The About section tells visitors the UI is mid-rollout, with "bugs and lots of the assets and
styling is placeholder". The Changes section reads as a changelog for a release that has since
shipped. If the UI is considered done, this copy is stale and undersells it.
