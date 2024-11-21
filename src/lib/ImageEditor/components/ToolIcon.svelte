<script lang="ts">
    import type { Writable } from "svelte/store";
    import { type Tool } from "../tools/Tool";
    import { createEventDispatcher } from "svelte";

    const dispatch = createEventDispatcher();

    export let tool: Tool;

    $: isSelected = tool.selected

    export let selectedTool: Writable<Tool>;

    function handleClick() {
        dispatch("selectTool", tool);
    }

    function handleOnHover() {
        dispatch("hoverTool", tool);
    }

    function handleOffHover() {
        dispatch("hoverTool", null);
    }
</script>

<!-- svelte-ignore a11y-mouse-events-have-key-events -->
<button class="tool-icon {($isSelected ? "selected" : "")}"
    aria-label="Select tool" 
    tabindex="0"
    aria-pressed="false"
    disabled={tool.disabled}

    on:click={handleClick}
    
    on:mouseover={handleOnHover}
    on:mouseleave={handleOffHover}
    on:focusin={handleOnHover}
    on:focusout={handleOffHover}>

    <img src={tool.icon} alt={tool.name} />
    <!-- <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 30 30" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M15 7.5v7.5m0 0v7.5m0-7.5h7.5m-7.5 0H7.5" />
    </svg> -->
</button>

<style>
    .tool-icon {
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
        overflow: hidden;

        padding: 0.25rem;

        background: linear-gradient(rgba(15, 16, 21, 0), rgba(15, 16, 21, 0) 60%, rgba(15, 16, 21, 0));
        box-shadow: inset 0 0px 0px rgba(0, 0, 0, 0.3);

        border-radius: 50%;
        transition: box-shadow 0.25s;
    }

    .tool-icon img {
        width: 1.75rem;
        height: 1.75rem;

        transition: filter 0.25s;
        transition: transform 0.25s;
    }

    .tool-icon:disabled {
        background: radial-gradient( rgba(0, 0, 0, 0), rgba(0, 0, 0, 0.1) 60%, rgba(0, 0, 0, 0.5));
        box-shadow: inset 0 2px 0px rgba(0, 0, 0, 0.3);
    }

    .tool-icon:disabled img {
        filter: drop-shadow(0 -1px 0 rgba(0, 0, 0, 0.3)) brightness(0.6);
        transform: translateY(2px);
        overflow: hidden;
        transition: transform 0s;
    }

    .tool-icon:enabled:hover {
        background: radial-gradient( rgba(0, 0, 0, 0), rgba(0, 0, 0, 0.05) 60%, rgba(0, 0, 0, 0.2));
        box-shadow: inset 0 1px 0px rgba(0, 0, 0, 0.3);
    }

    .tool-icon:enabled:hover img {
        filter: brightness(1.2);
        transform: translateY(1px);
        transition: transform 0s;
    }

    .tool-icon.selected {
        background: radial-gradient( rgba(0, 0, 0, 0), rgba(0, 0, 0, 0.1) 60%, rgba(0, 0, 0, 0.5));
        box-shadow: inset 0 3px 0px rgba(0, 0, 0, 0.3);
    }

    .tool-icon.selected img {
        /* inset shadow filter */
        filter: drop-shadow(0 -1px 0 rgba(0, 0, 0, 0.3)) brightness(1.2);
        transform: translateY(3px);
        overflow: hidden;
        transition: transform 0s;
    }

    .tool-icon.selected:hover {
        background: radial-gradient( rgba(0, 0, 0, 0), rgba(0, 0, 0, 0.1) 60%, rgba(0, 0, 0, 0.5));
        box-shadow: inset 0 2px 0px rgba(0, 0, 0, 0.3);
    }

    .tool-icon.selected:hover img {
        /* inset shadow filter */
        filter: drop-shadow(0 -1px 0 rgba(0, 0, 0, 0.3)) brightness(1.2);
        transform: translateY(2px);
        overflow: hidden;
        transition: transform 0s;
    }

</style>