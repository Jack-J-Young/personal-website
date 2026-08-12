<script lang="ts">
    export let padded = true;
    export let interactive = false;
</script>

<div
    class="overflow-hidden rounded-lg border border-border bg-surface shadow
           {padded ? 'p-6 sm:p-8' : ''}
           {interactive ? 'transition-colors hover:border-accent' : ''}">
    <slot />
</div>
