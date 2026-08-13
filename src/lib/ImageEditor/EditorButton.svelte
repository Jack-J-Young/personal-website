<script lang="ts">
    import type { ComponentType } from "svelte";

    import { buttonClasses } from "$lib/ui/buttonClasses";

    export let text: string = "Editor Button";

    /** An icon component drawn with `currentColor`, shown after the label. */
    export let icon: ComponentType | null = null;

    export let disabled = false;

    export let click: () => void = () => {};
</script>

<!-- Shares the site's button classes rather than restating them, so the editor's primary action
     cannot drift away from every other primary action on the site. -->
<button class="{buttonClasses('primary', 'sm')} editor-button" on:click={click} {disabled}>
    <span>{text}</span>
    {#if icon}
        <svelte:component this={icon} />
    {/if}
</button>

<style>
    .editor-button :global(svg) {
        height: 0.75rem;
        width: 0.75rem;
    }
</style>
