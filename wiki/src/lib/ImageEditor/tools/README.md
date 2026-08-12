# tools/

Concrete tools, each extending [`Tool`](../Tool.ts.md). Instantiated in `ToolBar.svelte` and
grouped in `loadTools()`. See the [adding a tool](../../../../guides/adding-a-tool.md) guide.

## Pan

Pure configuration — overrides nothing. Panning is the base class's default behaviour, so `Pan`
exists to give it a toolbar button and a name. It is also the fallback tool: deselecting any
other tool returns to it.

## Transform

Places the 4 corners of the perspective quad.

**Suppresses inherited panning while the primary mouse button is down**, so dragging places
points instead of moving the camera. It overrides all three pan handlers to do this, returning
early when `buttons == 1` on a mouse pointer, and calling `super` otherwise — which is what keeps
middle-drag and touch panning working.

`onClick` appends a point until there are 4, after which the click moves the *nearest* existing
point rather than resetting the quad.

Once 4 points exist they are ordered by `sortQuadPointsClockwiseFromTopLeft`, which sorts by
angle around the centroid and then rotates the result to start at the point minimising `x + y`.
The rotation matters: the angle sort alone gives a correct *winding* but an arbitrary *starting
corner*, and both `TransformRegion.svelte` (which renders assuming `[TL, TR, BR, BL]`) and the
backend's `quad_points` depend on which corner comes first. For an ordinary convex quad the sort
already happened to start at the top-left; the rotation makes that guaranteed rather than lucky.

## Settings

Not `selectable` — it's an action, not a mode. `onSelect` toggles `setting` in the store, which
slides the [side panel](../README.md) in and out, and flips its own `selected` store so the
button renders as pressed.
