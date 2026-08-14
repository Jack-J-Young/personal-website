<script lang="ts">
    import { STRINGS, barresOf, describeShape, fretWindow, type ChordShape } from "./shapes";

    export let shape: ChordShape;
    export let name: string;
    export let width = "5rem";

    // Abstract units. The SVG is scaled by its width, so these only fix the proportions.
    const GAP = 12;
    const ROW = 14;
    const DOT = 4.6;
    const TOP = 13;

    /**
     * Room to the left of the nut for the fret number, and to the right for the last dot's
     * overhang.
     *
     * The number sits on the *left* because the alternative put it beside the first fret, which is
     * exactly where a barre chord draws its bar — the one shape whose fret number matters most had
     * it printed on top of the bar. There is nothing on this side of the neck to collide with.
     *
     * The gutter is kept whether or not there is a number to put in it, so diagrams of chords at
     * different places on the neck are the same shape and can sit side by side.
     */
    const LEFT = 28;
    const RIGHT = 6;

    $: view = fretWindow(shape);
    $: barres = barresOf(shape);
    $: neck = LEFT + (STRINGS - 1) * GAP;
    $: height = TOP + view.rows * ROW + 3;

    /**
     * Strings the bar itself stops, which get the bar instead of a dot.
     *
     * Not everything the bar passes over: the strings between its ends that are stopped higher up
     * are separate notes and still need their own dots.
     */
    $: barred = new Set(barres.flatMap((barre) => barre.strings));

    function x(string: number): number {
        return LEFT + string * GAP;
    }

    /** The centre of a fret's row, since a dot sits between two fret wires rather than on one. */
    function y(fret: number, first: number): number {
        return TOP + (fret - first + 0.5) * ROW;
    }
</script>

<svg
    viewBox="0 0 {neck + RIGHT} {height}"
    style="width: {width}"
    role="img"
    aria-label="{name}, {describeShape(shape)}">
    <title>{name}, {describeShape(shape)}</title>

    {#each Array(view.rows + 1) as _, row}
        <line
            class="fret"
            class:nut={row === 0 && view.atNut}
            x1={LEFT}
            x2={neck}
            y1={TOP + row * ROW}
            y2={TOP + row * ROW} />
    {/each}

    {#each Array(STRINGS) as _, string}
        <line class="string" x1={x(string)} x2={x(string)} y1={TOP} y2={TOP + view.rows * ROW} />
    {/each}

    {#if !view.atNut}
        <!-- Anchored at the left edge rather than against the nut, so if a two-digit fret ever
             does run out of room it is the "fr" that goes and not the number. -->
        <text class="offset" x="0" y={TOP + ROW * 0.5} dominant-baseline="middle">
            {view.first}fr
        </text>
    {/if}

    {#each shape.frets as fret, string}
        {#if fret === null}
            <g class="mute">
                <line x1={x(string) - 3} x2={x(string) + 3} y1={TOP - 9} y2={TOP - 3} />
                <line x1={x(string) - 3} x2={x(string) + 3} y1={TOP - 3} y2={TOP - 9} />
            </g>
        {:else if fret === 0}
            <circle class="open" cx={x(string)} cy={TOP - 6} r="3" />
        {/if}
    {/each}

    {#each barres as barre}
        {@const from = x(barre.strings[0])}
        {@const to = x(barre.strings[barre.strings.length - 1])}
        <rect
            class="bar"
            x={from - DOT}
            y={y(barre.fret, view.first) - DOT}
            width={to - from + DOT * 2}
            height={DOT * 2}
            rx={DOT} />
        <!-- One number for the whole bar, at the low-string end where the finger is anchored.
             Centring it would put it under the dots the bar runs beneath. -->
        <text
            class="finger"
            x={from}
            y={y(barre.fret, view.first)}
            text-anchor="middle"
            dominant-baseline="central">
            {barre.finger}
        </text>
    {/each}

    {#each shape.frets as fret, string}
        {#if fret !== null && fret > 0 && !barred.has(string)}
            <circle class="dot" cx={x(string)} cy={y(fret, view.first)} r={DOT} />
            {#if shape.fingers[string] !== null}
                <text
                    class="finger"
                    x={x(string)}
                    y={y(fret, view.first)}
                    text-anchor="middle"
                    dominant-baseline="central">
                    {shape.fingers[string]}
                </text>
            {/if}
        {/if}
    {/each}
</svg>

<style>
    svg {
        display: block;
        height: auto;
        overflow: visible;
    }

    .fret,
    .string {
        stroke: var(--border);
        stroke-width: 1;
    }

    /* The nut is the one line that is a fact about the guitar rather than a fret, and the diagram
       is unreadable without knowing whether the top line is it. */
    .nut {
        stroke: var(--text-muted);
        stroke-width: 3;
        stroke-linecap: square;
    }

    .open {
        fill: none;
        stroke: var(--text-muted);
        stroke-width: 1.2;
    }

    .mute line {
        stroke: var(--text-muted);
        stroke-width: 1.2;
        stroke-linecap: round;
    }

    .dot,
    .bar {
        fill: var(--accent);
    }

    .finger {
        fill: var(--accent-contrast);
        font-family: var(--font-mono);
        font-size: 6.5px;
    }

    /* Full-strength text, not muted. Where on the neck the shape goes is not an annotation on the
       diagram — without it the diagram is of the wrong chord. */
    .offset {
        fill: var(--text);
        font-family: var(--font-mono);
        font-size: 9px;
    }
</style>
