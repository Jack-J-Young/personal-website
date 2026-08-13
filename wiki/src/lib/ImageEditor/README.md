# ImageEditor

The whiteboard editor, rendered by the [`/whiteboard/s`](../../routes/README.md) route. This is
the non-obvious part of the codebase: interaction is built from **tool classes** sharing a
**single store**, rather than from components holding their own state.

- [Tool.ts](Tool.ts.md) — the tool base class
- [ViewerProperties.ts](ViewerProperties.ts.md) — the store all editor state lives in
- [WhiteboardSession.ts](WhiteboardSession.ts.md) — the (now unused) backend API client
- `ProcessorSession.ts` — the interface the editor processes images through
- `LocalWhiteboardSession.ts` — the in-browser implementation, wrapping
  [src/lib/whiteboard/](../whiteboard/README.md)
- [tools/](tools/README.md) — the concrete tools
- [Issues](issues.md)

Guide: [adding a tool](../../../guides/adding-a-tool.md).

## Leaving the editor

The toolbar logo is the only way out — [the layout hides the site nav](../../routes/README.md)
on this route — and it discards the user's image, since nothing is stored anywhere. So it
confirms first, whenever `hasWorkInProgress` holds.

- **It is a real `<a href="/">`,** not a button calling `goto()`. Middle-click and ctrl-click
  keep working, and the anchor takes its accessible name from the logo's alt text. The click
  handler bails out on any modified click — those open a new tab and leave the editor exactly
  where it is, so there is nothing to confirm.
- **`hasWorkInProgress` lives in `ViewerProperties.ts`** so every "are you sure" in the editor
  asks the same question. It is simply "has an image been loaded", not "were changes made" — the
  dead `changesMade` flag in `ToolBar` is not the test and should not be revived for it.
- **[`ConfirmDialog`](../ui/README.md) is opened by a method, not an `open` prop.** A
  confirmation is a question asked once, not a state worth mirroring, and the method form cannot
  desync from the element — which a boolean provably can. Its own docs explain why.

A `beforeunload` handler would be the same question for reloads and tab closes. It doesn't exist;
it would want the same predicate.

## Styling

The editor is built from [the design system](../ui/README.md) and themes with the rest of the
site. It has no colours of its own — every value is a token — but it keeps its own components,
because a toolbar floating over someone's photograph is a different problem from a page.

Three things about it are worth knowing:

- **`Tool.icon` is a component, not a URL.** Icons are inline SVG drawn with `currentColor`, so
  `ToolIcon` colours them through ordinary CSS. They used to be `.svg` files with the palette
  baked into their `fill`, which is why the old selected and disabled states were faked with
  `brightness()` filters — the colour was somewhere CSS could not reach. Adding an icon means
  adding a component under `icons/`, not an asset.
- **`EditorButton` shares `buttonClasses` with the site's `Button`.** It does not restate the
  primary-action look, so the editor's main action cannot drift from every other primary action.
  All it adds is the trailing icon.
