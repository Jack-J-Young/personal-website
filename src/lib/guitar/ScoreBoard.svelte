<script lang="ts">
    import {
        DEFAULT_SORT,
        chordScores,
        sortScores,
        transitionScores,
        type ScoreColumn,
        type SortDirection,
        type Strum,
    } from "./practice";

    export let history: Strum[] = [];

    const COLUMNS: { key: ScoreColumn; label: string; title: string }[] = [
        { key: "landed", label: "Landed", title: "Strums that counted as the chord asked for" },
        { key: "error", label: "Error", title: "How often a named strum was the wrong chord" },
        { key: "best", label: "Best", title: "Fastest change into it" },
        { key: "average", label: "Avg", title: "Mean of every change into it" },
        { key: "last", label: "Last", title: "The most recent change into it" },
    ];

    let view: "chords" | "changes" = "chords";
    let column = DEFAULT_SORT.column;
    let direction = DEFAULT_SORT.direction;

    $: scores = view === "chords" ? chordScores(history) : transitionScores(history);
    $: rows = sortScores(scores, column, direction);

    /**
     * The bar behind each name is the row's best time against the slowest of them, so the row
     * holding you up most is always full width and the rest read against it. It is deliberately
     * not tied to whichever column is sorted: an absolute scale would need a maximum nobody can
     * name, and a bar that changed meaning on every click would say nothing at all.
     */
    $: slowest = Math.max(0, ...rows.map((row) => row.best ?? 0));

    /**
     * A repeated click flips the direction; a new column starts wherever the first look is useful.
     * Nobody clicks "Error" to find out which chord they never get wrong.
     */
    function sortBy(next: ScoreColumn) {
        if (next === column) direction = direction === "asc" ? "desc" : "asc";
        else [column, direction] = [next, next === "label" ? "asc" : "desc"];
    }

    function arrow(key: ScoreColumn, sorted: ScoreColumn, way: SortDirection): string {
        if (key !== sorted) return "";
        return way === "asc" ? "↑" : "↓";
    }

    function ariaSort(key: ScoreColumn, sorted: ScoreColumn, way: SortDirection) {
        if (key !== sorted) return "none";
        return way === "asc" ? "ascending" : "descending";
    }

    function seconds(ms: number | null): string {
        return ms === null ? "—" : `${(ms / 1000).toFixed(1)}s`;
    }

    function percent(share: number): string {
        return `${Math.round(share * 100)}%`;
    }
</script>

<div class="board">
    <div class="tabs" role="tablist" aria-label="What to group by">
        <button
            id="tab-chords"
            class="tab"
            class:on={view === "chords"}
            role="tab"
            aria-selected={view === "chords"}
            aria-controls="board-panel"
            on:click={() => (view = "chords")}>
            Chords
        </button>
        <button
            id="tab-changes"
            class="tab"
            class:on={view === "changes"}
            role="tab"
            aria-selected={view === "changes"}
            aria-controls="board-panel"
            on:click={() => (view = "changes")}>
            Changes
        </button>
    </div>

    <div
        id="board-panel"
        class="panel"
        role="tabpanel"
        aria-labelledby={view === "chords" ? "tab-chords" : "tab-changes"}>
        {#if rows.length === 0}
            <p class="empty">
                {#if view === "changes"}
                    A change needs a chord at each end, so nothing lands here until the second one.
                {:else}
                    Nothing played yet.
                {/if}
            </p>
        {:else}
            <table class="scores">
                <thead>
                    <tr>
                        <th scope="col" aria-sort={ariaSort("label", column, direction)}>
                            <button class="sort" on:click={() => sortBy("label")}>
                                {view === "chords" ? "Chord" : "Change"}
                                <span class="arrow">{arrow("label", column, direction)}</span>
                            </button>
                        </th>
                        {#each COLUMNS as heading (heading.key)}
                            <th
                                scope="col"
                                class="number"
                                title={heading.title}
                                aria-sort={ariaSort(heading.key, column, direction)}>
                                <button class="sort" on:click={() => sortBy(heading.key)}>
                                    {heading.label}
                                    <span class="arrow">
                                        {arrow(heading.key, column, direction)}
                                    </span>
                                </button>
                            </th>
                        {/each}
                    </tr>
                </thead>
                <tbody>
                    {#each rows as row (row.label)}
                        <tr>
                            <th scope="row">
                                {#if row.best !== null}
                                    <span class="bar" style="--share: {row.best / slowest}"></span>
                                {/if}
                                <span class="name">{row.label}</span>
                            </th>
                            <td class="number">{row.landed}</td>
                            <td class="number" class:muted={row.missed === 0}>
                                {percent(row.error)}
                            </td>
                            <td class="number">{seconds(row.best)}</td>
                            <td class="number">{seconds(row.average)}</td>
                            <td class="number muted">{seconds(row.last)}</td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        {/if}
    </div>
</div>

<style>
    .board {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .tabs {
        display: flex;
        gap: 0.25rem;
    }

    .tab {
        padding: 0.3125rem 0.75rem;
        border: 1px solid transparent;
        border-radius: var(--radius-sm);

        font-family: var(--font-mono);
        font-size: 0.75rem;
        color: var(--text-muted);

        transition:
            color 0.15s,
            background-color 0.15s;
    }

    .tab:hover {
        color: var(--text);
    }

    .tab.on {
        border-color: var(--border);
        background-color: var(--surface-raised);
        color: var(--text);
    }

    /* Six columns of monospace do not fit a phone, and the alternative to scrolling them is
       dropping one — every one of which is a number somebody asked for. */
    .panel {
        overflow-x: auto;
    }

    .empty {
        font-size: 0.8125rem;
        color: var(--text-muted);
    }

    .scores {
        width: 100%;
        border-collapse: collapse;
        font-family: var(--font-mono);
        font-size: 0.8125rem;
    }

    th,
    td {
        padding: 0.4375rem 0.5rem;
        text-align: left;
        font-weight: 400;
    }

    thead th {
        padding: 0;
        border-bottom: 1px solid var(--border);
    }

    .sort {
        width: 100%;
        padding: 0.4375rem 0.5rem;

        /* A button centres its text, and a heading that does not sit over its own column reads as
           belonging to the one beside it. */
        text-align: left;
        font-size: 0.6875rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--text-muted);
        white-space: nowrap;

        transition: color 0.15s;
    }

    .sort:hover {
        color: var(--text);
    }

    .number .sort {
        text-align: right;
    }

    /* The glyph keeps its space when the column is not the sorted one, so clicking through the
       headers does not shuffle the widths of all six. */
    .arrow {
        display: inline-block;
        width: 0.75em;
    }

    tbody th {
        position: relative;
        width: 100%;
        color: var(--text);
        white-space: nowrap;
    }

    tbody tr + tr th,
    tbody tr + tr td {
        border-top: 1px solid var(--border);
    }

    .bar {
        position: absolute;
        left: 0;
        top: 0.25rem;
        bottom: 0.25rem;
        width: calc(var(--share) * 100%);

        border-radius: var(--radius-sm);
        background-color: var(--accent);
        opacity: 0.15;
    }

    .name {
        position: relative;
    }

    .number {
        text-align: right;
        white-space: nowrap;
    }

    .muted {
        color: var(--text-muted);
    }
</style>
