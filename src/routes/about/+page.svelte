<script lang="ts">
    import profilePicture from "./assets/portrait.png";

    import Container from "$lib/ui/Container.svelte";
    import Eyebrow from "$lib/ui/Eyebrow.svelte";
    import Heading from "$lib/ui/Heading.svelte";
    import Section from "$lib/ui/Section.svelte";
    import SocialLinks from "$lib/ui/SocialLinks.svelte";
    import Stack from "$lib/ui/Stack.svelte";
    import Text from "$lib/ui/Text.svelte";
</script>

<svelte:head>
    <title>About</title>
    <meta name="description" content="About Jack Young and jackyoung.xyz" />
</svelte:head>

<Container size="narrow">
    <Section space="loose">
        <Stack gap="lg">
            <div class="flex flex-col gap-6 sm:flex-row sm:items-center">
                <img
                    src={profilePicture}
                    alt="Jack Young"
                    class="h-28 w-28 shrink-0 rounded-full border border-border object-cover" />

                <Stack gap="sm">
                    <Eyebrow>About</Eyebrow>
                    <Heading level={1} size="lg">Jack Young</Heading>
                    <Text muted>
                        Software engineer, maker.
                    </Text>
                </Stack>
            </div>

            <Stack gap="sm">
                <Heading level={2} size="sm">Contact</Heading>
                <SocialLinks />
            </Stack>
        </Stack>
    </Section>
</Container>
