#!/usr/bin/env node

/**
 * Turns an Obsidian vault into the bundle the site builds against.
 *
 *     node scripts/content.mjs [--vault <path>]
 *
 * The vault is a separate private repo, so this never runs as part of `vite build` — it runs when
 * the vault changes, and the site consumes what it produced. See wiki/guides/publishing-notes.md.
 *
 * Two rules do the load-bearing work, and both are deliberately boring:
 *
 *   - a folder is a project if and only if it holds an `index.md`;
 *   - a project is published if and only if that file says `public: true`.
 *
 * The second is the only thing standing between a private note and the internet, so it is written
 * to fail closed: anything that is not literally `true` — a missing key, a typo, unparseable
 * frontmatter — publishes nothing.
 */

import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import matter from "gray-matter";
import { Marked } from "marked";

const require = createRequire(import.meta.url);

/** Bumped whenever the emitted JSON changes shape. The site refuses a bundle it does not match. */
export const CONTENT_SCHEMA = require("../src/lib/projects/schema.json").version;

const ROOT = resolve(fileURLToPath(import.meta.url), "../..");

/** The one folder of the vault that is ever read. Everything else is invisible by construction. */
const PROJECTS_DIR = "projects";
const INDEX_FILE = "index.md";
const IMAGES_DIR = "images";

const BUNDLE_DIR = join(ROOT, "src/lib/projects/generated");
const MEDIA_DIR = join(ROOT, "static/project-media");
const MEDIA_URL = "/project-media";

const IMAGE_TYPES = [".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif"];
const STATUSES = ["wip", "done", "abandoned"];

// ---------------------------------------------------------------------------
// The publish filter
// ---------------------------------------------------------------------------

/**
 * Whether a project's frontmatter opts it in to publication.
 *
 * `public: true` rather than `private: true` because of how the two fail. Absent, misspelt or
 * unparseable frontmatter publishes nothing here; under the opposite spelling the same corruption
 * would publish everything.
 */
export function isPublished(frontmatter) {
    return frontmatter?.public === true;
}

/**
 * Whether a note inside a published project stays published.
 *
 * Notes inherit their project's decision, because a note cannot meaningfully be public while the
 * project is not — the project page is its only entry point. `public: false` is the opt-out.
 */
export function noteIsPublished(frontmatter) {
    return frontmatter?.public !== false;
}

// ---------------------------------------------------------------------------
// Names, dates and ordering
// ---------------------------------------------------------------------------

// NFKD splits an accented letter into a plain one and a combining mark, so dropping every mark
// leaves "Sèvres" as "sevres" rather than "s-vres" once the catch-all below runs.
const COMBINING_MARKS = /\p{M}/gu;

