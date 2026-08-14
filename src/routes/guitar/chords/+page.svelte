<script lang="ts">
    import Container from "$lib/ui/Container.svelte";
    import Eyebrow from "$lib/ui/Eyebrow.svelte";
    import Heading from "$lib/ui/Heading.svelte";
    import Section from "$lib/ui/Section.svelte";
    import Stack from "$lib/ui/Stack.svelte";
    import Text from "$lib/ui/Text.svelte";
    import ChromaBars from "$lib/guitar/ChromaBars.svelte";
    import MicrophoneGate from "$lib/guitar/MicrophoneGate.svelte";
    import Sensitivity from "$lib/guitar/Sensitivity.svelte";
    import Timeline from "$lib/guitar/Timeline.svelte";
    import { attackLevelFor, windowLevelFor } from "$lib/guitar/sensitivity";
    import { sensitivity } from "$lib/guitar/settings";
    import { withinSpan, type LevelSample, type TimelineMark } from "$lib/guitar/timeline";
    import {
        OnsetDetector,
        bassPitchClass,
        foldToChroma,
        matchChords,
        noteEnergies,
        suppressHarmonics,
        type AudioCapture,
        type ChordMatch,
    } from "$lib/audio";

    /**
     * The open low E and the F a semitone above it are 4.9Hz apart, the closest pair a guitar
     * produces. Bins have to be several times narrower than that, not merely narrower: a strong
     * partial spreads into its neighbours, so with only two or three bins to a semitone the skirt
     * of one note fills the band of the next and invents a chord tone that was never played.
     *
     * The cost is time, and it is not negotiable — resolving 5Hz takes at least a fifth of a
     * second of audio whatever the implementation.
     */
    const MAX_BIN_WIDTH = 1.5;

    const MIN_SCORE = 0.7;

    /**
     * The span the onset detector and the drawn trace measure loudness over, deliberately
     * unrelated to the analysis window. An attack lasts tens of milliseconds; averaging it over
     * the three quarters of a second the chromagram needs would erase it.
     */
    const ENVELOPE_SECONDS = 0.05;

    /** Long enough to hold a few chord changes, so a run of them can be looked at together. */
    const TIMELINE_SPAN_MS = 6000;

    let detector = new OnsetDetector();

    $: attackLevel = attackLevelFor($sensitivity);
    $: detector.floor = attackLevel;
    $: minLevel = windowLevelFor($sensitivity);

    let trace: LevelSample[] = [];
    let marks: TimelineMark[] = [];
    let clock = 0;

    /** The onset waiting for the analysis window to fill with nothing but its chord. */
    let gathering: number | null = null;

    let chroma: Float32Array | null = null;
    let displayed: ChordMatch | null = null;
    let alternatives: ChordMatch[] = [];

    $: highlight = displayed
        ? displayed.quality.intervals.map((interval) => (displayed!.root + interval) % 12)
        : [];

    /**
     * One reading per strum, taken when the whole window is the chord.
     *
     * Analysing every frame instead means analysing windows that are part silence, part the chord
     * before, and part however many strings the pick has reached — which is where the flicker of
     * plausible wrong answers on the way to the right one came from. The strum is timed here, and
     * named a window later.
     */
    function onFrame(capture: AudioCapture) {
        let now = performance.now();
        clock = now;

        let level = capture.readLevel(ENVELOPE_SECONDS);
        trace.push({ time: now, level });
        trace = withinSpan(trace, now, TIMELINE_SPAN_MS);

        if (detector.offer(level, now)) {
            gathering = now;
            marks.push({ time: now, label: null });
        }

        marks = withinSpan(marks, now, TIMELINE_SPAN_MS);

        if (gathering !== null && now - gathering >= capture.windowSeconds * 1000) {
            identify(capture, gathering);
            gathering = null;
        }
    }

    /** Names the chord in the current window and tags the strum that started it. */
    function identify(capture: AudioCapture, onset: number) {
        if (capture.readLevel() < minLevel) return;

        let energies = suppressHarmonics(noteEnergies(capture.readSpectrum(), capture.sampleRate));
        let heard = foldToChroma(energies);

        let ranked = matchChords(heard, { bass: bassPitchClass(energies) });
        let best = ranked[0];
        if (!best || best.score < MIN_SCORE) return;

        chroma = heard;
        displayed = best;
        alternatives = ranked.slice(1, 4);

        let name = best.name;
        marks = marks.map((mark) => (mark.time === onset ? { ...mark, label: name } : mark));
    }

    function reset() {
        detector.clear();
        trace = [];
        marks = [];
        gathering = null;
        chroma = null;
        displayed = null;
        alternatives = [];
    }
