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

## Template assets are still in the repo
`open` `low` `src/lib/images`

`src/lib/images/` holds `svelte-logo.svg`, `svelte-welcome.png`, `svelte-welcome.webp` and
`github.svg` from the create-svelte template. None are imported anywhere.

