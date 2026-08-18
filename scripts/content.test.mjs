import { describe, expect, it } from "vitest";

import {
    isoDate,
    isPublished,
    noteIsPublished,
    normaliseTarget,
    orderNotes,
    renderMarkdown,
    slugify,
    statusFrom,
    stripJpegMetadata,
    titleFrom,
} from "./content.mjs";

describe("the publish filter", () => {
    // This is the only thing between a private note and the internet, so the cases that matter
    // are the malformed ones rather than the happy path.
    it("publishes a project that says public: true", () => {
        expect(isPublished({ public: true })).toBe(true);
    });

    it("refuses anything that is not literally true", () => {
        expect(isPublished({})).toBe(false);
        expect(isPublished({ public: false })).toBe(false);
        expect(isPublished({ public: "true" })).toBe(false);
        expect(isPublished({ public: 1 })).toBe(false);
        expect(isPublished({ Public: true })).toBe(false);
        expect(isPublished({ publish: true })).toBe(false);
    });

    it("refuses frontmatter that could not be read at all", () => {
        expect(isPublished(null)).toBe(false);
        expect(isPublished(undefined)).toBe(false);
    });

    it("lets a note inherit its project, and opt out", () => {
        expect(noteIsPublished({})).toBe(true);
        expect(noteIsPublished({ title: "x" })).toBe(true);
        expect(noteIsPublished({ public: false })).toBe(false);
    });

    it("does not let a note opt out by accident", () => {
        // Only `false` hides a note. Anything else is a typo, and a typo that silently unpublished
        // work would be as bad as one that published it.
        expect(noteIsPublished({ public: "false" })).toBe(true);
        expect(noteIsPublished({ public: 0 })).toBe(true);
    });
});

describe("slugify", () => {
    it("lowercases and hyphenates", () => {
        expect(slugify("Filament Dryer")).toBe("filament-dryer");
        expect(slugify("v2 hinge")).toBe("v2-hinge");
    });

    it("folds accents rather than turning them into separators", () => {
        expect(slugify("Sèvres")).toBe("sevres");
        expect(slugify("naïve café")).toBe("naive-cafe");
    });

    it("collapses punctuation and trims the ends", () => {
        expect(slugify("  --Kiln: controller!! ")).toBe("kiln-controller");
    });

    it("returns an empty string when nothing usable is left", () => {
        expect(slugify("!!!")).toBe("");
    });
});

describe("titleFrom", () => {
    it("prefers frontmatter", () => {
        expect(titleFrom({ title: "Given" }, "# Heading", "slug")).toBe("Given");
    });

    it("falls back to the first heading", () => {
        expect(titleFrom({}, "intro\n\n# Heading\n\nmore", "slug")).toBe("Heading");
    });

    it("falls back to the slug last", () => {
        expect(titleFrom({}, "no heading here", "desk-lamp")).toBe("Desk lamp");
    });

    it("ignores a blank frontmatter title", () => {
        expect(titleFrom({ title: "   " }, "# Heading", "slug")).toBe("Heading");
    });
});

describe("isoDate", () => {
    it("reads a YAML date", () => {
        expect(isoDate(new Date("2026-03-02T00:00:00Z"))).toBe("2026-03-02");
    });

    it("keeps the day a note was dated, not the local one", () => {
        // YAML gives UTC midnight. Reading local components would move this back a day anywhere
        // west of Greenwich, so a note dated the 1st would publish as the 31st.
        expect(isoDate(new Date("2026-01-01T00:00:00Z"))).toBe("2026-01-01");
    });

    it("reads a quoted string", () => {
        expect(isoDate("2026-03-02")).toBe("2026-03-02");
        expect(isoDate(" 2026-03-02T10:00:00 ")).toBe("2026-03-02");
    });

    it("returns null for anything else", () => {
        expect(isoDate(undefined)).toBeNull();
        expect(isoDate("last tuesday")).toBeNull();
        expect(isoDate(new Date("nonsense"))).toBeNull();
    });
});

