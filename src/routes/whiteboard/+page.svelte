<script lang="ts">
    import BeforeAfterImageSlider from "$lib/BeforeAfterImageSlider.svelte";
    import ButtonLink from "$lib/ui/ButtonLink.svelte";
    import Card from "$lib/ui/Card.svelte";
    import Container from "$lib/ui/Container.svelte";
    import Eyebrow from "$lib/ui/Eyebrow.svelte";
    import Heading from "$lib/ui/Heading.svelte";
    import Section from "$lib/ui/Section.svelte";
    import Stack from "$lib/ui/Stack.svelte";
    import Text from "$lib/ui/Text.svelte";

    const changes = [
        "You can now chose not to perspective transform the image before uploading",
        "Selecting more than 4 points no longer resets all points",
        "If you select more than 4 points, the closes point will be moved instead",
        "Added an option to manually reset transform points",
        "Added image viewer with zooming and panning with mouse and ui controlls",
        "In the session you can change the processing options",
        "In the session a low-res preview is show and updated from options",
        "Added option: transparent mode",
        "Added option: dark mode (invert and hue-shift)",
        "Added download and copy to clipboard buttons after processing image",
    ];
</script>

<svelte:head>
    <title>Whiteboard processor</title>
    <meta name="description" content="A web app for processing pictures of whiteboards" />
</svelte:head>

<Container>
    <Section space="loose">
        <div class="grid items-center gap-10 lg:grid-cols-2">
            <Stack gap="lg">
                <Stack gap="sm">
                    <Eyebrow>Project</Eyebrow>
                    <Heading level={1}>Whiteboard processor</Heading>
                    <Text size="lg" muted>
                        A web app for processing pictures of whiteboards and pages.
                    </Text>
                </Stack>

                <div>
                    <ButtonLink href="/whiteboard/s/" size="lg">Start</ButtonLink>
                </div>
            </Stack>

            <Stack gap="sm">
                <Card padded={false}>
                    <BeforeAfterImageSlider
                        before="/wb-before.png"
                        after="/wb-after.png"
                        beforeAlt="A whiteboard before processing"
                        afterAlt="The same whiteboard after processing"
                        position={55} />
                </Card>
                <Text size="sm" muted>Drag to compare, or use the arrow keys.</Text>
            </Stack>
        </div>
    </Section>

    <Section space="tight">
        <div class="grid gap-10 md:grid-cols-2">
            <Stack gap="sm">
                <Heading level={2} size="sm">About</Heading>
                <Text muted>
                    This is a image processor for whiteboards and pages, I'm currently rolling out
                    a new UI so there are bugs and lots of the assests and styling is placeholder.
                    However the functionality is all there and the UX is a huge improvement over
                    the previous version.
                </Text>

                <div class="pt-4">
                    <Heading level={2} size="sm">Privacy</Heading>
                </div>
                <Text muted>
                    Current files are stored until I delete them, this will be changes so after a
                    period of inactivity on you session it will auto-delete aswell as options to
                    delete the session manually.
                </Text>
            </Stack>

            <Stack gap="sm">
                <Heading level={2} size="sm">Changes</Heading>
                <ul class="flex flex-col gap-2">
                    {#each changes as change}
                        <li class="flex gap-3 text-base leading-relaxed text-text-muted">
                            <span aria-hidden="true" class="select-none text-accent">&bull;</span>
                            <span>{change}</span>
                        </li>
                    {/each}
                </ul>
            </Stack>
        </div>
    </Section>
</Container>
