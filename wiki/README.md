# personal-website wiki

Documentation for [jackyoung.xyz](https://jackyoung.xyz) — a personal site carrying two real
tools:

- the **Whiteboard processor**: upload a photo of a whiteboard or page, optionally mark 4 corners
  for a perspective transform, tweak processing options, and download a cleaned image;
- the **Guitar tools**: a chromatic tuner and a chord recogniser that listen to your microphone,
  on the way to a trainer that measures how long your chord changes take.

**Both run entirely in the browser** — [src/lib/whiteboard/](src/lib/whiteboard/README.md) and
[src/lib/audio/](src/lib/audio/README.md). Nothing is uploaded and there is no backend to host.
Whiteboard processing was previously a hosted API at `api.jackyoung.xyz`, whose contract is still
recorded in [WhiteboardSession.ts](src/lib/ImageEditor/WhiteboardSession.ts.md).

## Contents

- [Conventions](conventions.md) — code style, commenting philosophy, styling split
- [Issues](issues.md) — repo-level issues (dependencies, config, root files)
- **Guides**
  - [Adding a tool](guides/adding-a-tool.md) — the ImageEditor tool recipe
- **Code** (mirrors the source tree)
  - [src/routes/](src/routes/README.md) — pages and routing
  - [src/lib/](src/lib/README.md) — shared components
    - [src/lib/ui/](src/lib/ui/README.md) — design system: tokens, theming, primitives
    - [src/lib/ImageEditor/](src/lib/ImageEditor/README.md) — the editor subsystem
    - [src/lib/whiteboard/](src/lib/whiteboard/README.md) — the image processing pipeline
    - [src/lib/audio/](src/lib/audio/README.md) — pitch and chord detection
    - [src/lib/guitar/](src/lib/guitar/README.md) — the guitar tools' components

## Stack

**SvelteKit 2 / Svelte 4** (options API, not runes), TypeScript strict, Tailwind 3 +
`@tailwindcss/typography`. Built with `adapter-static` and `fallback: index.html`, so it ships as
a **client-side SPA** into `build/`. There is no server runtime.

Dependencies of note: `bits-ui` (`Separator`, `AspectRatio`), `svelte-gestures` (`use:pan`),
`pitchy` (McLeod pitch detection for the tuner), `@vitejs/plugin-basic-ssl` (dev only, see
[`dev:lan`](#commands)).

## Commands

```bash
npm run dev                  # vite dev server
npm run dev -- --no-reload   # the same, but a save does not touch the open page
npm run dev:lan              # over HTTPS on the network — for testing on a phone or tablet
npm run build                # static build into build/
npm run preview              # serve the build
npm run check                # svelte-kit sync && svelte-check
npm test                     # vitest run
```

**`--no-reload` is for the guitar tools.** Hot reloading is the right default until the page is
holding state that took effort to reach — a microphone permission and a running practice session —
and then every save throws both away. The flag turns Vite's HMR off, so a save still rebuilds and
the browser simply is not told; refresh when you want the change.

It goes through [`scripts/dev.mjs`](../scripts/dev.mjs) rather than straight to Vite, because Vite's CLI
rejects options it does not recognise: it reads `--no-reload` as the negation of a `--reload` it
has never heard of and exits. The wrapper takes that one flag out, passes it on as an environment
variable that `vite.config.ts` reads, and forwards everything else untouched — `--host`, `--port`
and `--mode lan` all still work.

**`dev:lan` exists because of the microphone.** A browser only offers one to a secure context —
HTTPS, or one of the loopback hosts — so a tablet loading `http://192.168.x.x:5173` cannot open
one at all, and the guitar tools are dead there. `--mode lan` adds a self-signed certificate and
`--host` exposes the server; the certificate is untrusted, so every browser shows an interstitial
first. That is why it is a separate script rather than the default.

**`npm run check` and `npm test` are the two automated gates**, and both are currently clean —
0 errors, 0 warnings and a passing suite. Any new output is a regression introduced by the change
in front of you. There is no linter.

Tests cover [src/lib/whiteboard/](src/lib/whiteboard/README.md) and
[src/lib/audio/](src/lib/audio/README.md) — the two parts of the codebase that are pure
computation with checkable answers. They sit next to the code as `*.test.ts`. UI components are
not tested.

## How this wiki is organised

Two kinds of page:

**Narrative pages** — `README.md`, `conventions.md`, and anything under `guides/`. Free-form,
organised by topic.

**Code pages** — everything under `wiki/src/`, which **mirrors the project's own folder
structure**. Documentation for a source path lives at the matching wiki path, so its location is
derivable rather than a judgement call:

| Source | Wiki page |
|---|---|
| `src/lib/ImageEditor/` (the directory) | `wiki/src/lib/ImageEditor/README.md` |
| `src/lib/ImageEditor/Tool.ts` | `wiki/src/lib/ImageEditor/Tool.ts.md` |

`README.md` and `issues.md` are the two reserved filenames that describe their *containing
directory*. Every other page under `wiki/src/` must correspond to a real source file — keep the
extension (`Tool.ts.md`, not `Tool.md`) so the mapping stays mechanical.

Not every file needs its own page. Give a file one when it has depth worth explaining; otherwise
cover it in the directory's `README.md`. The mirror covers `src/` — root config is described
above.

### Issues

Issues live in an `issues.md` next to the code they concern, so
[the editor's issues](src/lib/ImageEditor/issues.md) sit with the editor. Each one is a `##`
heading followed by a tag line of backticked tokens:

```markdown
## Upload button does nothing, and re-uploading is impossible
`open` `high` `src/lib/ImageEditor/ToolBar.svelte`

Prose describing the problem and what fixing it would involve.
```

The tag line is **status**, then **severity**, then any number of affected source paths.

- **status** — `open` (a defect to fix) · `planned` (agreed work that isn't a defect — a feature,
  a refactor, a redesign) · `known` (accepted or intentional behaviour worth knowing) ·
  `wontfix` · `fixed`
- **severity** — `high` · `medium` · `low`

`planned` exists so `--status open` keeps meaning "something is broken". Severity on a `planned`
entry reads as priority rather than damage.

`fixed` exists so an issue can be marked before it's verified. Delete the entry once verified —
git remembers.

### Querying the wiki

```bash
node scripts/wiki.mjs issues
node scripts/wiki.mjs issues --path src/lib/ImageEditor --status open
node scripts/wiki.mjs check
```

`issues` searches every `issues.md` in the wiki. `--path` accepts a directory *or* a file — a
file path also matches issues that merely reference it in their tag line. `--json` emits
structured output.

`check` catches drift: wiki pages whose source no longer exists, issues referencing missing
files, and bad status/severity tokens are **errors**; source directories with no wiki page are
**warnings**. Errors exit non-zero, so it can gate a build later without demanding full coverage
now.

These also run as `npm run wiki -- issues --status open`, but the direct `node` form avoids
npm's argument forwarding rules.