describe("statusFrom", () => {
    it("accepts the three it knows", () => {
        expect(statusFrom("wip")).toBe("wip");
        expect(statusFrom("done")).toBe("done");
        expect(statusFrom("abandoned")).toBe("abandoned");
    });

    it("rejects everything else so the caller can report it", () => {
        expect(statusFrom("finished")).toBeNull();
        expect(statusFrom(undefined)).toBeNull();
    });
});

describe("orderNotes", () => {
    let note = (slug, order = null, date = null) => ({ slug, order, date });

    it("puts explicit order first", () => {
        let sorted = orderNotes([note("c", 3), note("a", 1), note("b", 2)]);
        expect(sorted.map((n) => n.slug)).toEqual(["a", "b", "c"]);
    });

    it("falls back to date, oldest first", () => {
        let sorted = orderNotes([
            note("late", null, "2026-05-01"),
            note("early", null, "2026-01-01"),
        ]);
        expect(sorted.map((n) => n.slug)).toEqual(["early", "late"]);
    });

    it("ranks an ordered note above a merely dated one", () => {
        let sorted = orderNotes([note("dated", null, "2020-01-01"), note("ordered", 9)]);
        expect(sorted.map((n) => n.slug)).toEqual(["ordered", "dated"]);
    });

    it("puts notes with neither last, by slug", () => {
        let sorted = orderNotes([note("z"), note("a"), note("dated", null, "2026-01-01")]);
        expect(sorted.map((n) => n.slug)).toEqual(["dated", "a", "z"]);
    });

    it("does not mutate its input", () => {
        let given = [note("b", 2), note("a", 1)];
        orderNotes(given);
        expect(given.map((n) => n.slug)).toEqual(["b", "a"]);
    });
});

describe("normaliseTarget", () => {
    it("strips a leading ./ and any fragment", () => {
        expect(normaliseTarget("./images/a.png")).toBe("images/a.png");
        expect(normaliseTarget("first-print#setup")).toBe("first-print");
    });

    it("decodes the escaping a markdown editor adds to spaces", () => {
        expect(normaliseTarget("images/two%20words.png")).toBe("images/two words.png");
    });
});

