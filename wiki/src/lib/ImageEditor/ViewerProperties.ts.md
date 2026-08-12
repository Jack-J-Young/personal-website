# ViewerProperties.ts

All editor state lives in one object, held in one store. There is no second source of truth —
components read from it and write partials back to it.

## `ViewerPropertiesStore`

A thin class wrapping a **single** `writable<ViewerProperties>`:

| Method | Use |
|---|---|
| `.get()` | Snapshot read, for imperative code (tools, event handlers) |
| `.set(partial)` | Shallow-merges a `Partial<ViewerProperties>` into the store |
| `.ref()` | The raw `Writable`, for `$vp.foo` in templates |

The shallow merge is why partial updates are safe to scatter around — `vps.set({ zoom })` leaves
everything else alone. It also means **nested objects are replaced, not merged**: updating one
processor setting requires spreading the existing `settings` object first, as
`SidePanel.setOption()` does.

## `ViewerProperties`

| Field | Notes |
|---|---|
| `camX`, `camY`, `zoom` | Camera. See the [Y-axis note](README.md#camera). |
| `mouseX`, `mouseY` | Last cursor position, used as the zoom anchor. |
| `imageWidth`, `imageHeight` | Natural dimensions of the loaded image. |
| `editor` | The editor `HTMLElement`, needed for `getBoundingClientRect`. Null until first load. |
| `transformPoints` | The perspective quad, in natural image pixels. |
| `imageRaw` | The `File` the user picked. Sent to `/start`. |
| `image` | What the `<img>` displays — a data URL, then a preview URL, then an object URL. |
| `imageBlob` | The processed image as a `Blob`, kept so the clipboard can write real image data. |
| `sessionApi` | The [`WhiteboardSession`](WhiteboardSession.ts.md) instance. |
| `state` | `ViewerState.Editing` \| `Preview` \| `Processed`. |
| `loading` | Drives the overlay. Set true before async work; **cleared by `onImageLoad`**, not by the code that set it. |
| `preview` | True once a server preview is displayed. Suppresses the transform overlay and locks the file input. |
| `setting` | Whether the side panel is open. **Not** the processor settings — see below. |
| `settings` | `ProcessorSettings` — `transparent` and `darkMode`. |

**`setting` and `settings` are different fields**, one letter apart, and both are live. `setting`
is panel visibility, toggled by the `Settings` tool; `settings` is the config sent to the backend.

## Adding a field

Add it to the `ViewerProperties` interface *and* to the default store literal in
`ImageViewer.svelte` — the literal is the only place the store is constructed, and TypeScript
will not let you forget, since the interface requires every field.
