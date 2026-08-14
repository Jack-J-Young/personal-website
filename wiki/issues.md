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

## @vitejs/plugin-basic-ssl is held at 1.x by the Vite version
`known` `low` `package.json` `vite.config.ts`

The plugin's 2.x line requires Vite 6 or newer and this repo is on Vite 5, so the dependency is
pinned to `^1.2.0`. Installing it without a version simply fails to resolve.

Nothing is wrong with 1.x — it does one job — but a Vite 6 upgrade should bump it in the same
change, since the peer range is the only thing keeping them in step.

## dev:lan configures an empty proxy that does nothing, and must keep doing nothing
`known` `low` `vite.config.ts`

`server: { proxy: {} }` in `lan` mode looks like leftover scaffolding and is not. It is the only
supported way to tell Vite to serve HTTP/1.1: given a certificate and no proxy it uses
`http2.createSecureServer` instead, Node's HTTP/2 compatibility layer hangs a symbol key on the
headers object, and SvelteKit's dev server passes those headers to `new Request`, where undici
walks every own key and throws on the symbol. Every request then 500s with
`init.headers is a symbol`.

Deleting it as dead config breaks `dev:lan` entirely. It only applies to that mode, so plain
`npm run dev` is unaffected either way.

## Template assets are still in the repo
`open` `low` `src/lib/images`

`src/lib/images/` holds `svelte-logo.svg`, `svelte-welcome.png`, `svelte-welcome.webp` and
`github.svg` from the create-svelte template. None are imported anywhere.

