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
                <!-- The icon alone links home on a phone: a fifth nav entry does not fit
                     beside the wordmark at 375px, and a link you can read beats a name. -->
                <span class="hidden font-mono text-sm tracking-tight text-text sm:inline">
                    jackyoung.xyz
                </span>
            </a>

            <div class="flex flex-1 items-center gap-1">
                <NavLink href="/projects">Projects</NavLink>
                <NavLink href="/whiteboard">Whiteboard</NavLink>
                <NavLink href="/guitar">Guitar</NavLink>
                <NavLink href="/about">About</NavLink>
            </div>

            <ThemeToggle />
        </nav>
    </Container>
</header>
