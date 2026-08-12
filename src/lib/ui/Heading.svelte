<script lang="ts">
    // level is semantics, size is appearance. Keeping them separate means a page
    // can have a correct heading outline without being forced into a type scale.
    export let level: 1 | 2 | 3 = 2;
    export let size: "sm" | "md" | "lg" | "xl" | null = null;

    const sizes = {
        sm: "text-lg sm:text-xl",
        md: "text-xl sm:text-2xl",
        lg: "text-3xl sm:text-4xl",
        xl: "text-4xl sm:text-6xl",
    };

    const defaultSize = { 1: "xl", 2: "lg", 3: "md" } as const;

    $: classes = `font-semibold tracking-tight text-text text-balance ${sizes[size ?? defaultSize[level]]}`;
</script>

{#if level === 1}
    <h1 class={classes}><slot /></h1>
{:else if level === 2}
    <h2 class={classes}><slot /></h2>
{:else}
    <h3 class={classes}><slot /></h3>
{/if}
