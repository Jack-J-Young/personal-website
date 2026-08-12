<script lang="ts">
    import { buttonClasses, type ButtonSize, type ButtonVariant } from "./buttonClasses";

    export let variant: ButtonVariant = "primary";
    export let size: ButtonSize = "md";
    export let type: "button" | "submit" = "button";
    export let disabled = false;
</script>

<button {type} {disabled} class={buttonClasses(variant, size)} on:click>
    <slot />
</button>
