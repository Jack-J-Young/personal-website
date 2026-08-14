<script lang="ts">
    import { CHORD_SETS, chordsIn, isDrillable, type ChordSet } from "./practice";

    /** Labels of every chord the drill may ask for. */
    export let selected: string[] = [];

    /** Called after a change, so the drill can redraw a prompt that is no longer in the pool. */
    export let changed: () => void = () => {};

    $: chosen = new Set(selected);
    $: counts = new Map(CHORD_SETS.map((set) => [set.id, countOn(set, chosen)]));

    function countOn(set: ChordSet, on: Set<string>): number {
        return set.chords.filter((chord) => on.has(chord.label)).length;
    }

    /**
     * Refused rather than disabled, because a disabled control gives no reason and this one has
     * one: below two chords there is no change left to time.
     */
    function commit(next: string[], undo?: () => void) {
        if (!isDrillable(chordsIn(next))) {
            undo?.();
            return;
        }

        selected = next;
        changed();
    }

    /**
     * The set box turns its whole group on, or off if it is already fully on. It is a shortcut
     * rather than a separate setting — what the drill asks for is the chords, and a set that also
     * had to be ticked would be a second thing to get wrong.
     */
    function toggleSet(set: ChordSet, box: HTMLInputElement) {
        let labels = set.chords.map((chord) => chord.label);
        let all = counts.get(set.id) === set.chords.length;

        let next = all
            ? selected.filter((label) => !labels.includes(label))
            : [...selected, ...labels.filter((label) => !chosen.has(label))];

        // The browser has already flipped the box and cleared its indeterminate mark, and Svelte
        // only repaints what its own computed value says has changed — which after a refusal is
        // nothing. So a refusal puts the box back from the state it failed to change.
        commit(next, () => {
            let on = counts.get(set.id) ?? 0;
            box.checked = on === set.chords.length;
            box.indeterminate = on > 0 && on < set.chords.length;
        });
    }

    function toggleChord(label: string) {
        commit(
            chosen.has(label)
                ? selected.filter((other) => other !== label)
                : [...selected, label],
        );
    }
</script>

<fieldset class="sets">
    <legend>Chords to drill</legend>

    {#each CHORD_SETS as set (set.id)}
        {@const on = counts.get(set.id) ?? 0}
        <div class="set">
            <label class="head">
                <input
                    type="checkbox"
                    checked={on === set.chords.length}
                    indeterminate={on > 0 && on < set.chords.length}
                    on:change={(event) => toggleSet(set, event.currentTarget)} />
                <span class="name">{set.name}</span>
                <span class="count" class:none={on === 0}>{on}/{set.chords.length}</span>
            </label>

            <p class="about">{set.about}</p>

            <div class="chords" role="group" aria-label={set.name}>
                {#each set.chords as chord (chord.label)}
                    <button
                        class="chord"
                        class:on={chosen.has(chord.label)}
                        aria-pressed={chosen.has(chord.label)}
                        on:click={() => toggleChord(chord.label)}>
                        {chord.name}{#if chord.tag}<span class="tag">{chord.tag}</span>{/if}
                    </button>
                {/each}
            </div>
        </div>
    {/each}
</fieldset>

<style>
    .sets {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        width: 100%;
    }

    legend {
        margin-bottom: 0.5rem;
        font-family: var(--font-mono);
        font-size: 0.6875rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--text-muted);
    }

    .set {
        padding: 0.625rem 0.75rem;
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
    }

    .head {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        cursor: pointer;
    }

    input {
        accent-color: var(--accent);
        cursor: pointer;
    }

    .name {
        font-size: 0.875rem;
        color: var(--text);
    }

    /* Pushed to the far end, where the eye can compare the three without reading the names. */
    .count {
        margin-left: auto;
        font-family: var(--font-mono);
        font-size: 0.75rem;
        color: var(--text-muted);
    }

    .count.none {
        opacity: 0.5;
    }

    .about {
        margin: 0.25rem 0 0.5rem;
        font-size: 0.75rem;
        line-height: 1.4;
        color: var(--text-muted);
    }

    .chords {
        display: flex;
        flex-wrap: wrap;
        gap: 0.3125rem;
    }

    .chord {
        display: inline-flex;
        align-items: baseline;
        gap: 0.25rem;

        padding: 0.1875rem 0.5rem;
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);

        font-family: var(--font-mono);
        font-size: 0.75rem;
        color: var(--text-muted);

        transition:
            color 0.15s,
            border-color 0.15s,
            background-color 0.15s;
    }

    .chord:hover {
        border-color: var(--accent);
        color: var(--text);
    }

    /* Filled rather than merely brighter. Twenty-two of these are read at a glance, and a
       difference in weight is quicker to scan than a difference in shade. */
    .chord.on {
        border-color: var(--accent);
        background-color: var(--accent);
        color: var(--accent-contrast);
    }

    .tag {
        font-size: 0.625rem;
        opacity: 0.7;
    }
</style>
