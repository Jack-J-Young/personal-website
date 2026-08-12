<script lang="ts">
    export let href: string;
    export let external = false;
</script>

<a
    {href}
    target={external ? "_blank" : null}
    rel={external ? "noreferrer noopener" : null}
    class="text-accent underline decoration-1 underline-offset-4 transition-colors
           hover:text-accent-hover hover:decoration-2">
    <slot />
</a>
