<script lang="ts">
    /**
     * Long-form HTML produced elsewhere — today, notes rendered from the vault by
     * `scripts/content.mjs`.
     *
     * This is the one component that styles descendants it does not render, because the whole
     * point is that the markup arrives as a string. `@tailwindcss/typography` supplies the rhythm
     * and the `--tw-prose-*` variables below hand it the design tokens, so prose themes with the
     * rest of the site rather than carrying a second palette.
     */
    export let html: string;
</script>

<div class="prose max-w-none">
    {@html html}
</div>

<style>
    /* Set on the wrapper rather than in app.css because these are inherited custom properties:
       the plugin's own `.prose :where(p)` rules read them from whatever ancestor defines them. */
    div {
        --tw-prose-body: var(--text-muted);
        --tw-prose-headings: var(--text);
        --tw-prose-lead: var(--text-muted);
        --tw-prose-links: var(--accent);
        --tw-prose-bold: var(--text);
        --tw-prose-counters: var(--text-muted);
        --tw-prose-bullets: var(--border);
        --tw-prose-hr: var(--border);
        --tw-prose-quotes: var(--text);
        --tw-prose-quote-borders: var(--accent);
        --tw-prose-captions: var(--text-muted);
        --tw-prose-code: var(--text);
        --tw-prose-pre-code: var(--text);
        --tw-prose-pre-bg: var(--surface-raised);
        --tw-prose-th-borders: var(--border);
        --tw-prose-td-borders: var(--border);
    }

    div :global(a) {
        text-decoration-thickness: 1px;
        text-underline-offset: 4px;
    }

    div :global(a:hover) {
        color: var(--accent-hover);
    }

    div :global(img) {
        border: 1px solid var(--border);
        border-radius: var(--radius);
        width: 100%;
    }

    div :global(pre) {
        border: 1px solid var(--border);
    }

    /* A table wide enough to overflow must scroll inside itself; letting it push the page sideways
       breaks every other block on a phone, not just the table. */
    div :global(table) {
        display: block;
        overflow-x: auto;
    }
</style>
