# src/lib/

Shared code, reachable via the `$lib` alias.

- [ImageEditor/](ImageEditor/README.md) — the whiteboard editor subsystem, which is nearly all of
  the interesting code in this repo.

## BeforeAfterImageSlider.svelte

The draggable before/after comparison on the [`/whiteboard`](../routes/README.md) marketing page.

A range input is stretched over the whole container at `opacity: 0` and drives a `--position`
custom property. The "before" image is absolutely positioned with `width: var(--position)`, so
dragging reveals it over the "after" image beneath. The visible line and handle are separate
elements with `pointer-events: none`, since the invisible input is what receives interaction.

Wrapped in `bits-ui`'s `AspectRatio.Root` at the source images' ratio (589/457), so it reserves
space before they load. It reads `wb-before.png` and `wb-after.png` from `static/`.

## images/

Assets imported by components, as opposed to `static/`, which is served as-is. Currently holds
leftovers from the `create-svelte` template (`svelte-logo.svg`, `svelte-welcome.png`,
`github.svg`) — none of these are imported anywhere.
