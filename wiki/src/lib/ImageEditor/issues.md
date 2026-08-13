# ImageEditor issues

See the [wiki index](../../../README.md#issues) for the tag format.

## Replace the upload page with a dialog, and accept dropped files anywhere
`planned` `high` `src/lib/ImageEditor/ToolBar.svelte` `src/lib/ImageEditor/ImageViewer.svelte`

Today uploading is broken in two compounding ways:

1. The Upload entry in `loadTools()` is a plain object with no `onSelect`. In `selectTool()` it
   isn't `selectable`, so it falls to the `else` branch, which calls `newTool?.onSelect()` —
   which doesn't exist. **Clicking it is a no-op.** Only the full-viewport
   `<label for="input-image">` in `ImageViewer` opens the file picker, and the image covers it
   once one is loaded.
2. The file input is `disabled={$vp.image != null}`, so once any image is loaded the picker is
   dead anyway.

Net effect: after loading an image there is no way to swap it out without reloading the page.

**The agreed design:**

- A **dialog** for choosing a file, replacing the current bare full-viewport upload page.
- It **opens by default** when the editor is opened with no image, so the dialog *is* the empty
  state rather than a separate screen.
- The toolbar's Upload button opens it at any time, which is what finally gives that button a
  job.
- **Drag and drop is live over the whole page**, always — not only while the dialog is open.
- Dropping or picking a file **while an image is already loaded asks for confirmation first**.
  Only on confirm does it load.

Loading a new image has to reset `transformPoints`, the camera, the session, `imageBlob`, and
`state` back to `Editing` — that was the open question that kept this unfixed, and the
confirmation step is what makes discarding that work acceptable.

Details that are easy to get wrong:

- `dragover` **must** call `preventDefault()`, or the browser navigates away to the dropped file
  and the editor is simply gone.
- Both the `disabled` binding on the input and the full-viewport `<label>` have to go; the label
  currently makes the entire viewer a file-picker trigger, which will fight the dialog.
- Reject non-image drops explicitly rather than letting them fail inside `createImageBitmap`.
- Use a real `<dialog>` (or a focus-trapped overlay) so Escape and focus handling come for free
  — but Escape must not dismiss it when there is no image behind it, since that leaves the user
  staring at an empty editor with no way back.

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

## Split the editor into an input image and an output image
`planned` `high` `src/lib/ImageEditor/ViewerProperties.ts` `src/lib/ImageEditor/ImageViewer.svelte` `src/lib/ImageEditor/LocalWhiteboardSession.ts`

`ViewerProperties` holds a single `image: string | null` that is **swapped in place** as the
session advances: the original data URL, then the preview object URL, then the processed one.
There is only ever one image, and it is whichever stage you last reached.

That single slot is the root of several separate complaints. The quad is applied once inside
`startSession` and baked into the stored image, so `ToolBar.startPreview()` has to *remove the
Transform tool from the toolbar* — the crop cannot be adjusted afterwards because the thing it
would adjust no longer exists. There is also nothing to compare against, since the input is gone
the moment a preview arrives.

Wanted: two images side by side in the model.

- **Input** — the decoded source, plus its quad, both editable at any time.
- **Output** — the result: the low-resolution preview, and eventually the full-resolution
  processed image.

What that unlocks: Transform stays available for the whole session; moving a corner re-renders
the output instead of being impossible; the [Processed → Preview
transition](#changing-a-setting-after-processing-should-drop-back-to-preview) becomes a natural
consequence rather than a special case; and a before/after or side-by-side view becomes possible
at all.

Implementation notes:

- `LocalWhiteboardSession` currently stores the **rectified** image and forgets the source. It
  needs to hold the decoded source and treat the rectified image as a cache, invalidated when the
  quad changes.
- **Do not re-warp on every pointer move.** `warpQuad` is ~800ms at 12MP, so re-rectifying while
  a corner is being dragged would be unusable. Re-warp on release, or warp a downscaled copy for
  the live feedback.
- Every consumer of `vp.image` — `ImageViewer`, `ToolBar`, `SidePanel`, and the tools — has to
  say which of the two it means. That is the bulk of the work and it is mechanical, but it is
  also the point: right now none of them can say.

This supersedes the "the crop is baked in at upload time" limitation noted in
[the pipeline docs](../whiteboard/README.md#1-ingest--post-start).

## Bring the editor onto the design system
`planned` `medium` `src/lib/ImageEditor/ToolBar.svelte` `src/lib/ImageEditor/EditorButton.svelte` `src/lib/ImageEditor/ToolIcon.svelte` `src/lib/ImageEditor/SidePanel.svelte` `src/lib/ImageEditor/ImageViewer.svelte`

The editor predates [`src/lib/ui/`](../ui/README.md) and was deliberately left alone during the
restyle. It carries its own hardcoded palette (`#7979FF`, `#ADAFB2` separators, inline
`box-shadow` literals), its own `EditorButton` and `ToolIcon` rather than the shared primitives,
and **no theme support at all** — it is dark-only, so a visitor on the light theme moves from a
light site into a dark editor.

The work, roughly in order:

1. **Tokens first.** Replace the hardcoded hex with the [design
   tokens](../ui/README.md#tokens). This is mostly mechanical and the palettes already agree —
   the site's dark accent *is* the editor's `#7979FF`, nudged, chosen at the time precisely so
   this step would be cheap.
2. **Then components.** `EditorButton` should either compose `Button` or share its classes
   through a `buttonClasses`-style function, following [the pattern that keeps `Button` and
   `ButtonLink` from drifting](../ui/README.md#variant-or-new-component).
3. **Then icons.** `ToolIcon` takes image assets; the site uses inline `currentColor` SVG
   components under `ui/icons/` precisely so they theme themselves. Converting them removes the
   last thing that would need per-theme handling.

Two constraints not to lose along the way:

- The editor is **full-bleed**, and [the layout hides the site chrome](../../routes/README.md)
  on `/whiteboard/s` because the editor's own toolbar carries a home button. Adopting the design
  system must not mean adopting the site nav.
- Editor surfaces sit **over an arbitrary image**, so they likely need translucent variants. Note
  that Tailwind 3 silently drops opacity modifiers on `var()` colours — that is why
  `--bg-translucent` exists rather than `bg-bg/85`, and any new translucent surface needs its own
  token the same way.

## The remote session client is dead code
`open` `medium` `src/lib/ImageEditor/WhiteboardSession.ts`

Nothing constructs `WhiteboardSession` since the editor moved to
[the local pipeline](../whiteboard/README.md). It is kept as a fallback and as the record of the
API contract, but it is unverified from here on — nothing exercises it, and the hosted service it
targets is not reliably up.

It also carries two smaller problems of its own: a large commented-out legacy `startProcess()`
block, which [conventions](../../../conventions.md#comments) say shouldn't be committed, and a
`getOptions()` that calls `response.json()` when the backend returns `key=value` lines as
`text/plain` — it would reject on the first character, and has never thrown only because nothing
calls it.

Decide whether the fallback is worth keeping. If it isn't, deleting the file removes all three
problems at once.

## Sessions don't survive a page refresh
`known` `medium` `src/lib/ImageEditor/LocalWhiteboardSession.ts`

The decoded image lives only in the `LocalWhiteboardSession` instance in memory; there is no
route param and no storage. Reloading `/whiteboard/s` starts over, losing the uploaded image and
any processing.

Now that processing is local this is more fixable than it was — there is no server session to
reattach to, just an image to keep. Persisting it would mean writing the decoded image to
IndexedDB and restoring it on load.

## Clipboard copy silently falls back to download
`known` `low` `src/lib/ImageEditor/ToolBar.svelte`

`copyToClipboard()` only writes to the clipboard when the processed blob is `image/png` and
`clipboard.write` succeeds — it needs a secure context and a user gesture. Otherwise it triggers
a download instead. If the backend ever returns a non-PNG, the Clipboard button will quietly
behave as Download with no explanation to the user.

## No auth or rate limiting on the API
`known` `low` `src/lib/ImageEditor/WhiteboardSession.ts`

`POST /start` is open — anyone can create sessions and upload images, with no client-side
authentication or throttling. Now only a concern for the hosted service itself: the site no
longer calls it, so this cannot be reached from here.
