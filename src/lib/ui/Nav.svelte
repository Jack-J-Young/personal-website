<script lang="ts">
    import Container from "./Container.svelte";
    import NavLink from "./NavLink.svelte";
    import ThemeToggle from "./ThemeToggle.svelte";
</script>

<header class="sticky top-0 z-30 border-b border-border bg-bg-translucent backdrop-blur">
    <Container size="wide">
        <nav class="flex h-14 items-center gap-1">
            <a href="/" class="mr-2 flex items-center gap-2 rounded-sm" aria-label="Home">
                <img src="/favicon.png" alt="" class="h-7 w-7" />
                <span class="font-mono text-sm tracking-tight text-text">jackyoung.xyz</span>
            </a>

            <div class="flex flex-1 items-center gap-1">
                <NavLink href="/whiteboard">Whiteboard</NavLink>
                <NavLink href="/about">About</NavLink>
            </div>

            <ThemeToggle />
        </nav>
    </Container>
</header>
