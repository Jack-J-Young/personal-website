<script lang="ts">
    import { formatDate } from "$lib/projects/dates";
    import StatusChip from "$lib/projects/StatusChip.svelte";
    import Card from "$lib/ui/Card.svelte";
    import Container from "$lib/ui/Container.svelte";
    import Eyebrow from "$lib/ui/Eyebrow.svelte";
    import Heading from "$lib/ui/Heading.svelte";
    import Section from "$lib/ui/Section.svelte";
    import Stack from "$lib/ui/Stack.svelte";
    import Text from "$lib/ui/Text.svelte";
    import type { PageData } from "./$types";

    export let data: PageData;
</script>

<svelte:head>
    <title>Projects</title>
    <meta name="description" content="3D printing and making projects, written up as they went" />
</svelte:head>

<Container>
    <Section space="loose">
        <Stack gap="sm">
            <Eyebrow>Making</Eyebrow>
            <Heading level={1}>Projects</Heading>
            <div class="max-w-xl">
                <Text size="lg" muted>
                    Things built, printed and occasionally abandoned, written up as they went
                    rather than tidied up afterwards.
                </Text>
            </div>
        </Stack>
    </Section>

    <Section space="tight">
        {#if data.projects.length === 0}
            <Card>
                <Stack gap="sm">
                    <Heading level={2} size="sm">Nothing published yet</Heading>
                    <Text muted>
                        Project pages are generated from a notes vault this site does not contain.
                        Run the content step against one and they will appear here.
                    </Text>
                </Stack>
            </Card>
        {:else}
            <div class="grid gap-5 sm:grid-cols-2">
                {#each data.projects as project (project.slug)}
                    <a href="/projects/{project.slug}" class="block rounded-lg">
                        <Card interactive padded={false}>
                            {#if project.cover}
                                <img
                                    src={project.cover}
                                    alt=""
                                    loading="lazy"
                                    class="aspect-[16/9] w-full border-b border-border
                                           object-cover" />
                            {/if}

                            <div class="p-6">
                                <Stack gap="sm">
                                    <div class="flex flex-wrap items-center gap-3">
                                        <StatusChip status={project.status} />
                                        {#if formatDate(project.date)}
                                            <span class="font-mono text-xs text-text-muted">
                                                {formatDate(project.date)}
                                            </span>
                                        {/if}
                                    </div>

                                    <Heading level={2} size="md">{project.title}</Heading>
                                    <Text muted>{project.summary}</Text>

                                    <span class="font-mono text-sm text-accent">
                                        {project.noteCount === 0
                                            ? "Read it"
                                            : `Read it · ${project.noteCount} note${project.noteCount === 1 ? "" : "s"}`}
                                        &rarr;
                                    </span>
                                </Stack>
                            </div>
                        </Card>
                    </a>
                {/each}
            </div>
        {/if}
    </Section>
</Container>
