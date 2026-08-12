<script lang="ts">
    export let space: "tight" | "default" | "loose" = "default";

    const spacing = {
        tight: "py-8 sm:py-10",
        default: "py-12 sm:py-16",
        loose: "py-16 sm:py-24",
    };
</script>

<section class={spacing[space]}>
    <slot />
</section>
