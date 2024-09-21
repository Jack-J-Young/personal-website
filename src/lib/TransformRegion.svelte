<script lang="ts">
    export let points: {x: number, y: number}[] = [];

    $: lines = [...points.map((point, i) => {
        if (i === 0) return;
        return {
            x1: points[i - 1].x,
            y1: points[i - 1].y,
            x2: point.x,
            y2: point.y
        }
    }).filter(Boolean),
    {
        x1: points[points.length - 1].x,
        y1: points[points.length - 1].y,
        x2: points[0].x,
        y2: points[0].y
    }];
</script>

<svg>
    {#each lines as line}
        {#if line}
            <line x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} stroke="black" />
        {/if}
    {/each}
</svg>

<style>
    svg {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
    }

    line {
        stroke: red;
        stroke-width: 3;
    }
</style>