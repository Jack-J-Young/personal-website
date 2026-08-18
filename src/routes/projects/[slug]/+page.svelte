<script lang="ts">
    import { formatDate } from "$lib/projects/dates";
    import Gallery from "$lib/projects/Gallery.svelte";
    import StatusChip from "$lib/projects/StatusChip.svelte";
    import Container from "$lib/ui/Container.svelte";
    import Eyebrow from "$lib/ui/Eyebrow.svelte";
    import Heading from "$lib/ui/Heading.svelte";
    import Link from "$lib/ui/Link.svelte";
    import Prose from "$lib/ui/Prose.svelte";
    import Section from "$lib/ui/Section.svelte";
    import Stack from "$lib/ui/Stack.svelte";
    import Text from "$lib/ui/Text.svelte";
    import type { PageData } from "./$types";

    export let data: PageData;

    $: project = data.project;
</script>

<svelte:head>
    <title>{project.title}</title>
    <meta name="description" content={project.summary} />
</svelte:head>

<Container size="narrow">
    <Section space="default">
        <Stack gap="md">
            <Link href="/projects">&larr; Projects</Link>

            <Stack gap="sm">
                <Eyebrow>Project</Eyebrow>
                <Heading level={1} size="lg">{project.title}</Heading>

                <div class="flex flex-wrap items-center gap-3">
                    <StatusChip status={project.status} />
                    {#if formatDate(project.date)}
                        <span class="font-mono text-xs text-text-muted">
                            {formatDate(project.date)}
                        </span>
                    {/if}
                </div>

                {#if project.summary}
                    <Text size="lg" muted>{project.summary}</Text>
                {/if}
            </Stack>
        </Stack>
    </Section>

    {#if project.images.length > 0}
        <Section space="tight">
            <Stack gap="sm">
                <Eyebrow>Photos</Eyebrow>
                <Gallery images={project.images} title={project.title} />
            </Stack>
        </Section>
    {/if}

    <Section space="tight">
        <Prose html={project.html} />
    </Section>

    {#if project.notes.length > 0}
        <Section space="tight">
            <Stack gap="lg">
                <Eyebrow>How it went</Eyebrow>

                {#each project.notes as note (note.slug)}
                    <article class="border-t border-border pt-8">
                        <Stack gap="sm">
                            <Heading level={2} size="md">
                                <a href="/projects/{project.slug}/{note.slug}">{note.title}</a>
                            </Heading>

                            {#if formatDate(note.date)}
                                <span class="font-mono text-xs text-text-muted">
                                    {formatDate(note.date)}
                                </span>
                            {/if}

                            <Prose html={note.html} />
                        </Stack>
                    </article>
                {/each}
            </Stack>
        </Section>
    {/if}
</Container>
