# ImageEditor

The whiteboard editor, rendered by the [`/whiteboard/s`](../../routes/README.md) route. This is
the non-obvious part of the codebase: interaction is built from **tool classes** sharing a
**single store**, rather than from components holding their own state.

- [Tool.ts](Tool.ts.md) — the tool base class
- [ViewerProperties.ts](ViewerProperties.ts.md) — the store all editor state lives in
- [WhiteboardSession.ts](WhiteboardSession.ts.md) — the backend API client
- [tools/](tools/README.md) — the concrete tools
- [Issues](issues.md)

Guide: [adding a tool](../../../guides/adding-a-tool.md).

## Who owns what

| File | Role |
|---|---|
| `ImageViewer.svelte` | Owns the store instance. File upload, image load, camera CSS, transform-point overlay. Delegates every gesture to the active tool. |
| `ToolBar.svelte` | Instantiates the tools, builds the toolbar groups, wires select/hover into the info text, owns the Preview → Process → Clipboard/Download buttons. |
| `SidePanel.svelte` | Processor settings checkboxes. Slides in and out from the left edge based on `vp.setting`. |
| `InfoBar.svelte` | Bottom status text — the `hoverText` of the hovered or active tool. |
| `ToolIcon.svelte` | One toolbar button. Dispatches `selectTool`/`hoverTool`; holds no state. |
| `TransformPoint.svelte`, `TransformRegion.svelte` | The corner markers and the red quad overlay. |
| `EditorButton.svelte` | The styled action button used at the right of the toolbar. |
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
```

- **Editing** — local file only; the user may place 4 transform points.
- **Preview** — `startSession()` uploads to the backend, options are pushed, and the displayed
  image is swapped for the server's low-res preview URL. `ToolBar.startPreview()` also **removes
  the Transform tool from the toolbar**, since the quad is now baked in server-side.
- **Processed** — the full-resolution blob from `/process`, kept in the store as both a `Blob`
  (for the clipboard) and an object URL (for display and download).

While in Preview, toggling a checkbox in `SidePanel` re-POSTs the options and re-requests the
preview with a `?<timestamp>` cache-buster, since the preview URL is fixed per session.

## Gotchas

- **`setting` vs `settings`** on `ViewerProperties` are different fields. `setting: boolean` is
  "is the side panel open"; `settings: ProcessorSettings` is the transparent/dark-mode config.
- **Transform points are in natural image pixels.** They come from `event.offsetX/Y` on
  `.image-click-handler`, which sits inside the CSS-transformed container, so the browser reports
  untransformed local coordinates — which equal source-image pixels because the `<img>` renders
  at natural size. They are sent to the API unscaled. Don't "correct" for zoom.
- **The toolbar is empty until the first image loads.** `ImageViewer` dispatches `firstLoad` on
  the first image load, and only then does the page call `ToolBar.loadTools()`.
