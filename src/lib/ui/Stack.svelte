<script lang="ts">
    export let gap: "xs" | "sm" | "md" | "lg" = "md";
    export let align: "start" | "center" = "start";

    const gaps = {
        xs: "gap-2",
        sm: "gap-3",
        md: "gap-5",
        lg: "gap-8",
    };

    // "start" deliberately sets no alignment so children keep the flex default
    // of stretching. Using items-start here collapses any child that sizes
    // itself from its parent's width, such as a full-width image.
    const alignment = {
        start: "",
        center: "items-center text-center",
    };
</script>

<div class="flex flex-col {gaps[gap]} {alignment[align]}">
    <slot />
</div>
