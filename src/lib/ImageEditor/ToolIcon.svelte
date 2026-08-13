<script lang="ts">
    import { type Tool } from "./Tool";
    import { createEventDispatcher } from "svelte";

    const dispatch = createEventDispatcher();

    export let tool: Tool;

    $: isSelected = tool.selected

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
    aria-label={tool.name}
    aria-pressed={$isSelected}
    title={tool.name}
    disabled={tool.disabled}

    on:click={handleClick}

    on:mouseover={handleOnHover}
    on:mouseleave={handleOffHover}
    on:focusin={handleOnHover}
    on:focusout={handleOffHover}>

    <svelte:component this={tool.icon} />
</button>

<style>
    .tool-icon {
        display: flex;
        align-items: center;
        justify-content: center;

        height: 2.25rem;
        width: 2.25rem;
        padding: 0.25rem;

        border: 1px solid transparent;
        border-radius: 50%;
        background-color: transparent;
        color: var(--text-muted);

        transition: background-color 150ms ease, color 150ms ease, border-color 150ms ease;
    }

    .tool-icon :global(svg) {
        width: 1.5rem;
        height: 1.5rem;
    }

    .tool-icon:enabled:hover {
        background-color: var(--surface-raised);
        color: var(--text);
    }

    /* The selected tool is the one thing in the bar that has to be readable at a glance, so it
       takes the accent rather than another shade of the surface. */
    .tool-icon.selected {
        background-color: var(--accent-subtle);
        border-color: var(--accent);
        color: var(--accent);
    }

    .tool-icon:disabled {
        color: var(--text-muted);
        opacity: 0.4;
        cursor: not-allowed;
    }
</style>
