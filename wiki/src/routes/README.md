# src/routes/

SvelteKit routes. The app is a static SPA (`adapter-static` with `fallback: index.html`), so
these are client-rendered unless a route opts into prerendering.

| Route | File | Notes |
|---|---|---|
| `/` | `+page.svelte` | Landing page. Links to the whiteboard processor. |
| `/about` | `about/+page.svelte` | Bio and links. **The only prerendered route** — `about/+page.ts` sets `prerender = true` and `csr = dev`, so it ships as a static asset with no client JS in production. |
| `/whiteboard` | `whiteboard/+page.svelte` | Marketing page: before/after slider, changelog, privacy copy. |
| `/whiteboard/s` | `whiteboard/s/+page.svelte` | The editor. See [ImageEditor](../lib/ImageEditor/README.md). |

[Issues](issues.md)

## +layout.svelte

The shared nav shell — logo, About, Whiteboard processor, separated by `bits-ui` `Separator`s.
Wraps everything in a full-height flex column with `<slot />` in a `<main>`.

## The editor page

`whiteboard/s/+page.svelte` is thin by design. It composes `ToolBar` + `ImageViewer` + `InfoBar`,
holds the `tool` store and the `vps` binding that connects them, and forwards window `wheel`
events to the active tool.

It also carries an inline `<svg>` holding a single `<filter id="inset-shadow">` definition,
positioned off-layout at zero size. SVG filter definitions have to exist in the document to be
referenced by `filter: url(#inset-shadow)`, which is why it sits in the markup rather than a
stylesheet.

`ImageViewer` dispatches `firstLoad` on the first image load, which is what triggers
`ToolBar.loadTools()` — so **the toolbar is empty until an image is loaded**.

## Responsive behaviour

`/whiteboard` switches layout on `innerWidth < innerHeight * 1.3` — an aspect-ratio test rather
than a width breakpoint. Everything else uses Tailwind's `md:` prefix normally.

## Global styles

`src/app.css` holds the CSS custom properties and base element styles; `src/app.html` carries the
Open Graph meta tags. Neither is route-specific, but both affect every route.
