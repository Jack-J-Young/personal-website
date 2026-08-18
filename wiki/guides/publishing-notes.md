# Publishing notes from the vault

How a note written in Obsidian becomes a page on the site.

## The shape of it

```
vault (private)                     personal-website (public)
  └ push to `published`               └ scripts/content.mjs   ← cloned by the vault's CI
        │
        ├─ CI: filter → render → process → bundle → artifact
        └─ repository_dispatch ─▶ site CI: download bundle → build → artifact
                                                                       │
                                                          NixOS: pull newest, swap
```

**The site never sees the vault.** It consumes a bundle produced from it, and that bundle contains
only published material. That is the whole design: the boundary is a build step in a private repo,
not a filter running somewhere the private notes have already arrived.

Two consequences worth stating plainly:

- **The site's CI needs no credential for the vault** beyond `Actions: read`, which can download
  an artifact but cannot clone the repo or read its history.
- **The artifact is public if the site repo is** — and that is fine, because it is byte for byte
  what the website already serves. Artifact retention caps at 90 days on public repos and 400 on
  private ones, so the bundle is an artifact of the *vault's* workflow, not the site's. Otherwise a
  CSS-only rebuild three months after the last note would find nothing to build against.

**Publishing is deliberate.** The Obsidian Git plugin commits every few minutes, so the pipeline
runs on a `published` branch that gets fast-forwarded when a project is ready — not on `main`.
Without that, saving a sentence mid-thought would reprocess, rebuild and redeploy the site.

## Running it by hand

```bash
npm run content                          # against sample-vault/
npm run content -- --vault ../my-vault   # against a real one
```

It writes two gitignored trees:

| Path | What |
|---|---|
| `src/lib/projects/generated/` | `index.json` (the manifest) and `project/<slug>.json` |
| `static/project-media/<slug>/` | images, content-hashed |

Both are **wiped and rewritten** on every run. A step that only ever added would leave an
unpublished project on the site until someone noticed.

A fresh clone has neither, and that is deliberately survivable —
[`bundle.ts`](../src/lib/projects/README.md#reading-the-bundle) globs rather than imports, so the
site builds with no projects rather than failing to compile.

## The vault

```
projects/filament-dryer/
  index.md            ← its presence is what makes this folder a project
  first-print.md      ← an iteration note
  v2-hinge.md
  images/
```

- **A folder is a project if and only if it holds an `index.md`.** No index, no page — which is
  also why `images/` needs no special-casing to be excluded.
- **Other `.md` files beside it are iteration notes.** Each gets its own page as well as appearing
  inline on the project, because a note that cannot be linked to cannot be pointed at.
- **Only `projects/` is ever read.** Sparse-checkout keeps the rest of the vault out of the
  working tree; the script would ignore it regardless.

### Frontmatter

On `index.md`:

| Key | Meaning |
|---|---|
| `public` | **`true` publishes the project.** Anything else does not. |
| `title` | Falls back to the first `# heading`, then the folder name. |
| `summary` | The card's one-liner. Warned about if missing. |
| `status` | `wip`, `done` or `abandoned`. Anything else is warned about and treated as `wip`. |
| `date` | `yyyy-mm-dd`. Sorts the index, newest first. |
| `cover` | An image path. Falls back to the first image in `images/`. |

On a note: `title`, `date`, `order`, and `public: false` to hold one back.

**Notes inherit their project's decision.** A note cannot meaningfully be public while its project
is not, since the project page is its only entry point — so `public: false` is an opt-out rather
than `public: true` being required on every file.

`order` beats `date` so a note can be slotted between two others without renaming files and
breaking every link into them. That is the reason position is not in the filename.

## Why `public: true` and not `private: true`

Both give the default you want, and they fail in opposite directions. Under `public:`, a note with
broken YAML, a misspelt key or no frontmatter at all publishes **nothing**. Under `private:`, the
same corruption publishes **everything**.

That is the whole argument, and it is why
[`isPublished`](../src/lib/projects/README.md#the-publish-filter) compares against `true` rather
than testing for truthiness, and why it is the most heavily tested function in the repo.

## What the script does to a note

- **Renders markdown to HTML**, so the site ships no markdown parser. The external vault makes the
  client bundle smaller, not bigger.
- **Rewrites image paths** to the published, content-hashed URL and adds `loading="lazy"`.
- **Rewrites links** to sibling notes into real routes. A link it cannot resolve — to an
  unpublished note, say — **degrades to its own text**, leaking neither the note's existence nor a
  dead link.
- **Strips identifying JPEG metadata.** Exif, XMP, IPTC and comments go; JFIF, the ICC colour
  profile and the Adobe marker stay, because a decoder needs those and they say nothing about the
  photographer. Photos taken in a workshop carry the coordinates of a home.
- **Reports** what it published, what it skipped and why, and anything that looks like drift.

Raw HTML in a note is passed through rather than sanitised. The vault is written by one person and
nobody else can put markup in it, so escaping it would only stop that person from using it
deliberately.

## Obsidian settings that matter

**Attachments must go beside the note, not in a vault-wide folder.** *Files & Links → Default
location for new attachments → In subfolder under current folder*, named `images`. The default
dumps everything in one place, which breaks co-location — and fixing that after a vault has
accumulated means moving files and repairing every embed.

`[[wikilinks]]` and `![[embeds]]` are not handled yet; they pass through as text.