describe("renderMarkdown", () => {
    let render = (body, { assets = [], notes = [] } = {}) => {
        let missing = [];
        let html = renderMarkdown(body, {
            assets: new Map(assets),
            notes: new Map(notes),
            onMissing: (kind, href) => missing.push(`${kind}:${href}`),
        });
        return { html, missing };
    };

    it("points an image at its published URL and lazy-loads it", () => {
        let { html } = render("![alt](images/a.png)", {
            assets: [["images/a.png", "/project-media/p/a.1234abcd.png"]],
        });
        expect(html).toContain('src="/project-media/p/a.1234abcd.png"');
        expect(html).toContain('loading="lazy"');
        expect(html).toContain('alt="alt"');
    });

    it("drops an image it cannot resolve, and says so", () => {
        let { html, missing } = render("![alt](images/gone.png)");
        expect(html).not.toContain("<img");
        expect(missing).toEqual(["image:images/gone.png"]);
    });

    it("rewrites a link to a sibling note", () => {
        let { html } = render("see the [first print](first-print)", {
            notes: [["first-print", "/projects/p/first-print"]],
        });
        expect(html).toContain('href="/projects/p/first-print"');
    });

    it("accepts the .md a wikilink-free Obsidian link carries", () => {
        let { html } = render("[x](./first-print.md)", {
            notes: [["first-print", "/projects/p/first-print"]],
        });
        expect(html).toContain('href="/projects/p/first-print"');
    });

    it("degrades a link it cannot resolve to its own text", () => {
        // An unpublished note referenced from a published one must leak neither its existence
        // nor a dead link, so the anchor goes and the words stay.
        let { html, missing } = render("see the [supplier prices](supplier-prices)");
        expect(html).not.toContain("<a ");
        expect(html).toContain("see the supplier prices");
        expect(missing).toEqual(["link:supplier-prices"]);
    });

    it("leaves absolute links and images alone", () => {
        let { html, missing } = render("[site](https://example.com) ![x](https://example.com/a.png)");
        expect(html).toContain('href="https://example.com"');
        expect(html).toContain('rel="noreferrer noopener"');
        expect(html).toContain('src="https://example.com/a.png"');
        expect(missing).toEqual([]);
    });

    it("escapes quotes in alt text rather than breaking out of the attribute", () => {
        let { html } = render('![a "quoted" thing](images/a.png)', {
            assets: [["images/a.png", "/m/a.png"]],
        });
        expect(html).not.toMatch(/alt="a "quoted"/);
        expect(html).toContain("&quot;");
    });

    it("renders GitHub-flavoured tables", () => {
        let { html } = render("| a | b |\n|---|---|\n| 1 | 2 |");
        expect(html).toContain("<table>");
    });
});

describe("stripJpegMetadata", () => {
    let segment = (marker, payload) => {
        let bytes = Buffer.from(payload);
        let length = bytes.length + 2;
        return Buffer.concat([Buffer.from([0xff, marker, length >> 8, length & 0xff]), bytes]);
    };

    let scan = Buffer.from([0x11, 0x22, 0x33, 0xff, 0xd9]);

    let jpeg = (...segments) =>
        Buffer.concat([Buffer.from([0xff, 0xd8]), ...segments, segment(0xda, [0, 1]), scan]);

    it("removes the Exif segment a phone puts its coordinates in", () => {
        let source = jpeg(segment(0xe1, "Exif\0\0GPS 51.5074,-0.1278"));
        let stripped = stripJpegMetadata(source);

        expect(stripped.includes("GPS 51.5074")).toBe(false);
        expect(stripped.length).toBeLessThan(source.length);
    });

    it("removes XMP, IPTC and free-text comments too", () => {
        let source = jpeg(
            segment(0xe1, "http://ns.adobe.com/xap/1.0/\0creator"),
            segment(0xed, "Photoshop 3.0\0IPTC city"),
            segment(0xfe, "shot at home"),
        );
        let stripped = stripJpegMetadata(source);

        expect(stripped.includes("creator")).toBe(false);
        expect(stripped.includes("IPTC city")).toBe(false);
        expect(stripped.includes("shot at home")).toBe(false);
    });

    it("keeps the segments a decoder needs", () => {
        // Dropping the ICC profile would shift the colours of every wide-gamut photo, and
        // dropping the Adobe marker breaks CMYK decoding. Neither says anything about the
        // photographer.
        let source = jpeg(
            segment(0xe0, "JFIF\0"),
            segment(0xe2, "ICC_PROFILE\0body"),
            segment(0xee, "Adobe\0transform"),
            segment(0xe1, "Exif\0\0secret"),
        );
        let stripped = stripJpegMetadata(source);

        expect(stripped.includes("JFIF")).toBe(true);
        expect(stripped.includes("ICC_PROFILE")).toBe(true);
        expect(stripped.includes("Adobe")).toBe(true);
        expect(stripped.includes("secret")).toBe(false);
    });

    it("keeps the image itself byte for byte", () => {
        let source = jpeg(segment(0xdb, [1, 2, 3, 4]), segment(0xe1, "Exif\0\0secret"));
        let stripped = stripJpegMetadata(source);

        expect(stripped.subarray(0, 2)).toEqual(Buffer.from([0xff, 0xd8]));
        expect(stripped.subarray(stripped.length - scan.length)).toEqual(scan);
        expect(stripped.includes(Buffer.from([0xff, 0xdb, 0x00, 0x06, 1, 2, 3, 4]))).toBe(true);
    });

    it("returns anything it does not understand untouched", () => {
        // A stripper that guesses corrupts photographs, and nobody would find out until the page
        // was already published.
        let png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
        expect(stripJpegMetadata(png)).toBe(png);

        let truncated = Buffer.from([0xff, 0xd8, 0xff, 0xe1, 0xff, 0xff, 1, 2]);
        expect(stripJpegMetadata(truncated)).toBe(truncated);

        let tiny = Buffer.from([0xff, 0xd8]);
        expect(stripJpegMetadata(tiny)).toBe(tiny);
    });
});
