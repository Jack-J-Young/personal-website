# Adding an editor tool

Tools in the [ImageEditor](../src/lib/ImageEditor/README.md) are classes, not components. Adding
one is three steps.

## 1. Add the icon

Drop an SVG in `src/lib/ImageEditor/icons/`. It gets imported as a path string, so nothing else
is needed.

## 2. Write the class

Create `src/lib/ImageEditor/tools/YourTool.ts` extending [`Tool`](../src/lib/ImageEditor/Tool.ts.md):

```ts
import { Tool } from "../Tool";
import your_icon from "$lib/ImageEditor/icons/your.svg";

export class YourTool extends Tool {
    constructor() {
        super({
            icon: your_icon,
            name: "Your Tool",
            hoverText: "What this does, shown in the info bar.",
            selectable: true
        });
    }
}
```

Override only the handlers you need. Remember that **the base class already implements panning**
— if dragging should do something else in your tool, override all three of `panOn`, `pan`, and
`panOff`, since `panOn` is what sets the panning flag. `Transform` is the worked example.

Set `selectable: true` if the tool is a *mode* (it stays active until deselected). Leave it off
if it's an *action* that fires and returns, like `Settings`.

Reach the editor state through `this.vps` — see [ViewerProperties](../src/lib/ImageEditor/ViewerProperties.ts.md).
It is null until `setVps()` runs, so guard with `if (!this.vps) return;` as the other tools do.

## 3. Register it

In `ToolBar.svelte`, import it, instantiate it alongside the others, and add it to the
appropriate group array inside `loadTools()`:

```ts
let yourTool: Tool = new YourTool();
```

Groups are the `Tool[][]` structure in `loadTools()` — each inner array is rendered as a cluster
with a separator between clusters.

## The one trap

`loadTools()` calls `setVps(vps)` on every entry, guarded by `if (!_tool.setVps) continue;`.

That guard exists because the disabled placeholder entries (Zoom, Tour) are plain object literals
cast to `Tool`, not real instances. **A real tool must be a class instance** — an object literal
will silently skip the guard, never receive the store, and do nothing when clicked.
