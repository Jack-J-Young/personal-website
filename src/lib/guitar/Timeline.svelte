<script lang="ts">
    import { perceivedLevel } from "./loudness";
    import type { LevelSample, TimelineMark } from "./timeline";

    export let trace: LevelSample[] = [];
    export let marks: TimelineMark[] = [];

    /** The moment "now" refers to. Advancing it every frame is what makes the trace scroll. */
    export let now = 0;

    export let spanMs = 6000;

    /** The onset currently being analysed, if any, so the wait for a full window is visible. */
    export let pending: number | null = null;

    /** Loudness below which nothing counts as a strum, drawn so it can be aimed at. */
    export let threshold = 0;

    /**
     * The path is stretched to whatever width the timeline ends up, so this is a resolution rather
     * than a size. A thousand steps is finer than the trace ever is.
     */
    const VIEW_WIDTH = 1000;
    const VIEW_HEIGHT = 100;
    const MIDLINE = VIEW_HEIGHT / 2;

    /** Newest at the left, so a strum enters at the "now" line and drifts away from it. */
    $: position = (time: number) => ((now - time) / spanMs) * 100;

    $: envelope = envelopePath(trace, now, spanMs);

    function envelopePath(samples: LevelSample[], at: number, span: number): string {
        if (samples.length < 2) return "";

        let top: string[] = [];
        let bottom: string[] = [];

        for (let sample of samples) {
            let x = (((at - sample.time) / span) * VIEW_WIDTH).toFixed(1);
            let reach = perceivedLevel(sample.level) * (MIDLINE - 1);

            top.push(`${x} ${(MIDLINE - reach).toFixed(1)}`);
            bottom.push(`${x} ${(MIDLINE + reach).toFixed(1)}`);
        }

        // Along the top from the oldest sample back to the newest, then home along the bottom.
        return `M${top.join("L")}L${bottom.reverse().join("L")}Z`;
    }
</script>

<div class="timeline">
    {#if pending !== null}
        <!-- The audio being gathered for a reading. It stops growing at the moment the chord
             appears, because that is exactly when the window is full of nothing but the chord. -->
        <div class="gathering" style="--width: {position(pending)}%"></div>
    {/if}

    <svg
        class="wave"
        viewBox="0 0 {VIEW_WIDTH} {VIEW_HEIGHT}"
        preserveAspectRatio="none"
        aria-hidden="true">
        <path d={envelope} />
    </svg>

    {#if threshold > 0}
        <!-- Drawn over the trace rather than under it: the whole question being asked of it is
             whether the waveform pokes out, which is easiest to see when the edges are crisp. -->
        <div class="too-quiet" style="--reach: {perceivedLevel(threshold) * 50}%"></div>
    {/if}

    {#each marks as mark (mark.time)}
        <div class="mark" class:named={mark.label !== null} style="--x: {position(mark.time)}%">
            <span class="tick"></span>
            {#if mark.label !== null}
                <span class="label">{mark.label}</span>
            {/if}
        </div>
    {/each}

    <div class="now"></div>
</div>

<style>
    .timeline {
        position: relative;
        overflow: hidden;

        width: 100%;
        height: 6rem;

        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        background-color: var(--surface-raised);
    }

    /* Positioned so it paints over the gathering band that precedes it, rather than under it. */
    .wave {
        position: relative;
        display: block;
        width: 100%;
        height: 100%;
    }

    .wave path {
        fill: var(--text-muted);
        opacity: 0.5;
    }

    .gathering {
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: var(--width);

        background-color: var(--accent);
        opacity: 0.12;
    }

    .too-quiet {
        position: absolute;
        left: 0;
        right: 0;
        top: calc(50% - var(--reach));
        height: calc(var(--reach) * 2);

        border-top: 1px dashed var(--border);
        border-bottom: 1px dashed var(--border);
    }

    /* Zero width, so the tick sits exactly on the moment and the label hangs off it. */
    .mark {
        position: absolute;
        left: var(--x);
        top: 0;
        bottom: 0;
        width: 0;
    }

    .tick {
        position: absolute;
        top: 0;
        bottom: 0;
        width: 1px;

        background-color: var(--border);
    }

    .mark.named .tick {
        background-color: var(--accent);
    }

    /* Anchored to the right of a zero-width parent, so it extends leftwards over the audio it
       describes rather than over the strum before it. */
    .label {
        position: absolute;
        top: 0.375rem;
        right: 0.25rem;
        padding: 0.0625rem 0.3125rem;
        white-space: nowrap;

        border-radius: var(--radius-sm);
        background-color: var(--surface);
        font-family: var(--font-mono);
        font-size: 0.75rem;
        color: var(--text);
    }

    .now {
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 2px;

        background-color: var(--accent);
    }
</style>
