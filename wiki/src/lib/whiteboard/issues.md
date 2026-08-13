# whiteboard/ issues

## Processing blocks the main thread
`open` `medium` `src/lib/whiteboard/pipeline.ts` `src/lib/ImageEditor/LocalWhiteboardSession.ts`

Everything is synchronous. Measured single-threaded, a 12MP phone photo costs roughly 500ms for
the pipeline plus 800ms for the perspective warp — over a second during which the tab cannot
paint or respond.

`LocalWhiteboardSession` yields before each pass so the loading spinner at least appears, but the
freeze itself remains. The preview path is fine (~75ms at 0.6MP, which is why toggling options
stays responsive), so this only really bites on the final full-resolution export.

The fix is a worker: the module is pure functions over transferable buffers, so it moves without
restructuring. Do that before reaching for the GPU — see the [README](README.md) on why WebGPU is
not the answer here.

## The preview upscales images smaller than its budget
`known` `low` `src/lib/whiteboard/pipeline.ts`

`resizeToTargetPixels` always resizes to ~600 000 pixels, so a small image is scaled *up* before
processing and the preview ends up blurrier than the original at more cost than processing it
directly would have been.

Faithful to the deployed service, which has the same unconditional resize. Clamping it to
downscale only is a safe improvement, but it changes preview output, so it wants its own change
rather than being folded in here.

## Background is sampled at cell centres rather than the brightest pixel
`known` `medium` `src/lib/whiteboard/background.ts`

Reproduced deliberately from the deployed service, where the "find the background colour" function
was stubbed to return the cell centre and never implemented. A centre sample can land directly on
a pen stroke, which drags the illumination estimate dark there and leaves a pale halo around
heavy marks in the output.

The median filter hides most of it, which is why this has never been urgent. Picking the
brightest pixel in each cell would be strictly better; it is a change to output quality, so it
needs before/after comparisons rather than being folded into a port.

## Grid sampling ignores a strip on the right and bottom edges
`known` `low` `src/lib/whiteboard/background.ts`

Cell size is `floor(W/32)`, so up to 31 pixels on each far edge are never sampled. Their
background estimate is extrapolated from the last full cell instead. Faithful to the deployed
service and covered by a test that pins the behaviour, so a "fix" fails loudly rather than
silently shifting every output pixel.

## Resampling differs from OpenCV by up to one level
`known` `low` `src/lib/whiteboard/resample.ts`

OpenCV's `INTER_LINEAR` uses fixed-point weights for 8-bit images; this port uses floats and
rounds. Measured against OpenCV on a real photo, 12% of channels differ, none by more than 1, and
the difference reaches at most 4 after the contrast and saturation stages amplify it.

Matching exactly would mean reimplementing OpenCV's fixed-point path for no visible gain. Noted
so that a future pixel-level comparison against the old API is not mistaken for a regression.
