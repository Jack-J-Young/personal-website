# src/routes/

SvelteKit routes. The app is a static SPA (`adapter-static` with `fallback: index.html`), so
these are client-rendered unless a route opts into prerendering.

| Route | File | Notes |
|---|---|---|
| `/` | `+page.svelte` | Landing page. Links to the whiteboard processor. |
| `/about` | `about/+page.svelte` | Bio and links. Prerendered — `about/+page.ts` sets `prerender = true`. It deliberately does *not* disable client-side rendering: the theme toggle in the nav needs JavaScript, and a `csr = dev` here would leave it inert in production while working fine in dev. |
| `/projects` | `projects/+page.svelte` | Index of [published projects](../lib/projects/README.md). Prerendered. |
| `/projects/[slug]` | `projects/[slug]/+page.svelte` | One project: its write-up, its photos, and its iteration notes inline. Prerendered from the manifest. |
| `/projects/[slug]/[note]` | `projects/[slug]/[note]/+page.svelte` | One iteration note on its own page, with links to the ones either side. Prerendered. |
| `/whiteboard` | `whiteboard/+page.svelte` | Marketing page: before/after slider, changelog, privacy copy. |
| `/whiteboard/s` | `whiteboard/s/+page.svelte` | The editor. See [ImageEditor](../lib/ImageEditor/README.md). |
| `/guitar` | `guitar/+page.svelte` | Landing page for the guitar tools. |
| `/guitar/tuner` | `guitar/tuner/+page.svelte` | Chromatic tuner. See [audio](../lib/audio/README.md) and [guitar](../lib/guitar/README.md). |
| `/guitar/chords` | `guitar/chords/+page.svelte` | Chord recogniser. |
| `/guitar/trainer` | `guitar/trainer/+page.svelte` | Practice drill. Prompts a chord from the ticked [sets](../lib/guitar/README.md#the-chords-and-which-one-comes-next), previews the next, times the change between them, and scores the session [by chord or by change](../lib/guitar/README.md#the-two-boards). See [practice](../lib/guitar/README.md#practice). |

[Issues](issues.md)

## +layout.svelte

The shared shell: [`Nav`](../lib/ui/README.md), `<main>`, [`Footer`](../lib/ui/README.md), and
[`ScrollToTop`](../lib/ui/README.md#scrolltotop), in a min-height flex column.

**The chrome is hidden on `/whiteboard/s`.** The editor is full-bleed and carries its own toolbar,
so the site nav would duplicate it and steal vertical space. The layout branches on the pathname
and renders a bare full-height `<main>` for that route.

That reasoning depends on the editor offering its own way home, which its toolbar logo now is —
see [the editor's README](../lib/ImageEditor/README.md#leaving-the-editor). Removing that link
would strand anyone on the route.

**The guitar routes are ordinary pages** and keep the chrome. They are laid out in a `narrow`
`Container` like any other page, so there is nothing for the nav to duplicate.

## The project pages

The three of them are the only routes in the repo that are **prerendered from data**. `entries` in
each `+page.ts` reads the [content manifest](../lib/projects/README.md#reading-the-bundle) and
hands SvelteKit a slug per project — and, for notes, a slug pair per note — so the build writes
`build/projects/<slug>.html` rather than leaving them to the SPA fallback.

That is the point of the whole section rather than a detail. Without it a hard load of
`/projects/x` would be served `index.html` and assembled in the browser, so there would be no HTML
for a crawler to index or for a chat client to preview — which is most of what a project page is
for.

**Every note gets a page even though the project shows all of them inline.** A note that cannot be
linked to cannot be pointed at, by another note or by anyone reading it, and prerendering one is
nearly free.

The pages hold no content logic. Markdown was rendered to HTML before the site ever saw it, so
`Prose` takes a string and the routes are layout.

## The guitar pages

`/guitar` is a landing page in the same shape as `/whiteboard`. The three tools underneath it are
thin: each holds the loop's per-frame function and the state it produces, and hands everything
else to [`MicrophoneGate`](../lib/guitar/README.md#microphonegate).

The chord and trainer pages' per-frame function does almost nothing most frames — it appends a
loudness reading and asks whether that was an attack. The expensive work happens once per strum,
one whole window after the onset, which is
[why it stopped guessing out loud](../lib/audio/README.md#timing-a-strum-and-naming-it-separately).
Those two pages hold near-identical copies of that loop, which is
[a deliberate duplication](../lib/guitar/issues.md#both-listening-pages-carry-their-own-copy-of-the-frame-loop)
rather than an oversight.

**The trainer page holds no rules.** Which chord to ask for, whether a strum counts and what the
session adds up to are all [`practice.ts`](../lib/guitar/README.md#practice); the page's job is to
run the loop, keep the two-deep queue of prompts, and hold the session history. It does not even
own which board is showing — [`ScoreBoard`](../lib/guitar/README.md#scoreboard) keeps that, since
it is state about a table rather than about a drill.

It does own one piece of timing, and it is not a pacing choice: the window during which the
microphone is ignored after [a chime](../lib/guitar/README.md#feedback-tones). Only the page knows
both that a tone was played and that a detector is listening, so only the page can connect them.

Both are client-only in practice — they do nothing until a microphone is opened — but they still
have to *render* on the server, since every route here is server-rendered in dev even though the
build is an SPA. That is what makes the `onDestroy` guard in `MicrophoneGate` load-bearing rather
than defensive.

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
