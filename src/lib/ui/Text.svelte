<script lang="ts">
    export let size: "sm" | "md" | "lg" = "md";
    export let muted = false;

    const sizes = {
        sm: "text-sm",
        md: "text-base",
        lg: "text-lg sm:text-xl",
    };
</script>

<p class="leading-relaxed text-pretty {sizes[size]} {muted ? 'text-text-muted' : 'text-text'}">
    <slot />
</p>
