<script lang="ts">
    import { iconButtonClasses, type IconButtonSize } from "./iconButtonClasses";

    export let label: string;
    export let size: IconButtonSize = "sm";
</script>

<button type="button" aria-label={label} title={label} class={iconButtonClasses(size)} on:click>
    <slot />
</button>
