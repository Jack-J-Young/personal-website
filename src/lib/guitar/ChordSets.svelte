<script lang="ts">
    import { CHORD_SETS } from "./practice";

    export let selected: string[] = [];

    /** Called after a change, so the drill can redraw a prompt that is no longer in the pool. */
    export let changed: () => void = () => {};

    /**
     * Unticking the last set is refused rather than disabled, because a disabled box gives no
     * reason and this one has an obvious one: the drill has to be asking for something.
     */
    function toggle(id: string, box: HTMLInputElement) {
        let next = selected.includes(id)
            ? selected.filter((other) => other !== id)
            : [...selected, id];

        if (next.length === 0) {
            // The browser has already unticked it, and Svelte only repaints `checked` when the
            // value it computes changes — refusing the click leaves it exactly as it was. Nothing
            // will put the box back, so this does.
            box.checked = true;
            return;
        }

        selected = next;
        changed();
    }
</script>

<fieldset class="sets">
    <legend>Chords to drill</legend>

    {#each CHORD_SETS as set (set.id)}
        <label class="set" class:on={selected.includes(set.id)}>
            <input
                type="checkbox"
                checked={selected.includes(set.id)}
                on:change={(event) => toggle(set.id, event.currentTarget)} />
            <span class="name">{set.name}</span>
            <span class="count">{set.chords.length}</span>
            <span class="about">{set.about}</span>
        </label>
    {/each}
</fieldset>

<style>
    .sets {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr));
        gap: 0.5rem;
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
        display: grid;
        grid-template-columns: auto 1fr auto;
        align-items: center;
        gap: 0.5rem;

        padding: 0.625rem 0.75rem;
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        cursor: pointer;

        transition:
            border-color 0.15s,
            background-color 0.15s;
    }

    .set:hover {
        border-color: var(--accent);
    }

    .set.on {
        background-color: var(--surface-raised);
    }

    input {
        accent-color: var(--accent);
        cursor: pointer;
    }

    .name {
        font-size: 0.875rem;
        color: var(--text);
    }

    .count {
        font-family: var(--font-mono);
        font-size: 0.75rem;
        color: var(--text-muted);
    }

    /* Spans the row under the name rather than sitting beside it: the sets are told apart by what
       they are for, and that sentence is the only place it is said. */
    .about {
        grid-column: 2 / -1;
        font-size: 0.75rem;
        line-height: 1.4;
        color: var(--text-muted);
    }
</style>
