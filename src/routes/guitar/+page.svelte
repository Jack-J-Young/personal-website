<script lang="ts">
    import ButtonLink from "$lib/ui/ButtonLink.svelte";
    import Card from "$lib/ui/Card.svelte";
    import Container from "$lib/ui/Container.svelte";
    import Eyebrow from "$lib/ui/Eyebrow.svelte";
    import Heading from "$lib/ui/Heading.svelte";
    import Section from "$lib/ui/Section.svelte";
    import Stack from "$lib/ui/Stack.svelte";
    import Text from "$lib/ui/Text.svelte";

    const tools = [
        {
            href: "/guitar/trainer",
            name: "Chord trainer",
            description: "Asks for one of the eight open chords and times how long you take to "
                + "play it, then ranks them slowest first.",
        },
        {
            href: "/guitar/tuner",
            name: "Tuner",
            description: "A chromatic tuner. Reads the nearest note and how many cents off it is, "
                + "so it works in any tuning.",
        },
        {
            href: "/guitar/chords",
            name: "Chord recogniser",
            description: "Listens to a strummed chord and works out which one it is, along with "
                + "the notes it thought it heard.",
        },
    ];
</script>

<svelte:head>
    <title>Guitar tools</title>
    <meta name="description" content="Browser guitar tools: a tuner and a chord recogniser" />
</svelte:head>

<Container>
    <Section space="loose">
        <Stack gap="lg">
            <Stack gap="sm">
                <Eyebrow>Project</Eyebrow>
                <Heading level={1}>Guitar</Heading>
                <div class="max-w-xl">
                    <Text size="lg" muted>
                        Tools for practising: a tuner, a chord recogniser, and a trainer that
                        measures how long your chord changes take and hands back the ones you are
                        worst at.
                    </Text>
                </div>
            </Stack>

            <div>
                <ButtonLink href="/guitar/trainer" size="lg">Start practising</ButtonLink>
            </div>
        </Stack>
    </Section>

    <Section space="tight">
        <Stack gap="md">
            <Eyebrow>Tools</Eyebrow>

            <div class="grid gap-5 sm:grid-cols-2">
                {#each tools as tool}
                    <a href={tool.href} class="block rounded-lg">
                        <Card interactive>
                            <Stack gap="sm">
                                <Heading level={2} size="md">{tool.name}</Heading>
                                <Text muted>{tool.description}</Text>
                                <span class="font-mono text-sm text-accent">Try it &rarr;</span>
                            </Stack>
                        </Card>
                    </a>
                {/each}
            </div>
        </Stack>
    </Section>

    <Section space="tight">
        <div class="grid gap-10 md:grid-cols-2">
            <Stack gap="sm">
                <Heading level={2} size="sm">How they fit together</Heading>
                <Text muted>
                    The trainer is the point of the other two. Recognising a chord is the
                    measurement that makes timing a change possible, and the tuner is the same
                    audio path proved out on an easier problem.
                </Text>
                <Text muted>
                    What it does not do yet is choose what to drill. It ranks the chords you have
                    played by how long they take you, which is the evidence for that decision, but
                    the prompts are still drawn at random rather than weighted towards your worst.
                </Text>
            </Stack>

            <Stack gap="sm">
                <Heading level={2} size="sm">Privacy</Heading>
                <Text muted>
                    Everything runs in the browser. The microphone is opened only while a tool is
                    listening, the audio is analysed on the spot, and nothing is recorded, stored
                    or sent anywhere.
                </Text>
                <Text muted>
                    You will need to allow microphone access, and a wired or built-in microphone
                    works better than Bluetooth — most headsets apply noise suppression that
                    removes exactly the sustained tones these tools are looking for.
                </Text>
            </Stack>
        </div>
    </Section>
</Container>
