<script lang="ts">
    import { fade } from 'svelte/transition';

    export let infoText: string = "";
</script>

<div class="info-bar">
    {#if infoText !== ""}
        <span transition:fade={{ duration: 150 }}>{infoText}</span>
    {/if}
</div>

<style>
    .info-bar {
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
        height: 2rem;
        padding: 0.5rem;

        background-color: var(--surface);
        border-top: 1px solid var(--border);
    }

    .info-bar span {
        color: var(--text-muted);
        font-size: 0.875rem;
    }
</style>