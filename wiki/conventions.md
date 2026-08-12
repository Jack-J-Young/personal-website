# Conventions

## Svelte

**Svelte 4, options API — not runes.** Use `export let`, `$:` reactive statements,
`createEventDispatcher`, `bind:this`. Do not introduce `$state`/`$props`.

TypeScript is strict, with `checkJs` on. Newer components use `<script lang="ts">`; a couple of
older ones (`TransformPoint`, `+layout`) are still plain JS.

## Styling

Styling is split by area, and the split is deliberate:

- **Marketing and layout pages** (`/`, `/about`, `/whiteboard`, `+layout.svelte`) use **Tailwind**
  utility classes. Custom colors: `navBar` (`#36364a`), `background` (`#484956`).
- **The editor chrome** (`/whiteboard/s` and everything under `src/lib/ImageEditor/`) uses
  **scoped `<style>` blocks with hard-coded hex**. Match this when adding editor UI rather than
  reaching for Tailwind:

  | | |
  |---|---|
  | `#2A2B2D` | toolbar |
  | `#232326` | panels, info bar |
  | `#ADAFB2` | muted text, borders |
  | `#5E5E5E` | dividers |
  | `#7979FF` | primary button |
  | `#262629` | canvas backdrop |

`tailwind.config.ts` sets `darkMode: 'media'` but no `dark:` variants are used — the app is
dark-themed unconditionally.

## Static assets

Assets live in `static/` and must be referenced with **root-absolute paths** (`/favicon.png`).
Relative paths resolve against the current route and break on nested ones like `/whiteboard/s/`.

## Comments

**Default to no comments.** Well-written code explains itself; a comment is an admission that it
didn't. Before adding one, try to make it unnecessary.

When a line or block is hard to follow, work through these in order:

1. **Refactor first.** Extract the confusing lines into a function with a name that says what
   they do. A good name replaces a comment and gets reused, type-checked, and shown in stack
   traces — a comment does none of that.
2. **Then name better.** If extraction doesn't fit, see whether clearer variable names or an
   intermediate named value removes the confusion on its own.
3. **Only then comment**, and comment the *why*, not the *what*. The code already says what it
   does; a comment earns its place by explaining the reason, constraint, or non-obvious
   consequence behind it.

**Function headers** are the one place a comment is often justified: if the name alone doesn't
make the inputs and the return value obvious, say what it takes and what it gives back. If the
name does make it obvious, don't restate it.

**Don't commit commented-out code.** Delete it — git remembers.

## Documentation

Code documentation goes in the [wiki](README.md), at the path mirroring the source file. Issues
and known defects go in an `issues.md` beside the code they concern, in the format described in
the [wiki index](README.md#issues).
