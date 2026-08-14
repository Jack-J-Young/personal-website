<script lang="ts">
    import ButtonLink from "$lib/ui/ButtonLink.svelte";
    import Card from "$lib/ui/Card.svelte";
    import Container from "$lib/ui/Container.svelte";
    import Eyebrow from "$lib/ui/Eyebrow.svelte";
    import Heading from "$lib/ui/Heading.svelte";
    import Section from "$lib/ui/Section.svelte";
    import Stack from "$lib/ui/Stack.svelte";
    import Text from "$lib/ui/Text.svelte";
</script>

<svelte:head>
    <title>Jack Young</title>
    <meta name="description" content="My personal website for my projects" />
</svelte:head>

<Container>
    <Section space="loose">
        <Stack gap="lg">
            <Stack gap="sm">
                <Heading level={1}>Jack Young</Heading>
                <div class="max-w-xl">
                    <Text size="lg" muted>
                        Software developer and Maker
                    </Text>
                </div>
            </Stack>
        </Stack>
    </Section>

    <Section space="tight">
        <Stack gap="md">
            <Eyebrow>Projects</Eyebrow>

            <a href="/whiteboard" class="block rounded-lg">
                <Card padded={false} interactive>
                    <div class="grid gap-0 sm:grid-cols-2">
                        <img
                            src="/whiteboard_processor_example.png"
                            alt="A whiteboard beside its processed, cleaned-up version"
                            class="h-full w-full object-cover" />
                        <div class="flex flex-col justify-center gap-3 p-6 sm:p-8">
                            <Heading level={2} size="md">Whiteboard processor</Heading>
                            <Text muted>
                                A web app for cleaning up photos of whiteboards and pages —
                                straighten the perspective, drop the background, keep the ink.
                            </Text>
                            <span class="font-mono text-sm text-accent">Try it &rarr;</span>
                        </div>
                    </div>
                </Card>
            </a>

            <a href="/guitar" class="block rounded-lg">
                <Card interactive>
                    <div class="flex flex-col gap-3">
                        <Heading level={2} size="md">Guitar tools</Heading>
                        <Text muted>
                            A tuner and a chord recogniser that run on your own microphone, on the
                            way to a trainer that times your chord changes and drills the slow ones.
                        </Text>
                        <span class="font-mono text-sm text-accent">Try it &rarr;</span>
                    </div>
                </Card>
            </a>
        </Stack>
    </Section>
</Container>