- **The canvas and the quad overlay use their own tokens** — `--editor-canvas`, and the
  deliberately unthemed `--marker` / `--marker-soft`. The reasoning is in
  [the ui README](../ui/README.md#tokens); the short version is that a backdrop behind a
  near-white image and a line drawn on top of an arbitrary photo are not surface colours.

The toolbar carries the site's [`ThemeToggle`](../ui/README.md) at the right, ahead of the
contextual action so the primary button stays pinned to the right edge rather than shifting as
the session advances. It is the same component the site nav uses and writes the same stored
preference — the editor is simply another place to reach it, which it has to be, since
[the site nav is hidden here](../../routes/README.md).

Layout was deliberately left alone — see [issues](issues.md).

## Who owns what

| File | Role |
|---|---|
| `ImageViewer.svelte` | Owns the store instance. File upload, image load, camera CSS, transform-point overlay. Delegates every gesture to the active tool. |
| `ToolBar.svelte` | Instantiates the tools, builds the toolbar groups, wires select/hover into the info text, owns the home link, the theme toggle, and the Preview → Process → Clipboard/Download buttons. |
| `SidePanel.svelte` | Processor settings checkboxes. Slides in and out from the left edge based on `vp.setting`. |
| `InfoBar.svelte` | Bottom status text — the `hoverText` of the hovered or active tool. |
| `ToolIcon.svelte` | One toolbar button. Dispatches `selectTool`/`hoverTool`; holds no state. |
| `TransformPoint.svelte`, `TransformRegion.svelte` | The corner markers and the quad overlay. |
| `EditorButton.svelte` | The primary action button at the right of the toolbar. |
| `icons/` | Inline SVG icon components drawn with `currentColor`. |
| `CameraControls.ts` | `centerCamera` and `fancyZoom`. |

The canonical store instance is created as the default value of the `vps` prop in
`ImageViewer.svelte`, bound upward into the page, and passed back down to `ToolBar`. Because
`ToolBar` receives it *after* mount, it guards with `$: vp = vps ? vps.ref() : null`.

## Camera

The camera is applied as CSS custom properties on `.editor-image-container`:

```css
transform: translate(calc(1 * var(--camX) * var(--zoom)), calc(-1 * var(--camY) * var(--zoom)))
           scale(var(--zoom));
```

**Note the `-1` on Y — the camera's Y axis is inverted relative to screen coordinates.** The pan
and zoom maths in `Tool.ts` and `CameraControls.ts` follows that convention (`camY` is added
where `camX` is subtracted). Preserve it, or fix it everywhere at once.

`centerCamera(vps)` fits the image to the viewport and is called on every image load.
`fancyZoom(delta, vps, changes)` zooms anchored at the cursor and returns a partial to merge.

## Session flow

`ViewerState` drives the toolbar's right-hand button:

```
Editing  --[Preview]-->  Preview  --[Process]-->  Processed
                            ^                          |
                            +----[settings changed]-----+
```

- **Editing** — local file only; the user may place 4 transform points.
- **Preview** — `startSession()` decodes and rectifies the image, options are pushed, and the
  displayed image is swapped for a low-resolution preview. `ToolBar.startPreview()` also
  **removes the Transform tool from the toolbar**, since the quad is baked into the stored image
  and cannot be adjusted afterwards.
- **Processed** — the full-resolution result, kept in the store as both a `Blob` (for the
  clipboard) and an object URL (for display and download).

Toggling a checkbox in `SidePanel` pushes the options and re-reads the preview URL. Each refresh
yields a distinct URL, so the `<img>` reloads on its own and clears `loading`.

**Changing a setting in `Processed` goes back to `Preview`** — the only backwards transition.
A processed image is valid only for the settings it was made with, and Clipboard and Download
read it straight out of the store, so keeping it would show one thing and hand the user another.
`refreshPreview` therefore clears `imageBlob` immediately, and releases the processed object URL
**after** the new preview has replaced it on screen — revoking it while it is still displayed
would blank the viewer mid-swap.

Re-entering Preview deliberately does *not* restore the Transform tool. The quad is baked into
the stored image at upload, so there would be nothing for it to edit; that changes with
[the two-image split](issues.md).

### Who does the processing

The editor talks to a [`ProcessorSession`](../whiteboard/README.md) and never learns which
implementation it holds. Two exist:

| | |
|---|---|
| `LocalWhiteboardSession` | **In use.** Runs [the pipeline](../whiteboard/README.md) in the browser. No network, no server state, and the photo never leaves the machine. |
| `WhiteboardSession` | The hosted API at `api.jackyoung.xyz`. Retained as a fallback and as the record of the API contract; nothing constructs it. |

Swapping them is one line in `ImageViewer.svelte`, which is the reason the interface exists.

`LocalWhiteboardSession` owns the browser-facing parts the pure pipeline deliberately avoids:
decoding the `File` (applying EXIF rotation, and compositing onto white so a transparent PNG
arrives flat), encoding results back to PNG, and minting object URLs. It also yields to the
browser before each long synchronous pass so the loading state can paint — **racing the frame
callback against a timer**, because frame callbacks never fire in a background tab and waiting on
one alone would hang processing until the user returned to it.

## Gotchas

- **`setting` vs `settings`** on `ViewerProperties` are different fields. `setting: boolean` is
  "is the side panel open"; `settings: ProcessorSettings` is the transparent/dark-mode config.
- **Transform points are in natural image pixels.** They come from `event.offsetX/Y` on
  `.image-click-handler`, which sits inside the CSS-transformed container, so the browser reports
  untransformed local coordinates — which equal source-image pixels because the `<img>` renders
  at natural size. They are sent to the API unscaled. Don't "correct" for zoom.
- **The toolbar is empty until the first image loads.** `ImageViewer` dispatches `firstLoad` on
  the first image load, and only then does the page call `ToolBar.loadTools()`.
