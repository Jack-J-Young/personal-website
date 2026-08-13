# Conventions

## Svelte

**Svelte 4, options API — not runes.** Use `export let`, `$:` reactive statements,
`createEventDispatcher`, `bind:this`. Do not introduce `$state`/`$props`.

TypeScript is strict, with `checkJs` on. Newer components use `<script lang="ts">`; a couple of
older ones (`TransformPoint`, `+layout`) are still plain JS.

## Styling

**Use the [design system](src/lib/ui/README.md).** Colour, type, spacing and radius decisions
live in `src/lib/ui/` and in the tokens in `src/app.css`. Pages compose those components; they
don't restate styles.

Concretely:

- **No global element styling.** `app.css` has no rules for `a`, `h1`, `p` and shouldn't gain
  any — that's `Link`, `Heading` and `Text`'s job. Global CSS is limited to tokens, the body
  background, and the focus ring.
- **No raw colours in pages or components.** Use a token (`bg-surface`, `text-text-muted`,
  `var(--accent)`). If you need a colour that doesn't exist, add a token for it in all four
  theme blocks rather than inlining a hex.
- **Need a different look?** Add a variant if it's the same element reskinned, or fork the
  component if it isn't. Don't override a component's styles from the outside.

Two traps documented in full [in the ui README](src/lib/ui/README.md#two-rules-that-are-easy-to-get-wrong):
Tailwind `dark:` variants don't work here (there's no `data-theme` attribute when following the
OS), and Tailwind 3 silently drops opacity modifiers like `/50` on `var()` colours.

### The editor is not an exception

Everything under `src/lib/ImageEditor/` used to keep scoped `<style>` blocks full of hard-coded
hex. It no longer does — it draws from the same tokens as the rest of the site and themes with
it, so **the "no raw colours" rule above applies there too**.

What is still different is that the editor keeps its own *components* rather than composing
`ui/` ones, because a toolbar over an image is a genuinely different problem from a page. That is
a component boundary, not a licence to restate colours: `EditorButton` shares `buttonClasses`
with the site's `Button` precisely so the two cannot drift.

The editor does own four tokens no page needs — `--editor-canvas`, `--overlay-scrim`, and the
deliberately unthemed `--marker` / `--marker-soft`. Adding to that set is fine when a colour
genuinely has to survive being drawn over an arbitrary photograph; reaching for a hex is not.
See [the editor's styling notes](src/lib/ImageEditor/README.md#styling).

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
