# Tool.ts

The base class every editor tool extends. It carries **both** the tool's presentation and its
default interaction behaviour — and that default behaviour *is* panning, which is the one thing
worth knowing before reading it.

## What it holds

| Field | Purpose |
|---|---|
| `icon` | Imported SVG path, shown in the toolbar |
| `name` | Label and `alt` text |
| `hoverText` | Shown in the [info bar](README.md) on hover; falls back to a TODO placeholder |
| `selectable` | Whether selecting it makes it the active tool, or just fires an action |
| `selected` | A `Writable<boolean>` so `ToolIcon` can react to selection |
| `disabled` | Greys the button out and blocks clicks |
| `vps` | The shared store, injected by `setVps()` — null until then |

## Handlers

`panOn` / `pan` / `panOff`, `zoom` / `wheel`, `onClick`, `onSelect` / `onDeselect`. Subclasses
override only what they need.

`ImageViewer` never calls a tool directly by type — it does `get(tool)` and forwards the event,
so a tool that doesn't override a handler silently inherits the base one.

## Pan lives in the base class

The base implementations of `panOn`/`pan`/`panOff` are a working pan: they record the camera
position and pointer position on pointer-down, then translate the camera by the delta, divided by
zoom so the image tracks the cursor at any scale.

This has two consequences:

- [`Pan`](tools/README.md) is pure configuration — it overrides nothing.
- Any tool that wants pan-on-drag gets it free, and any tool that *doesn't* want it must
  explicitly suppress it. `Transform` does exactly that, calling `super` only when the primary
  mouse button is up.

If you are adding a tool where dragging should mean something other than panning, override all
three pan handlers, not just `pan` — `panOn` is what sets `isPanning`.

## Zoom

`zoom()` branches on event type and currently only handles `WheelEvent`, delegating to `wheel()`,
which stores the cursor position as the anchor and merges the result of
[`fancyZoom`](README.md#camera) into the store.

The pinch branch is commented out, so **there is no touch zoom** — see [issues](issues.md).
