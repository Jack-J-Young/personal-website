<script lang="ts">
    import type { Note } from "$lib/audio";

    export let note: Note | null = null;

    /** How far off a string can be and still count as tuned. Five cents is inaudible. */
    export let tolerance = 5;

    const DIAL_RANGE_CENTS = 50;

    $: inTune = note != null && Math.abs(note.cents) <= tolerance;
    $: needle = note == null
        ? 0
        : Math.max(-DIAL_RANGE_CENTS, Math.min(DIAL_RANGE_CENTS, note.cents));

    function readout(value: number): string {
        let rounded = Math.round(value);
        return rounded > 0 ? `+${rounded}` : `${rounded}`;
    }
</script>

<div class="dial" class:in-tune={inTune} class:silent={note == null}>
    <div class="note">
        <span class="name">{note ? note.name : "—"}</span>
        {#if note}<span class="octave">{note.octave}</span>{/if}
    </div>

    <div class="track" aria-hidden="true">
        <div class="centre"></div>
        <div class="tolerance" style="--half: {(tolerance / DIAL_RANGE_CENTS) * 50}%"></div>
        {#if note}
            <div class="needle" style="--position: {50 + (needle / DIAL_RANGE_CENTS) * 50}%"></div>
        {/if}
    </div>

    <div class="labels">
        <span>flat</span>
        <span class="cents">
            {#if !note}
                play a string
            {:else if inTune}
                in tune
            {:else}
                {readout(note.cents)} cents
            {/if}
        </span>
        <span>sharp</span>
    </div>
</div>

<style>
    .dial {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;

        /* Without this the dial is centred in its parent and so shrinks to fit the note name,
           and the track's own `width: 100%` then resolves against that instead of the page. */
        width: 100%;

        --state: var(--out-of-tune);
    }

    .dial.in-tune {
        --state: var(--in-tune);
    }

    .dial.silent {
        --state: var(--border);
    }

    .note {
        display: flex;
        align-items: baseline;
        gap: 0.125rem;

        font-family: var(--font-mono);
        font-size: 4.5rem;
        line-height: 1;
        font-weight: 600;
        color: var(--text);
    }

    .dial.silent .note {
        color: var(--text-muted);
    }

    .octave {
        font-size: 1.75rem;
        color: var(--text-muted);
    }

    .track {
        position: relative;
        width: 100%;
        max-width: 28rem;
        height: 3rem;

        border-radius: var(--radius);
        background-color: var(--surface-raised);
    }

    /* The band you are aiming for, drawn behind the needle so landing inside it is the visible
       goal rather than something only the number tells you. */
    .tolerance {
        position: absolute;
        top: 0;
        bottom: 0;
        left: calc(50% - var(--half));
        width: calc(2 * var(--half));

        background-color: var(--accent-subtle);
    }

    .centre {
        position: absolute;
        top: 0.5rem;
        bottom: 0.5rem;
        left: calc(50% - 1px);
        width: 2px;

        background-color: var(--border);
    }

    .needle {
        position: absolute;
        top: 0.25rem;
        bottom: 0.25rem;
        left: calc(var(--position) - 2px);
        width: 4px;

        border-radius: var(--radius-sm);
        background-color: var(--state);

        /* Short enough to still feel immediate, long enough to stop the needle flickering
           between two adjacent readings. */
        transition: left 90ms linear, background-color 150ms ease;
    }

    .labels {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        max-width: 28rem;

        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-family: var(--font-mono);
        color: var(--text-muted);
    }

    .cents {
        font-size: 0.875rem;
        letter-spacing: 0.04em;
        color: var(--state);
    }

    .dial.silent .cents {
        color: var(--text-muted);
    }
</style>
