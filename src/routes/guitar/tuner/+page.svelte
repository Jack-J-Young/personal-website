<script lang="ts">
    import Container from "$lib/ui/Container.svelte";
    import Eyebrow from "$lib/ui/Eyebrow.svelte";
    import Heading from "$lib/ui/Heading.svelte";
    import Section from "$lib/ui/Section.svelte";
    import Stack from "$lib/ui/Stack.svelte";
    import Text from "$lib/ui/Text.svelte";
    import MicrophoneGate from "$lib/guitar/MicrophoneGate.svelte";
    import StringGuide from "$lib/guitar/StringGuide.svelte";
    import TunerDial from "$lib/guitar/TunerDial.svelte";
    import {
        PitchHistory,
        SustainedValue,
        detectPitch,
        nearestString,
        noteFromFrequency,
        type AudioCapture,
        type GuitarString,
        type Note,
    } from "$lib/audio";

    /**
     * Four periods of the open low E at 82Hz. Pitch detection compares the signal against
     * delayed copies of itself, so it needs several whole periods of the lowest note it is
     * expected to find — and that is a span of time, not a number of samples.
     */
    const MIN_WINDOW_SECONDS = 0.05;

    const TOLERANCE_CENTS = 5;

    /**
     * How long one string has to stay in tune before it is ticked off.
     *
     * A single frame's agreement is not evidence: a string crossing through pitch as it settles,
     * or one stray reading during the noisy attack of a pluck, both land on "in tune" for an
     * instant — and can land there while the *wrong* string is nearest, ticking off one that was
     * never touched. Marking is the one thing here that cannot be taken back by playing again, so
     * it is the one thing that waits.
     */
    const HOLD_MS = 1000;

    let note: Note | null = null;
    let string: GuitarString | null = null;
    let inTune = false;
    let done: number[] = [];
    let holding = 0;

    let history = new PitchHistory();
    let steady = new SustainedValue<number>(HOLD_MS);

    /**
     * A string that has decayed to nothing shouldn't leave the last reading on screen looking
     * live, but clearing on the first missed frame makes the display strobe during the quiet part
     * of a pluck. So silence has to persist before it counts.
     */
    const SILENT_FRAMES_BEFORE_CLEARING = 30;
    let silentFrames = 0;

    function onFrame(capture: AudioCapture) {
        let reading = detectPitch(capture.readTimeDomain(), capture.sampleRate);

        if (!reading) {
            silentFrames++;
            if (silentFrames > SILENT_FRAMES_BEFORE_CLEARING) clear();
            return;
        }

        silentFrames = 0;
        history.add(reading.frequency);

        let settled = history.settled();
        if (settled == null) return;

        note = noteFromFrequency(settled);
        string = nearestString(settled);
        inTune = Math.abs(note.cents) <= TOLERANCE_CENTS;

        // The dial itself stays live — waiting to *mark* a string is useful, waiting to show you
        // which way to turn the peg would just make the tuner feel broken.
        let now = performance.now();
        let tuned = steady.offer(inTune ? string.number : null, now);
        holding = steady.progress(now);

        if (tuned != null && !done.includes(tuned)) done = [...done, tuned];
    }

    function clear() {
        history.clear();
        steady.clear();
        note = null;
        string = null;
        inTune = false;
        holding = 0;
    }

    function reset() {
        clear();
        done = [];
    }
</script>

<svelte:head>
    <title>Guitar tuner</title>
    <meta name="description" content="A chromatic guitar tuner that runs in your browser" />
</svelte:head>

<Container size="narrow">
    <Section>
        <Stack gap="lg">
            <Stack gap="sm">
                <Eyebrow>Tool</Eyebrow>
                <Heading level={1}>Tuner</Heading>
                <Text size="lg" muted>
                    Play one string at a time. The dial reads the nearest note chromatically, so it
                    works in any tuning — the six boxes below just show where standard tuning sits.
                </Text>
            </Stack>

            <MicrophoneGate
                minWindowSeconds={MIN_WINDOW_SECONDS}
                read={onFrame}
                {reset}
                startLabel="Start tuning">
                <div class="display">
                    <TunerDial {note} tolerance={TOLERANCE_CENTS} />
                    <StringGuide active={string} {inTune} {done} {holding} />
                </div>
            </MicrophoneGate>
        </Stack>
    </Section>
</Container>

<style>
    .display {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2rem;
        padding: 1rem 0;
    }
</style>
