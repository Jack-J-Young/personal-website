# WhiteboardSession.ts

The client of the whiteboard backend, and the one place its API contract is encoded.

> **No longer in use.** The editor processes images locally through
> [`LocalWhiteboardSession`](README.md#who-does-the-processing); nothing constructs this class.
> It implements the same [`ProcessorSession`](README.md) interface, so it is one line away from
> being swapped back in, but it is untested from here on — see [issues](issues.md).

Base URL `https://api.jackyoung.xyz/whiteboard`, hard-coded. No auth.

## Contract

The backend lives in a separate repo; what follows is what this client observably sends and
expects, not authoritative server documentation.

| Method | Path | Request | Response |
|---|---|---|---|
| `POST` | `/start` | multipart: `image` (File), optional `quad_points` | session id, plain text |
| `GET` | `/s/:id/preview` | — | low-res preview image, used directly as `<img src>` |
| `POST` | `/s/:id/options` | multipart: `transparent`, `dark_mode` (`"true"`/`"false"`) | — |
| `GET` | `/s/:id/options` | — | JSON `{key, value}[]` |
| `GET` | `/s/:id/process` | — | full-resolution image blob |

`quad_points` is a flat comma-joined string — `"x1,y1,x2,y2,x3,y3,x4,y4"` — sent only when
exactly 4 points are set, in natural image pixels, ordered clockwise from the top-left. That
ordering is produced by [`Transform`](tools/README.md) and matters: see its notes on why the
starting corner is pinned rather than left to the angle sort.

## Design notes

**`setOptions` takes a `ProcessorSettings`, not a key/value list.** The client owns its own wire
format — the mapping from `darkMode` to `dark_mode` lives here and nowhere else. Two call sites
(`ToolBar.startPreview` and `SidePanel.setOption`) previously hand-built the same array and could
drift apart.

**`process()` returns a `Blob`, not an object URL.** An API client shouldn't mint DOM object
URLs, and returning the blob is what makes writing a real image to the clipboard possible.
`ToolBar` creates the object URL and stores both.

**`getPreviewUrl()` appends its own cache-buster.** The path is fixed for the life of a session,
so a re-fetch after an options change would otherwise be served from cache. This used to be
`SidePanel`'s job, which broke as soon as a second implementation returned object URLs — a `?`
suffix makes those invalid. Staleness is the session's problem, not the caller's.

**`sessionId` is held in memory only.** There is no route param and no storage, so a page refresh
loses the session — see [issues](issues.md).
