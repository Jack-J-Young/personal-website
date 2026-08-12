# src/

- [routes/](routes/README.md) — pages and routing
- [lib/](lib/README.md) — shared components, including the [ImageEditor](lib/ImageEditor/README.md)

## The app shell

Three files sit at the top of `src/` and affect every route:

**`app.html`** — the HTML template. Carries the favicon link, the viewport meta, and the Open
Graph tags used when a link to the site is shared. `%sveltekit.head%` and `%sveltekit.body%` are
the injection points.

**`app.css`** — global CSS custom properties (`--font-body`, `--font-mono`, the `--color-*`
palette) and base element styles for `h1`/`h2`/`p`/`a`/`pre`. Imports the Tailwind layers and the
Fira Mono font. Component-scoped styles and Tailwind utilities take it from there — see
[conventions](../conventions.md#styling).

**`app.d.ts`** — SvelteKit's ambient type declarations. Still the generated stub; every interface
in the `App` namespace is commented out because nothing needs them yet (no server hooks, no
`locals`, no custom `PageData`).
