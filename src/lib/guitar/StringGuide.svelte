<script lang="ts">
    import { STANDARD_TUNING, type GuitarString } from "$lib/audio";

    export let active: GuitarString | null = null;
    export let inTune = false;

    /** Strings tuned at least once this session, by string number. */
    export let done: number[] = [];

    /** How far through the hold the active string is, from 0 to 1. */
    export let holding = 0;

    $: isActive = (string: GuitarString) => active?.number === string.number;
</script>

<!-- Thickest string on the left, matching the order they appear looking down at the fretboard. -->
<ul class="strings">
    {#each STANDARD_TUNING as string}
        <li
            class="string"
            class:active={isActive(string)}
            class:in-tune={isActive(string) && inTune}
            class:done={done.includes(string.number)}>
            {#if isActive(string) && inTune && !done.includes(string.number)}
                <div class="hold" style="--held: {holding}"></div>
            {/if}
            <span class="name">{string.name}</span>
            <span class="number">{string.number}</span>
        </li>
    {/each}
</ul>

<style>
    .strings {
        display: grid;
        grid-template-columns: repeat(6, 1fr);
        gap: 0.5rem;

        width: 100%;
        max-width: 28rem;
        margin: 0;
        padding: 0;
        list-style: none;
    }

    .string {
        position: relative;
        overflow: hidden;

        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.125rem;
        padding: 0.625rem 0;

        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        background-color: var(--surface);
        color: var(--text-muted);

        transition: border-color 150ms ease, background-color 150ms ease, color 150ms ease;
    }

    /* A string already brought into tune stays marked, so you can see how far through the set you
       are without keeping count. */
    .string.done {
        border-color: var(--in-tune);
        color: var(--in-tune);
    }

    .string.active {
        border-color: var(--out-of-tune);
        background-color: var(--surface-raised);
        color: var(--out-of-tune);
    }

    .string.active.in-tune {
        border-color: var(--in-tune);
        color: var(--in-tune);
    }

    /* Fills as the string is held in tune. Without it the delay before a string is ticked off is
       indistinguishable from the tuner having stopped working. */
    .hold {
        position: absolute;
        left: 0;
        bottom: 0;
        height: 3px;
        width: calc(var(--held) * 100%);

        background-color: var(--in-tune);
    }

    .name {
        font-family: var(--font-mono);
        font-size: 1.125rem;
        font-weight: 600;
    }

    .number {
        font-size: 0.6875rem;
        color: var(--text-muted);
    }
</style>
