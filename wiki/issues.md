# Repo-level issues

Issues that aren't scoped to a directory under `src/` — dependencies, config, and root files.
Code issues live beside the code: [ImageEditor](src/lib/ImageEditor/issues.md),
[routes](src/routes/issues.md).

See the [wiki index](README.md#issues) for the tag format.

## README.md is still create-svelte boilerplate
`open` `medium` `README.md`

The root README is the untouched template — it explains how to run `npm create svelte@latest` and
never mentions this project. It's the first thing a visitor to the repo sees. It should describe
the site and point at [the wiki](README.md).

## svelte-splitpanes is an unused dependency
`open` `low` `package.json`

Listed under `dependencies` and never imported. Left in place so far to avoid churning the
lockfile; remove it with `npm uninstall svelte-splitpanes` next time the lockfile is being
touched anyway.

## darkMode is configured but unused
`known` `low` `tailwind.config.ts`

`darkMode: 'media'` is set, but there is not a single `dark:` variant in the codebase — the app
is dark-themed unconditionally. Harmless, but it implies a light theme exists.

## Commented-out colour variables in app.css
`open` `low` `src/app.css`

`--color-bg-0`, `--color-bg-1` and `--color-bg-2` are all set to the same value, with the
original distinct values commented out above them. Either the three-tier background is coming
back or it isn't; per [conventions](conventions.md#comments), the dead values should go.

## Template assets are still in the repo
`open` `low` `src/lib/images`

`src/lib/images/` holds `svelte-logo.svg`, `svelte-welcome.png`, `svelte-welcome.webp` and
`github.svg` from the create-svelte template. None are imported anywhere.

