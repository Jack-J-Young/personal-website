<script lang="ts">
    export let points: {x: number, y: number}[] = [];

    export let imgWidth: number = 0;
    export let imgHeight: number = 0;

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
    {#if lines.length == 4}
        <polygon points="0,0 {imgWidth},0 {points[1].x},{points[1].y} {points[0].x},{points[0].y}" 
                fill="red" fill-opacity="0.25" />
        
        <polygon points="{imgWidth},0 {imgWidth},{imgHeight} {points[2].x},{points[2].y} {points[1].x},{points[1].y}" 
                fill="red" fill-opacity="0.25" />
        
        <polygon points="{imgWidth},{imgHeight} 0,{imgHeight} {points[3].x},{points[3].y} {points[2].x},{points[2].y}" 
                fill="red" fill-opacity="0.25" />
        
        <polygon points="0,{imgHeight} 0,0 {points[0].x},{points[0].y} {points[3].x},{points[3].y}" 
                fill="red" fill-opacity="0.25" />

        <line x1={0} y1={0} x2={points[0].x} y2={points[0].y} stroke="red" />
        <line x1={imgWidth} y1={0} x2={points[1].x} y2={points[1].y} stroke="red" />
        <line x1={imgWidth} y1={imgHeight} x2={points[2].x} y2={points[2].y} stroke="red" />
        <line x1={0} y1={imgHeight} x2={points[3].x} y2={points[3].y} stroke="red" />
    {/if}
    {#each lines as line}
        {#if line}
            <line x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} stroke="red" />
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
        stroke-width: 3;
    }
</style>