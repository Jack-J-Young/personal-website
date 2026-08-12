<script lang="ts">
    import Container from "./Container.svelte";
    import SocialLinks from "./SocialLinks.svelte";
</script>

<!-- Opaque and raised so the back-to-top button can slide out from behind it
     rather than over it. -->
<footer class="relative z-10 border-t border-border bg-bg">
    <Container size="wide">
        <div class="flex flex-col gap-4 py-8 text-sm text-text-muted sm:flex-row sm:items-center sm:justify-between">
            <span>Jack Young</span>
            <SocialLinks size="sm" />
        </div>
    </Container>
</footer>
