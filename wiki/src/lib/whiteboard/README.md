# whiteboard/

The whiteboard image processor, running in the browser. It replaces the hosted API at
`https://api.jackyoung.xyz/whiteboard`: the same pipeline runs on the user's machine, the photo
never leaves it, and there are no sessions to store or expire.

**This is live** — the editor processes through it via
[`LocalWhiteboardSession`](../ImageEditor/README.md#who-does-the-processing). Everything here is
pure functions over an `RgbaImage`; decoding, encoding and object URLs are that adapter's job,
which is what keeps this module testable in Node and movable into a worker.

This page is the specification. It describes what the deployed service actually does, where the
two upstream implementations disagree, and which behaviours this port reproduces deliberately.

- [Upstream implementations](#upstream-implementations)
- [The pipeline](#the-pipeline)
- [Differences between the two versions](#differences-between-the-two-versions)
- [Dead compute in the deployed version](#dead-compute-in-the-deployed-version)
- [Porting notes](#porting-notes)
- [Modules](#modules)
- [Verification](#verification)
- [Performance, and why not WebGPU](#performance-and-why-not-webgpu)
- [Issues](issues.md)

## Upstream implementations

Two separate repos, not two versions of one codebase. They share an idea and almost no code.

| | `whiteboard-imager-api` | `whiteboard-processor-api` |
|---|---|---|
| Language | Python | C++ |
| Libraries | Pillow, NumPy | OpenCV |
| Transport | Flask, one `POST /transform` | `cpp-httplib`, session-based REST |
| State | none — request in, image out | images and settings on disk under `sessionsdb/` |
| Deployed | no | **yes** — this is what the site talks to |
| Approach | subtract a colour-fringe map from the photo | estimate the background illumination and subtract it |

**The C++ one is the source of truth.** The endpoints in
[`WhiteboardSession.ts`](../ImageEditor/WhiteboardSession.ts.md) — `/start`, `/s/:id/preview`,
`/s/:id/process`, `/s/:id/options` — only exist there. The Python service is an earlier
prototype of a different algorithm that was abandoned; it is useful as a record of what was tried,
not as a reference for behaviour.

## The pipeline

All of it is 8-bit integer work. Sizes below are for the deployed C++ path.

### 1. Ingest — `POST /start`

The image is decoded to 8-bit colour, **alpha discarded**, then, if `quad_points` was supplied,
perspective-warped so the marked quadrilateral becomes the whole frame.

The output size is not the input size. It is derived from the quad's own edge lengths:

```
width  = mean(|p0 p1|, |p2 p3|)     // top and bottom edges
height = mean(|p0 p3|, |p1 p2|)     // left and right edges
```

so a whiteboard photographed at an angle comes out roughly at its true aspect ratio rather than
stretched back into the phone's frame. Sampling is bilinear; anything outside the source maps to
black.

The warped image is what gets stored as the session image. Every later call works from it, so
**the crop is baked in at upload time and cannot be adjusted afterwards** — which is the real
reason re-cropping in the editor requires starting a new session.

### 2. Background estimation

The core trick. A whiteboard photo is a bright, unevenly lit surface with dark marks on it; if
you can estimate the lighting, you can divide it out and get a flat white page.

The estimate is deliberately crude — a 32×32 thumbnail of the lighting:

1. **Point-sample a 32×32 grid.** Cell size is `floor(W/32) × floor(H/32)`, and each cell
   contributes exactly one pixel: the one at its centre. Not an average — a single sample.
   Because the cell size is floored, a strip up to 31px wide on the right and bottom edges is
   never sampled at all.
2. **5×5 median filter** the 32×32 map. This is what removes marks from the estimate: a pen
   stroke that happens to sit under a sampling point is a dark outlier among bright neighbours,
   and the median rejects it. It only works because the map is small enough that one cell is a
   large area of the real image.
3. **Bilinear upscale** back to full size, giving a smooth illumination field.

### 3. Flatten

```
output = clamp(input + (255 - background))
```

Saturating 8-bit add. Where the board is dark the complement is large and the pixel is lifted
towards white; where it is already bright, little changes. Marks survive because the median
filter kept them out of the background estimate, so they are darker than their local estimate and
stay dark relative to it.

### 4. Contrast stretch

A single global min/max taken across **all channels and all pixels**, turned into a 256-entry
lookup table mapping `[min, max]` onto `[0, 255]`. One LUT for the whole image, so it cannot
correct a local cast, and one dark pixel anywhere pins the low end.

### 5. Saturation

Convert to HSV, multiply S by 1.2, then min–max normalise S across the whole image, and convert
back. The normalise is doing far more work than the 1.2 — it stretches whatever saturation range
survives onto the full 0–255 scale, which is why marker colours come out vivid.

### 6. Optional passes

Applied in this order, both off by default.

**`transparent`** — builds an alpha channel from ink density, so the result can be dropped onto
any background:

```
a = min(r, g, b) > 240 ? 0 : 255 - min(r, g, b)
a = min(255, a * 255 / (peak / 2))      // peak = the largest a in the image
a = a < 40 ? 0 : a
```

Dividing by `peak / 2` means the top half of the alpha range clips to fully opaque, which is what
keeps strokes solid instead of ghostly; the `< 40` floor then snaps near-transparent noise to
fully clear so the edges do not haze.

**`dark_mode`** — inverts the image, then rotates hue by 180°. The inversion alone would turn a
red pen cyan; the rotation puts the hue back where it started, so only lightness flips. Colours
are preserved, the board becomes black.

### 7. Preview

`processPreview` is the same pipeline with the stored image first resized to **~600 000 pixels**
(aspect preserved). Nothing else differs — the preview is a genuine preview, not an approximation,
which is why it can be trusted for judging the settings.

## Differences between the two versions

Beyond transport and statefulness, the algorithms have almost nothing in common.

**Perspective handling.** Python warps into an output the same size as the input, so a corrected
image keeps the phone's aspect ratio and the board comes out stretched. C++ derives the output
size from the quad's edge lengths, so the board comes out roughly square-on. C++ is correct here.

**What gets removed.** Python computes a *colour-fringe* map — the sum of pairwise absolute
differences between the R, G and B channels — low-passes it with an FFT, and multiplies the image
by its complement, darkening anything strongly coloured. C++ ignores colour entirely and removes
an *illumination* estimate instead. These solve different problems: Python is chasing chromatic
aberration and coloured glare, C++ is chasing uneven lighting.

**Output.** Python returns the flattened image and stops. C++ continues into contrast, saturation
and the optional transparency and dark-mode passes, none of which exist in the Python version.

**Frequency-domain work.** Python's FFT low-pass is the only genuinely expensive operation in
either repo. C++ contains a transliteration of it — DFT, `fftshift`, a centred rectangular mask at
`map_ratio = 0.2`, inverse DFT — but does not use the result (see below). **Nothing in the
deployed pipeline needs an FFT**, which is the single most important fact for this port.

**Bugs the Python version has and C++ does not.** Both are in the fringe map, and both are
silent:

- `np.add(diff_a, diff_b, diff_c)` reads as "add three arrays". NumPy's third positional
  parameter is `out`, so this computes `diff_a + diff_b` and *overwrites* `diff_c` with the
  result. One of the three channel differences is discarded.
- The inverse FFT produces a complex array, and `.astype('uint8')` on it drops the imaginary part
  and wraps modulo 256 rather than clamping. The values that reach the contrast stretch are not
  the magnitudes the code appears to intend.

Neither matters for this port — none of that code is in the deployed path — but they are the
reason the Python output looks different from what its structure suggests it should.

## Dead compute in the deployed version

The C++ pipeline looks far more expensive than it is. Two large blocks are computed and thrown
away, and finding this is what makes a browser port straightforward.

**The entire FFT block in `CreateIgnoreMap` is discarded.** It builds `filtered_diff` through a
padded DFT, a shift, a mask, and an inverse DFT — and then the return value is built from
`color_diff`, the *unfiltered* input to all of that. Deleting every line between them would not
change the output.

**The ignore map, the Sobel edge detection and the masking are all discarded**, because their only
consumer ignores its argument:

```cpp
cv::Point getBackgroundColorCoord(cv::Mat& chunk) {
    return cv::Point(chunk.cols / 2, chunk.rows / 2);   // the centre, whatever the content
}
```

The header calls it a "dummy function to get background color coordinates (to be implemented as
needed)". It was never implemented. In the Python prototype the equivalent function searched each
chunk for its brightest pixel, which is what the masking was preparing the image *for*; in C++ the
search became a constant, so `CreateIgnoreMap`, `applyIgnoreMap`, `edgeDetection` and `applyMask`
form a chain whose result is used only to ask "how big is this chunk".

What survives is: sample a 32×32 grid, median filter it, upscale, subtract, stretch, saturate.
Per pixel that is a handful of arithmetic operations and two resamples — trivially cheap, and the
reason this does not need a server.

> The masking was not pointless in intent. Picking the *brightest* pixel per cell, having first
> masked out anything near an edge, is a better background estimate than the centre pixel: it is
> far less likely to land on a stroke. If output quality ever needs improving, restoring that is
> the first thing to try — but it must be a deliberate change with before/after comparisons, not
> something smuggled in during a port.

## Porting notes

**Channel order does not matter, which is not obvious.** OpenCV works in BGR and the browser works
in RGBA, so a faithful port would have to swap channels. It does not, because every stage that
could care is symmetric:

- the flatten, the LUT and the min/max are per-channel or over all channels equally;
- HSV saturation is `(max - min) / max` over the three channels, which does not depend on their
  order;
- dark mode's hue rotation is the one real risk. Reading RGB as BGR mirrors the hue wheel
  (`h → -h`), and mirroring commutes with a 180° rotation: `-(h + 180) ≡ (-h) + 180 (mod 360)`.
  So the two orderings give the same result.

The port therefore works in RGBA throughout and matches BGR output. Any *new* stage that touches
hue directly, or weights channels unequally (a luma conversion, say), breaks this and would need
an explicit swap.

**Conventions that have to be matched exactly**, or the output drifts from the deployed service in
ways that are hard to attribute later:

| Operation | Convention |
|---|---|
| Bilinear resize | Half-pixel centres: `src = (dst + 0.5) · scale − 0.5`, clamped at the edges |
| Median border | Replicate, not zero |
| LUT quantisation | Truncation toward zero, not rounding |
| HSV 8-bit range | H is 0–179, not 0–359; S and V are 0–255 |
| Chunk grid | `floor(W/32)`, remainder ignored — do not "fix" this to cover the edges |

The last one is a defect being reproduced on purpose. Covering the full width changes the
background estimate and therefore every output pixel, so it belongs in a separate change with
comparisons, not in the port.

**Alpha is dropped at ingest.** The deployed service decodes colour-only, so a PNG uploaded with
transparency loses it before anything else happens. The port does the same, so the `transparent`
option remains the only source of alpha.

**One deliberate deviation.** `boostSaturation` does not round-trip through HSV. Because hue and
brightness are untouched, scaling each channel's distance from the pixel's brightest channel is
algebraically the same operation, and it avoids quantising hue to 180 steps and back. It measures
*closer* to OpenCV than a faithful round trip would.

## Modules

Everything is a pure function over an `RgbaImage` — `{ data, width, height }`, structurally an
`ImageData`, so a canvas buffer passes straight in. Nothing touches the DOM, which is what lets
the whole pipeline be tested in Node and later moved into a worker unchanged.

| Module | Holds |
|---|---|
| `image.ts` | The `RgbaImage` type and pixel accessors |
| `resample.ts` | Bilinear `resize`, and `resizeToTargetPixels` for the preview budget |
| `perspective.ts` | Homography solving, `rectifiedSize`, `warpQuad` |
| `background.ts` | `sampleGrid`, `medianFilter`, `estimateBackground` |
| `tone.ts` | `flattenAgainstBackground`, `stretchContrast`, `boostSaturation` |
| `hsv.ts` | OpenCV's 8-bit HSV encoding, hue on 0–179 |
| `passes.ts` | The optional `transparent` and `dark_mode` passes |
| `pipeline.ts` | `processWhiteboard` and `processPreview` |
| `index.ts` | The public surface |

`warpQuad` solves the homography **output-to-source** rather than solving source-to-output and
inverting it. Same matrix, one less step, and it is the direction sampling actually needs.

## Verification

The pipeline was checked against OpenCV itself, not just against expectations. A Python
transliteration of `app.cpp` ran on a real whiteboard photograph, dumping every stage as raw
RGBA, and the port was compared to it channel by channel:

| Stage | Channels differing | Mean difference | Worst |
|---|---|---|---|
| Background estimate | 12.1% | 0.12 | 1 |
| Flatten | 0% | 0 | 0 |
| Contrast stretch | 0% | 0 | 0 |
| Saturation | 5.1% | 0.05 | 2 |
| Perspective warp | 4.9% | 0.05 | 3 |
| **End to end** | **12.8%** | **0.18** | **4** |

The warp also produced byte-identical output *dimensions*, which is the part most likely to drift.
Worst case is 4 levels out of 255 and the two outputs are visually indistinguishable; all of it
traces to float-versus-fixed-point rounding in the resamplers, and none of it to the algorithm.

Reproducing this needs Python with `opencv-python`, so it is a manual check rather than part of
`npm test`. The committed suite instead pins the behaviours that matter — the half-pixel
resampling convention, the median rejecting strokes, the grid's ignored edge strip, corner
placement under perspective, and end-to-end properties like "uneven lighting flattens and ink
stays dark".

## Performance, and why not WebGPU

Measured single-threaded, one core:

| Image | Pipeline | Perspective warp |
|---|---|---|
| 0.6MP (preview) | 34ms | 40ms |
| 3MP | 147ms | 212ms |
| 12MP (phone photo) | 503ms | 825ms |

**The premise that this is expensive was wrong**, and the [dead
compute](#dead-compute-in-the-deployed-version) is why: without the FFT that never fed anything,
what remains is a handful of arithmetic operations per pixel. Previews land at ~75ms, which is
interactive, and a worst-case 12MP export is a little over a second.

So WebGPU is not the next move. It would buy perhaps an order of magnitude on stages that are
already fast enough, in exchange for a shader implementation of every stage, a second code path
to keep in agreement with this one, a fallback for machines without it, and adapter-loss handling.
**Move the existing code into a Web Worker first** — that fixes the only real symptom, a frozen
tab during a full-resolution export, and it costs nothing but a message boundary because these are
already pure functions over transferable buffers.

If the GPU is ever justified, `estimateBackground` is the place to start: it is half the pipeline's
cost and almost all of that is the bilinear upscale from a 32×32 map, which is exactly what
texture sampling hardware does for free.
