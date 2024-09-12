<script lang="ts">
    import ObjectInspector from "./ObjectInspector.svelte";

    export let data;

    let isExpanded = false;

    // Check if the current data is an object or an array
    const isObject = (value: any) =>
        value !== null && typeof value === "object" && !Array.isArray(value);
    const isArray = Array.isArray;

    // Toggle the expansion state
    const toggleExpand = () => {
        isExpanded = !isExpanded;
    };
</script>

<div class="grow flex flex-row pl-1 pr-1">
    {#if isObject(data)}
        <button
            class="expand-icon h-fit text-black w-4"
            on:click={toggleExpand}
            aria-label={isExpanded ? "Collapse" : "Expand"}
        >
            {isExpanded ? "▼" : "▶"}
        </button>
        <div
            class="object-text {!isExpanded ? 'flex-row' : 'flex-col'}"
            role="button">
            <button class="text-left w-fit" on:click={toggleExpand}>Object:</button>
            {#if isExpanded}
                {#each Object.entries(data) as [key, value]}
                    <div class="flex flex-row pl-4">
                            {key}: <ObjectInspector data={value} />
                    </div>
                {/each}
            {:else}
                <button class="pl-1" on:click={toggleExpand}>
                    {JSON.stringify(data)}
                </button>
            {/if}
            </div>
    {:else if isArray(data)}
        <button
            class="expand-icon h-fit text-black w-4"
            on:click={toggleExpand}
            aria-label={isExpanded ? "Collapse" : "Expand"}
        >
            {isExpanded ? "▼" : "▶"}
        </button>
        <button class="object-text w-fit {!isExpanded ? 'flex-row' : 'flex-col'}" on:click={toggleExpand}>Array:
            {#if isExpanded}
                <div class="indent">
                    {#each data as item, index}
                    <div class="flex flex-row">
                        [{index}]: <ObjectInspector data={item} />
                    </div>
                    {/each}
                </div>
            {:else}
                {JSON.stringify(data)}
            {/if}
        </button>
    {:else}
        <span class="primitive">{String(data)}</span>
    {/if}
</div>

<style>
    .object-text {
        text-align: left;
        display: flex;
        width: 0;
        flex-grow: 1;
        color: #85bbd2;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .indent {
        flex-grow: 1;
        margin-left: 1rem;
    }
</style>
