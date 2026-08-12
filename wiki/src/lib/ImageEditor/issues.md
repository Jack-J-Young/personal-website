# ImageEditor issues

See the [wiki index](../../../README.md#issues) for the tag format.

## Upload button does nothing, and re-uploading is impossible
`open` `high` `src/lib/ImageEditor/ToolBar.svelte` `src/lib/ImageEditor/ImageViewer.svelte`

Two problems that compound:

1. The Upload entry in `loadTools()` is a plain object with no `onSelect`. In `selectTool()` it
   isn't `selectable`, so it falls to the `else` branch, which calls `newTool?.onSelect()` —
   which doesn't exist. Clicking it is a no-op. Only the full-viewport `<label for="input-image">`
   in `ImageViewer` actually opens the file picker, and that's covered by the image once one is
   loaded.
2. The file input is `disabled={$vp.image != null}`, so once any image is loaded the picker is
   dead anyway.

Net effect: **after loading an image there is no way to swap it out without reloading the page.**

Deliberately left unfixed — it's a behaviour change rather than a pure bug fix, and it needs a
decision about what re-uploading does to an in-progress backend session. Most likely: reset
transform points, camera, and session, and drop back to `ViewerState.Editing`.

## No pinch-to-zoom, so mobile has no zoom at all
`open` `medium` `src/lib/ImageEditor/Tool.ts` `src/lib/ImageEditor/ImageViewer.svelte`

The pinch handlers (`pinch`, `pinchOn`, `startPinch`) are commented out in `Tool.ts`, as is the
`use:pinch` block in `ImageViewer.svelte`. `pinch` is still imported from `svelte-gestures` but
unused. Wheel zoom is the only zoom, which touch devices don't have.

## No tool-specific cursors
`open` `low` `src/lib/ImageEditor/ImageViewer.svelte`

The editor shows the default cursor for every tool. The old `editorCursor` logic and its CSS were
removed as dead code. Reinstating it well means giving [`Tool`](Tool.ts.md) a `cursor` property
rather than special-casing tool names in the viewer.

## Toolbar placeholders are object literals, not Tool instances
`known` `medium` `src/lib/ImageEditor/ToolBar.svelte`

Zoom, Zoom Out, Zoom In, and Tour in `loadTools()` are `disabled: true` object literals cast to
`Tool`. This is why `loadTools()` needs `if (!_tool.setVps) continue;` before injecting the
store — a real instance would always have the method.

The guard is a trap for anyone adding a tool: an object literal silently skips it, never receives
the store, and does nothing when clicked. Making these real instances (or removing them until the
features exist) would let the guard go.

## Dead code in ToolBar
`open` `low` `src/lib/ImageEditor/ToolBar.svelte`

- `testFunc()` toggles the side panel and is never called — superseded by the `Settings` tool.
- `changesMade` is declared `false` and never assigned, so the branch it feeds (`"...and undo
  changes"` in the Upload tool's hover text) is unreachable.

## WhiteboardSession still carries its commented-out predecessor
`open` `low` `src/lib/ImageEditor/WhiteboardSession.ts`

The file opens with a large commented-out legacy `startProcess()` block, fully superseded by the
class below it. `getOptions()` is also live but has no callers — the frontend only ever writes
options.

Per [conventions](../../../conventions.md#comments), commented-out code shouldn't be committed.

## Sessions don't survive a page refresh
`known` `medium` `src/lib/ImageEditor/WhiteboardSession.ts`

`sessionId` is held only in the `WhiteboardSession` instance in memory; there's no route param
and no storage. Reloading `/whiteboard/s` starts over, losing the uploaded image and any
processing. The commented-out legacy code shows an earlier design that did
`goto('/whiteboard/s/<id>')`, which would have survived a refresh.

## Clipboard copy silently falls back to download
`known` `low` `src/lib/ImageEditor/ToolBar.svelte`

`copyToClipboard()` only writes to the clipboard when the processed blob is `image/png` and
`clipboard.write` succeeds — it needs a secure context and a user gesture. Otherwise it triggers
a download instead. If the backend ever returns a non-PNG, the Clipboard button will quietly
behave as Download with no explanation to the user.

## No auth or rate limiting on the API
`known` `medium` `src/lib/ImageEditor/WhiteboardSession.ts`

`POST /start` is open — anyone can create sessions and upload images. Nothing in the client
authenticates, and there's no client-side throttling. Whether this matters depends on the
backend, which is a separate repo.
