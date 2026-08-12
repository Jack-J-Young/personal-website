<script lang="ts">
    export let size: "narrow" | "default" | "wide" = "default";

    const widths = {
        narrow: "max-w-2xl",
        default: "max-w-5xl",
        wide: "max-w-6xl",
    };
</script>

<div class="mx-auto w-full px-5 sm:px-8 {widths[size]}">
    <slot />
</div>
