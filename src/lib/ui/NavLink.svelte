<script lang="ts">
    import { page } from "$app/stores";

    export let href: string;

    // Nested routes should still light up their parent nav item, but "/" would
    // then match everything, so it only counts on an exact hit.
    $: active = href === "/" ? $page.url.pathname === "/" : $page.url.pathname.startsWith(href);
</script>

<a
    {href}
    aria-current={active ? "page" : undefined}
    class="rounded-sm px-2 py-1 text-sm transition-colors hover:text-text
           {active ? 'text-text' : 'text-text-muted'}">
    <slot />
</a>
