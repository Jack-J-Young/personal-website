<script lang="ts">
    import "../app.css";
    import { page } from "$app/stores";
    import Footer from "$lib/ui/Footer.svelte";
    import Nav from "$lib/ui/Nav.svelte";
    import ScrollToTop from "$lib/ui/ScrollToTop.svelte";

    // The editor is full-bleed and carries its own toolbar, including a home
    // button, so the site chrome would only duplicate it and steal height.
    $: isEditor = $page.url.pathname.startsWith("/whiteboard/s");
</script>

{#if isEditor}
    <main class="h-screen w-full">
        <slot />
    </main>
{:else}
    <div class="flex min-h-screen flex-col">
        <Nav />
        <main class="flex-1">
            <slot />
        </main>
        <ScrollToTop />
        <Footer />
    </div>
{/if}
