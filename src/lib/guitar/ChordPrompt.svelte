<script lang="ts">
    import ChordDiagram from "./ChordDiagram.svelte";
    import type { Attempt, DrillChord } from "./practice";

    export let target: DrillChord;

    /** Shown before it is asked for, so the change can be prepared rather than reacted to. */
    export let upcoming: DrillChord;

    /** The last strum that landed. `ms` is null for the first of a session, which has no pair. */
    export let result: { chord: string; ms: number | null } | null = null;

    /** The last strum that didn't land, cleared as soon as the prompt moves on. */
    export let missed: Attempt | null = null;

    /** True from the strum being heard until it has been named. */
    export let listening = false;

    export let streak = 0;

    /** Whether to show where the fingers go. Off by default — see the trainer page. */
    export let fingering = false;

    function seconds(ms: number): string {
        return `${(ms / 1000).toFixed(1)}s`;
    }
</script>

<div class="prompt">
    <div class="pair">
        <!-- Keyed so each new chord is a new node and animates in. Without it Svelte patches the
             text and the prompt changes with no sign that anything happened. -->
        {#key target.label}
            <span class="chord now">{target.name}</span>
        {/key}
        <span class="arrow" aria-hidden="true">→</span>
        <span class="chord next">{upcoming.name}</span>

        <span class="label now-label">
            play{#if target.tag}<span class="tag">{target.tag}</span>{/if}
        </span>
        <span class="label next-label">
            then{#if upcoming.tag}<span class="tag">{upcoming.tag}</span>{/if}
        </span>

        {#if fingering}
            <div class="fingers now-fingers">
                <ChordDiagram shape={target.shape} name={target.label} width="6.5rem" />
            </div>
            <div class="fingers next-fingers">
                <ChordDiagram shape={upcoming.shape} name={upcoming.label} width="4.5rem" />
            </div>
        {/if}
    </div>

    <span class="verdict" class:good={result !== null && !listening && missed === null}>
        {#if listening}
            listening…
        {:else if missed?.heard?.name === upcoming.name}
            <!-- Reaching the preview before the prompt was heard. Naming it beats reporting a
                 low score against a chord the player has already moved on from, which reads as
                 the tool being broken rather than as being early. -->
            that was {upcoming.label} — let {target.label} ring first
        {:else if missed?.heard}
            heard {missed.heard.name} · {Math.round(missed.score * 100)}% of a {target.label}
        {:else if missed}
            too quiet to name
        {:else if result?.ms != null}
            {result.chord} in {seconds(result.ms)}
        {:else if result}
            {result.chord} — changes are timed from here
        {:else}
            strum it and let it ring
        {/if}
    </span>

    <span class="streak" class:hot={streak >= 3}>
        {streak === 0 ? "no streak" : `${streak} in a row`}
    </span>
</div>

<style>
    .prompt {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
    }

    /* A grid rather than a flex row so the two chords share a baseline despite their sizes, and
       each label sits under the chord it names. */
    .pair {
        display: grid;
        grid-template-columns: auto auto auto;
        align-items: baseline;
        justify-content: center;
        column-gap: 0.75rem;
    }

    .now,
    .arrow,
    .next {
        grid-row: 1;
    }

    .label {
        grid-row: 2;
    }

    .fingers {
        grid-row: 3;
        align-self: start;
        justify-self: center;
        padding-top: 0.75rem;
    }

    .now-fingers {
        grid-column: 1;
    }

    .next-fingers {
        grid-column: 3;
    }

    .chord {
        font-family: var(--font-mono);
        line-height: 1;
        font-weight: 600;
    }

    .now {
        font-size: 4rem;
        color: var(--text);
        animation: arrive 220ms ease-out;
    }

    .next {
        font-size: 2rem;
        color: var(--text-muted);
    }

    .arrow {
        font-size: 1.5rem;
        color: var(--text-muted);
        opacity: 0.6;
    }

    .label,
    .verdict,
    .streak {
        font-family: var(--font-mono);
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--text-muted);
        text-align: center;
    }

    .label {
        padding-top: 0.375rem;
        opacity: 0.7;
    }

    /* Full strength inside a dimmed label: "barre" is not decoration on the word "play", it is the
       part of the prompt that says which of two identical-sounding chords is being asked for. */
    .tag {
        color: var(--accent);
        opacity: 1;
    }

    .tag::before {
        content: " · ";
        color: var(--text-muted);
    }

    .now-label {
        grid-column: 1;
    }

    .next-label {
        grid-column: 3;
    }

    .verdict.good {
        color: var(--accent);
    }

    .streak {
        padding: 0.125rem 0.5rem;

        border: 1px solid transparent;
        border-radius: var(--radius-sm);
    }

    .streak.hot {
        border-color: var(--border);
        color: var(--accent);
    }

    @keyframes arrive {
        from {
            opacity: 0;
            transform: translateY(-0.25rem);
        }
    }

    @media (prefers-reduced-motion: reduce) {
        .now {
            animation: none;
        }
    }
</style>