</script>

<svelte:head>
    <title>Chord recogniser</title>
    <meta name="description" content="Detects the chord you are playing, in the browser" />
</svelte:head>

<Container size="narrow">
    <Section>
        <Stack gap="lg">
            <Stack gap="sm">
                <Eyebrow>Tool</Eyebrow>
                <Heading level={1}>Chord recogniser</Heading>
                <Text size="lg" muted>
                    Strum a chord and let it ring. Each strum is timed the moment it lands, then
                    named once there is a clean window of it to look at — it is the part the
                    practice trainer will be built on.
                </Text>
            </Stack>

            <MicrophoneGate
                maxBinWidth={MAX_BIN_WIDTH}
                read={onFrame}
                {reset}
                startLabel="Start listening">
                <div class="display">
                    <div class="chord">
                        <span class="name" class:quiet={!displayed}>
                            {displayed ? displayed.name : "—"}
                        </span>
                        <span class="quality">
                            {#if gathering !== null}
                                listening to that strum…
                            {:else if displayed}
                                {displayed.quality.name} · {Math.round(displayed.score * 100)}%
                                confident
                            {:else}
                                strum a chord
                            {/if}
                        </span>
                    </div>

                    <div class="listening">
                        <Timeline
                            {trace}
                            {marks}
                            now={clock}
                            spanMs={TIMELINE_SPAN_MS}
                            pending={gathering}
                            threshold={attackLevel} />
                        <Sensitivity bind:value={$sensitivity} />
                    </div>

                    <ChromaBars {chroma} {highlight} />

                    {#if alternatives.length > 0}
                        <ul class="alternatives">
                            {#each alternatives as alternative}
                                <li>
                                    <span>{alternative.name}</span>
                                    <span class="score">{Math.round(alternative.score * 100)}%</span>
                                </li>
                            {/each}
                        </ul>
                    {/if}
                </div>
            </MicrophoneGate>
        </Stack>
    </Section>

    <Section space="tight">
        <Stack gap="sm">
            <Heading level={2} size="sm">Reading the timeline</Heading>
            <Text muted>
                The newest audio is at the line on the left, and everything drifts right as it ages.
                Each strum gets a tick where it landed, and the tick is labelled once the chord it
                started has been named. The shaded band is the audio being gathered for that
                reading: it stops growing at the moment the label appears, because that is when the
                window holds nothing but the chord.
            </Text>
            <Text muted>
                A tick that never gets a label is a strum that could not be named — usually one cut
                short, muted, or followed too quickly by the next. Strumming again always wins: the
                reading in progress is abandoned and the clock restarts.
            </Text>
            <Text muted>
                If no ticks appear at all, your playing is not clearing the dashed band, which is
                what this counts as too quiet to be a strum. How loud a strum arrives depends
                entirely on the guitar and where the microphone is sitting, so the sensitivity
                slider is there to move the band rather than to guess a number for you.
            </Text>
        </Stack>
    </Section>

    <Section space="tight">
        <Stack gap="sm">
            <Heading level={2} size="sm">What it can and can't tell apart</Heading>
            <Text muted>
                Matching works from the set of notes sounding, with no sense of which is on the
                bottom beyond a nudge from the lowest one it can find. Some chords are genuinely
                the same set of notes: Csus2 and Gsus4 are both C, D and G, and an augmented triad
                is identical to the two others a third away from it. Inversions and slash chords
                read as the plain chord.
            </Text>
            <Text muted>
                It is also honest about ambiguity rather than confident: the runner-up list is
                there so a wrong answer shows its reasoning, and the bars show exactly which notes
                it thought it heard.
            </Text>
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

    .chord {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
    }

    .listening {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        width: 100%;
    }

    .name {
        font-family: var(--font-mono);
        font-size: 4rem;
        line-height: 1;
        font-weight: 600;
        color: var(--text);
    }

    .name.quiet {
        color: var(--text-muted);
    }

    .quality {
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-family: var(--font-mono);
        color: var(--text-muted);
    }

    .alternatives {
        display: flex;
        gap: 0.5rem;
        margin: 0;
        padding: 0;
        list-style: none;
    }

    .alternatives li {
        display: flex;
        align-items: baseline;
        gap: 0.375rem;
        padding: 0.25rem 0.625rem;

        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        font-family: var(--font-mono);
        font-size: 0.8125rem;
        color: var(--text-muted);
    }

    .score {
        font-size: 0.6875rem;
        opacity: 0.7;
    }
</style>