export function slugify(name) {
    return name
        .normalize("NFKD")
        .replace(COMBINING_MARKS, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

/** Frontmatter wins, then a leading `# heading`, then the slug with its hyphens taken out. */
export function titleFrom(frontmatter, body, slug) {
    if (typeof frontmatter?.title === "string" && frontmatter.title.trim() !== "") {
        return frontmatter.title.trim();
    }

    let heading = body.match(/^#\s+(.+)$/m);
    if (heading) return heading[1].trim();

    let words = slug.replace(/-/g, " ");
    return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * A `yyyy-mm-dd` string, or null.
 *
 * YAML parses an unquoted date into a `Date` at UTC midnight, so this reads the UTC components
 * rather than the local ones — otherwise a note dated the 1st becomes the 31st west of Greenwich.
 */
export function isoDate(value) {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return value.toISOString().slice(0, 10);
    }

    if (typeof value === "string") {
        let match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (match) return match[0];
    }

    return null;
}

export function statusFrom(value) {
    return STATUSES.includes(value) ? value : null;
}

/**
 * Iteration notes oldest first, because a project's notes are a build story rather than a feed.
 *
 * `order` wins over `date` so a note can be slotted between two others without renaming files and
 * breaking every link into them, which is the whole reason the position is not in the filename.
 */
export function orderNotes(notes) {
    return [...notes].sort((a, b) => {
        if (a.order !== null && b.order !== null) return a.order - b.order;
        if (a.order !== null) return -1;
        if (b.order !== null) return 1;
        if (a.date !== null && b.date !== null) return a.date.localeCompare(b.date);
        if (a.date !== null) return -1;
        if (b.date !== null) return 1;
        return a.slug.localeCompare(b.slug);
    });
}

// ---------------------------------------------------------------------------
// Images
// ---------------------------------------------------------------------------

const JPEG_SOI = 0xd8;
const JPEG_SOS = 0xda;

/**
 * Whether a JPEG marker introduces a segment that says something about the photographer rather
 * than about the pixels.
 *
 * APP1 is Exif and XMP, which is where a phone puts the coordinates it was standing at. APP13 is
 * IPTC. COM is free text. The three kept back are the ones a decoder needs: APP0 is JFIF pixel
 * density, APP2 carries the ICC colour profile, and APP14 tells a decoder how to read the colour
 * transform on CMYK and YCCK files.
 */
function isIdentifyingSegment(marker) {
    let keep = [0xe0, 0xe2, 0xee];
    if (keep.includes(marker)) return false;
    return (marker >= 0xe1 && marker <= 0xef) || marker === 0xfe;
}

/**
 * The same JPEG with its identifying metadata segments removed, or the input untouched if it is
 * not a shape this understands.
 *
 * Leaving the bytes alone on anything unexpected is the point: a stripper that guesses turns a
 * photograph into a corrupt file, and the failure would not show up until someone looked at the
 * published page.
 */
export function stripJpegMetadata(bytes) {
    if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== JPEG_SOI) return bytes;

    let kept = [bytes.subarray(0, 2)];
    let at = 2;

    while (at + 3 < bytes.length) {
        if (bytes[at] !== 0xff) return bytes;

        let marker = bytes[at + 1];
        if (marker === 0xff) {
            at += 1;
            continue;
        }

        // Everything after the start of scan is entropy-coded image data with no segment
        // structure to walk, so it is copied through as one block.
        if (marker === JPEG_SOS) {
            kept.push(bytes.subarray(at));
            return Buffer.concat(kept);
        }

        let length = (bytes[at + 2] << 8) | bytes[at + 3];
        let end = at + 2 + length;
        if (length < 2 || end > bytes.length) return bytes;

        if (!isIdentifyingSegment(marker)) kept.push(bytes.subarray(at, end));
        at = end;
    }

    return bytes;
}

/** A stable, content-addressed filename, so published assets can be cached forever. */
function fingerprint(name, bytes) {
    let hash = createHash("sha256").update(bytes).digest("hex").slice(0, 8);
    let extension = extname(name);
    let stem = slugify(name.slice(0, name.length - extension.length)) || "image";
    return `${stem}.${hash}${extension.toLowerCase()}`;
}

// ---------------------------------------------------------------------------
// Markdown
// ---------------------------------------------------------------------------

function escapeAttribute(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function isAbsolute(href) {
    return /^(https?:)?\/\//.test(href) || href.startsWith("mailto:") || href.startsWith("#");
}

/** `./images/a.png`, `images/a.png` and `a.png` all name the same thing to a note author. */
export function normaliseTarget(href) {
    return decodeURI(href.trim())
        .replace(/^\.\//, "")
        .replace(/[?#].*$/, "");
}

/**
 * Renders one note's markdown to HTML.
 *
 * `assets` maps a vault-relative image path to its published URL and `notes` maps a sibling note's
 * slug to its route. A target in neither is not an error and not a dead link: images vanish and
 * links fall back to their own text, so an unpublished note referenced from a published one leaks
 * neither its existence nor a 404. Both are reported instead.
 */
export function renderMarkdown(body, { assets, notes, onMissing }) {
    let renderer = {
        image(token) {
            if (isAbsolute(token.href)) {
                return `<img src="${escapeAttribute(token.href)}"`
                    + ` alt="${escapeAttribute(token.text)}" loading="lazy" />`;
            }

            let url = assets.get(normaliseTarget(token.href));
            if (url === undefined) {
                onMissing("image", token.href);
                return "";
            }

            return `<img src="${escapeAttribute(url)}"`
                + ` alt="${escapeAttribute(token.text)}" loading="lazy" />`;
        },

        link(token) {
            let text = this.parser.parseInline(token.tokens);

            if (isAbsolute(token.href)) {
                return `<a href="${escapeAttribute(token.href)}"`
                    + ` rel="noreferrer noopener">${text}</a>`;
            }

            let url = notes.get(normaliseTarget(token.href).replace(/\.md$/, ""));
            if (url === undefined) {
                onMissing("link", token.href);
                return text;
            }

            return `<a href="${escapeAttribute(url)}">${text}</a>`;
        },
    };

    return new Marked({ gfm: true, renderer }).parse(body);
}

// ---------------------------------------------------------------------------
// Walking the vault
// ---------------------------------------------------------------------------

async function directories(path) {
    let entries = await readdir(path, { withFileTypes: true });
    return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
}

async function files(path) {
    let entries = await readdir(path, { withFileTypes: true }).catch(() => []);
    return entries.filter((entry) => entry.isFile()).map((entry) => entry.name);
}

/** Frontmatter and body, or null when the file cannot be read or parsed. */
async function readNote(path) {
    let raw = await readFile(path, "utf8").catch(() => null);
    if (raw === null) return null;

    try {
        let { data, content } = matter(raw);
        return { data, body: content };
    } catch {
        return null;
    }
}

class Report {
    constructor() {
        this.lines = [];
    }

    add(level, message) {
        this.lines.push({ level, message });
    }

    published(message) {
        this.add("published", message);
    }

    skipped(message) {
        this.add("skipped", message);
    }

    warn(message) {
        this.add("warning", message);
    }

    print() {
        let order = ["published", "skipped", "warning"];
        let marks = { published: "+", skipped: "-", warning: "!" };

        for (let level of order) {
            let lines = this.lines.filter((line) => line.level === level);
            if (lines.length === 0) continue;

            console.log(`\n${level}`);
            for (let line of lines) console.log(`  ${marks[level]} ${line.message}`);
        }
    }
}

async function publishImages(projectDir, slug, report) {
    let assets = new Map();
    let urls = [];

    let names = (await files(join(projectDir, IMAGES_DIR)))
        .filter((name) => IMAGE_TYPES.includes(extname(name).toLowerCase()))
        .sort();

    for (let name of names) {
        let source = join(projectDir, IMAGES_DIR, name);
        let bytes = await readFile(source);
        let published = stripJpegMetadata(bytes);
        let filename = fingerprint(name, published);

        await mkdir(join(MEDIA_DIR, slug), { recursive: true });
        await writeFile(join(MEDIA_DIR, slug, filename), published);

        let url = `${MEDIA_URL}/${slug}/${filename}`;
        assets.set(`${IMAGES_DIR}/${name}`, url);
        assets.set(name, url);
        urls.push(url);
    }

    if (names.length > 0 && urls.length !== names.length) {
        report.warn(`${slug}: ${names.length - urls.length} image(s) could not be published`);
    }

    return { assets, urls };
}

async function collectNotes(projectDir, slug, report) {
    let collected = [];
    let seen = new Set();

    for (let name of (await files(projectDir)).sort()) {
        if (extname(name).toLowerCase() !== ".md" || name === INDEX_FILE) continue;

        let note = await readNote(join(projectDir, name));
        if (note === null) {
            report.warn(`${slug}/${name}: unreadable, skipped`);
            continue;
        }

        if (!noteIsPublished(note.data)) {
            report.skipped(`${slug}/${name} — public: false`);
            continue;
        }

        let noteSlug = slugify(name.replace(/\.md$/i, ""));
        if (noteSlug === "" || seen.has(noteSlug)) {
            report.warn(`${slug}/${name}: slug "${noteSlug}" is empty or already taken, skipped`);
            continue;
        }
        seen.add(noteSlug);

        collected.push({
            slug: noteSlug,
            title: titleFrom(note.data, note.body, noteSlug),
            date: isoDate(note.data.date),
            order: typeof note.data.order === "number" ? note.data.order : null,
            body: note.body,
        });
    }

    return orderNotes(collected);
}

async function buildProject(projectsDir, folder, report) {
    let projectDir = join(projectsDir, folder);

    let index = await readNote(join(projectDir, INDEX_FILE));
    if (index === null) {
        report.skipped(`${folder} — no ${INDEX_FILE}, so not a project`);
        return null;
    }

    if (!isPublished(index.data)) {
        report.skipped(`${folder} — no public: true`);
        return null;
    }

    let slug = slugify(folder);
    if (slug === "") {
        report.warn(`${folder}: folder name produces an empty slug, skipped`);
        return null;
    }

    let { assets, urls } = await publishImages(projectDir, slug, report);
    let notes = await collectNotes(projectDir, slug, report);

    let routes = new Map(notes.map((note) => [note.slug, `/projects/${slug}/${note.slug}`]));
    let onMissing = (kind, href) => report.warn(`${slug}: ${kind} target "${href}" not found`);
    let render = (body) => renderMarkdown(body, { assets, notes: routes, onMissing });

    let status = statusFrom(index.data.status);
    if (status === null && index.data.status !== undefined) {
        report.warn(`${slug}: status "${index.data.status}" is not one of ${STATUSES.join(", ")}`);
    }

    let summary = typeof index.data.summary === "string" ? index.data.summary.trim() : "";
    if (summary === "") report.warn(`${slug}: no summary, so its card will be bare`);

    let cover = index.data.cover ? assets.get(normaliseTarget(index.data.cover)) : undefined;
    if (index.data.cover && cover === undefined) {
        report.warn(`${slug}: cover "${index.data.cover}" not found in ${IMAGES_DIR}/`);
    }

    report.published(`${slug} — ${notes.length} note(s), ${urls.length} image(s)`);

    return {
        slug,
        title: titleFrom(index.data, index.body, slug),
        summary,
        status: status ?? "wip",
        date: isoDate(index.data.date),
        cover: cover ?? urls[0] ?? null,
        noteCount: notes.length,
        html: render(index.body),
        images: urls,
        notes: notes.map((note) => ({
            slug: note.slug,
            title: note.title,
            date: note.date,
            order: note.order,
            html: render(note.body),
        })),
    };
}

function card(project) {
    let { slug, title, summary, status, date, cover, noteCount } = project;
    return { slug, title, summary, status, date, cover, noteCount };
}

/** Newest first on the index, undated last, because a card with no date has nothing to claim. */
function byNewest(a, b) {
    if (a.date !== null && b.date !== null) return b.date.localeCompare(a.date);
    if (a.date !== null) return -1;
    if (b.date !== null) return 1;
    return a.title.localeCompare(b.title);
}

async function run(vault) {
    let projectsDir = join(vault, PROJECTS_DIR);
    let folders = await directories(projectsDir).catch(() => null);

    if (folders === null) {
        console.error(`No ${PROJECTS_DIR}/ folder in ${vault}. Nothing to publish.`);
        process.exitCode = 1;
        return;
    }

    // Wiped rather than merged, so unpublishing a project removes it. A step that only ever adds
    // is a leak that takes a redeploy to notice.
    await rm(BUNDLE_DIR, { recursive: true, force: true });
    await rm(MEDIA_DIR, { recursive: true, force: true });
    await mkdir(join(BUNDLE_DIR, "project"), { recursive: true });
    await mkdir(MEDIA_DIR, { recursive: true });

    let report = new Report();
    let projects = [];

    for (let folder of folders.sort()) {
        let project = await buildProject(projectsDir, folder, report);
        if (project !== null) projects.push(project);
    }

    for (let project of projects) {
        await writeFile(
            join(BUNDLE_DIR, "project", `${project.slug}.json`),
            JSON.stringify(project),
        );
    }

    let manifest = {
        schema: CONTENT_SCHEMA,
        projects: projects.map(card).sort(byNewest),
    };
    await writeFile(join(BUNDLE_DIR, "index.json"), JSON.stringify(manifest, null, "\t"));

    report.print();
    console.log(`\n${projects.length} project(s) published from ${vault}`);
    if (projects.length === 0) console.log("Nothing was published — the site will have no projects.");
}

function vaultFrom(argv) {
    let flag = argv.indexOf("--vault");
    let given = flag === -1 ? null : argv[flag + 1];
    return resolve(ROOT, given ?? "sample-vault");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    await run(vaultFrom(process.argv.slice(2)));
}
