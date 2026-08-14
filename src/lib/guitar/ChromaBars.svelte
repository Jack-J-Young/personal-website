<script lang="ts">
    import { NOTE_NAMES } from "$lib/audio";

    export let chroma: Float32Array | null = null;

    /** Pitch classes belonging to the chord that was matched, drawn in the accent colour. */
    export let highlight: number[] = [];
</script>

<!-- The evidence behind the answer: which twelve notes the microphone actually heard, so a wrong
     guess is legible as a wrong guess rather than a black box. -->
<ul class="bars">
    {#each NOTE_NAMES as name, pitchClass}
        <li class="bar" class:lit={highlight.includes(pitchClass)}>
            <div class="column">
                <div class="fill" style="--height: {(chroma?.[pitchClass] ?? 0) * 100}%"></div>
            </div>
            <span class="label">{name}</span>
        </li>
    {/each}
</ul>

<style>
    .bars {
        display: grid;
        grid-template-columns: repeat(12, 1fr);
        gap: 0.25rem;

        width: 100%;
        margin: 0;
        padding: 0;
        list-style: none;
    }

    .bar {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.375rem;
    }

    .column {
        position: relative;
        width: 100%;
        height: 6rem;

        border-radius: var(--radius-sm);
        background-color: var(--surface-raised);
    }

    .fill {
        position: absolute;
        bottom: 0;
        width: 100%;
        height: var(--height);

        border-radius: var(--radius-sm);
        background-color: var(--border);

        transition: height 80ms linear, background-color 150ms ease;
    }

    .bar.lit .fill {
        background-color: var(--accent);
    }

    .label {
        font-family: var(--font-mono);
        font-size: 0.6875rem;
        color: var(--text-muted);
    }

    .bar.lit .label {
        color: var(--accent);
    }
</style>
