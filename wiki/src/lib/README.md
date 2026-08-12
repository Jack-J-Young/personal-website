# src/lib/

Shared code, reachable via the `$lib` alias.

- [ui/](ui/README.md) — the design system: tokens, theming, and the components every page is
  built from.
- [ImageEditor/](ImageEditor/README.md) — the whiteboard editor subsystem, which is nearly all of
  the interesting code in this repo.

## theme.ts

The theme store — `"system" | "light" | "dark"`, persisted to `localStorage`, applied to
`document.documentElement` as a `data-theme` attribute. `system` means no attribute is set, so
the `prefers-color-scheme` media query in `app.css` decides. See
[the ui README](ui/README.md#theming) for the full mechanism.

## BeforeAfterImageSlider.svelte

The draggable before/after comparison on the [`/whiteboard`](../routes/README.md) marketing page.
Takes `before` and `after` image URLs as props, so it isn't tied to the whiteboard assets.

A range input stretched over the whole figure at `opacity: 0` drives a `--position` custom
property. Three details are load-bearing:

- **The base image is in normal flow**, and the "after" copy is absolutely positioned over it.
  The figure therefore inherits the image's own aspect ratio, so there is no hardcoded ratio to
  keep in sync with the assets.
- **The overlay is revealed with `clip-path: inset(...)`, not by changing its width.** Clipping
  leaves both layers at identical scale, so they stay pixel-registered at every position;
  resizing the overlay would rescale its contents and drift out of alignment.
- **The range thumb is styled to zero width.** A default thumb insets the usable track by half
  its width at each end, so the value would never quite reach 0 or 100 at the visual edges.

The line, handle, and the Before/After badges all have `pointer-events: none`, since the
invisible input is what receives interaction; the input is ordered *before* them in the markup so
they paint on top and so `:hover`/`:focus-visible` sibling selectors can reach the handle. The
"After" badge lives inside the clipped overlay, so it is revealed and hidden along with it.

> Careful with layout wrappers: the component sizes itself from `width: 100%`, so a parent that
> applies `align-items: start` in a flex column will collapse it to zero width. This is why
> [`Stack`](ui/README.md) leaves children stretching by default.

## images/

Assets imported by components, as opposed to `static/`, which is served as-is. Currently holds
leftovers from the `create-svelte` template (`svelte-logo.svg`, `svelte-welcome.png`,
`github.svg`) — none of these are imported anywhere.
