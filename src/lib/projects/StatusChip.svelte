<script lang="ts">
    import type { ProjectStatus } from "./types";

    export let status: ProjectStatus;

    const labels: Record<ProjectStatus, string> = {
        wip: "In progress",
        done: "Finished",
        abandoned: "Abandoned",
    };

    // Only the unfinished state is coloured. A project that is done needs no emphasis, and one
    // that was abandoned is worth reading rather than worth warning about.
    $: tone = status === "wip" ? "text-caution" : "text-text-muted";
</script>

<span
    class="inline-block rounded-sm bg-surface-raised px-2 py-1 font-mono text-xs uppercase
           tracking-[0.15em] {tone}">
    {labels[status]}
</span>
