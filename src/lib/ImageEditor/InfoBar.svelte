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
        background-color: #232326;

        background: linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.3) 30%, rgba(0, 0, 0, .5));
        border-top: 1px solid #5E5E5E;
    }

    .info-bar span {
        color: #ADAFB2;
    }
</style>