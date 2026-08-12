# src/routes/

SvelteKit routes. The app is a static SPA (`adapter-static` with `fallback: index.html`), so
these are client-rendered unless a route opts into prerendering.

| Route | File | Notes |
|---|---|---|
| `/` | `+page.svelte` | Landing page. Links to the whiteboard processor. |
| `/about` | `about/+page.svelte` | Bio and links. **The only prerendered route** — `about/+page.ts` sets `prerender = true`. It deliberately does *not* disable client-side rendering: the theme toggle in the nav needs JavaScript, and a `csr = dev` here would leave it inert in production while working fine in dev. |
| `/whiteboard` | `whiteboard/+page.svelte` | Marketing page: before/after slider, changelog, privacy copy. |
| `/whiteboard/s` | `whiteboard/s/+page.svelte` | The editor. See [ImageEditor](../lib/ImageEditor/README.md). |

[Issues](issues.md)

## +layout.svelte

The shared shell: [`Nav`](../lib/ui/README.md), `<main>`, [`Footer`](../lib/ui/README.md), and
[`ScrollToTop`](../lib/ui/README.md#scrolltotop), in a min-height flex column.

**The chrome is hidden on `/whiteboard/s`.** The editor is full-bleed and carries its own toolbar
with a home button in it, so the site nav would duplicate that and steal vertical space. The
layout branches on the pathname and renders a bare full-height `<main>` for that route.

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

All pages use Tailwind breakpoints (`sm:`, `md:`, `lg:`). Nothing measures the viewport in
JavaScript.

## Global styles

`src/app.css` holds the [design tokens](../lib/ui/README.md#tokens) and a minimal base — no
element styling, since that belongs to the components. `src/app.html` carries the Open Graph
meta tags and the blocking theme script that prevents a flash of the wrong theme on load.
