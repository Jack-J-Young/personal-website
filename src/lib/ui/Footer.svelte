<script lang="ts">
    import Container from "./Container.svelte";
    import SocialLinks from "./SocialLinks.svelte";
</script>

<footer class="border-t border-border">
    <Container size="wide">
        <div class="flex flex-col gap-4 py-8 text-sm text-text-muted sm:flex-row sm:items-center sm:justify-between">
            <span>Jack Young</span>
            <SocialLinks size="sm" />
        </div>
    </Container>
</footer>
