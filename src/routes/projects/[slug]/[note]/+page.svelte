<script lang="ts">
    import { formatDate } from "$lib/projects/dates";
    import Container from "$lib/ui/Container.svelte";
    import Eyebrow from "$lib/ui/Eyebrow.svelte";
    import Heading from "$lib/ui/Heading.svelte";
    import Link from "$lib/ui/Link.svelte";
    import Prose from "$lib/ui/Prose.svelte";
    import Section from "$lib/ui/Section.svelte";
    import Stack from "$lib/ui/Stack.svelte";
    import type { PageData } from "./$types";

    export let data: PageData;

    $: ({ project, note, previous, next } = data);
</script>

<svelte:head>
    <title>{note.title} — {project.title}</title>
    <meta name="description" content="{project.title}: {note.title}" />
</svelte:head>

<Container size="narrow">
    <Section space="default">
        <Stack gap="md">
            <Link href="/projects/{project.slug}">&larr; {project.title}</Link>

            <Stack gap="sm">
                <Eyebrow>Note</Eyebrow>
                <Heading level={1} size="lg">{note.title}</Heading>
                {#if formatDate(note.date)}
                    <span class="font-mono text-xs text-text-muted">{formatDate(note.date)}</span>
                {/if}
            </Stack>

            <Prose html={note.html} />
        </Stack>
    </Section>

    {#if previous || next}
        <Section space="tight">
            <nav class="flex flex-wrap justify-between gap-4 border-t border-border pt-8">
                {#if previous}
                    <Link href="/projects/{project.slug}/{previous.slug}">
                        &larr; {previous.title}
                    </Link>
                {:else}
                    <span></span>
                {/if}

                {#if next}
                    <Link href="/projects/{project.slug}/{next.slug}">{next.title} &rarr;</Link>
                {/if}
            </nav>
        </Section>
    {/if}
</Container>
