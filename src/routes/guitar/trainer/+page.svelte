<script lang="ts">
    import Button from "$lib/ui/Button.svelte";
    import Card from "$lib/ui/Card.svelte";
    import Container from "$lib/ui/Container.svelte";
    import Eyebrow from "$lib/ui/Eyebrow.svelte";
    import Heading from "$lib/ui/Heading.svelte";
    import Section from "$lib/ui/Section.svelte";
    import Stack from "$lib/ui/Stack.svelte";
    import Text from "$lib/ui/Text.svelte";
    import Acceptance from "$lib/guitar/Acceptance.svelte";
    import ChordPrompt from "$lib/guitar/ChordPrompt.svelte";
    import ChordSets from "$lib/guitar/ChordSets.svelte";
    import MicrophoneGate from "$lib/guitar/MicrophoneGate.svelte";
    import ScoreBoard from "$lib/guitar/ScoreBoard.svelte";
    import Sensitivity from "$lib/guitar/Sensitivity.svelte";
    import Timeline from "$lib/guitar/Timeline.svelte";
    import {
        DEFAULT_SETS,
        chordsIn,
        judgeAttempt,
        leadBarFor,
        pickNext,
        type Attempt,
        type DrillChord,
        type Strum,
    } from "$lib/guitar/practice";
    import { CHIME_MS, startChimes, type Chimes } from "$lib/guitar/chime";
    import { attackLevelFor, windowLevelFor } from "$lib/guitar/sensitivity";
    import { acceptance, sensitivity } from "$lib/guitar/settings";
    import { withinSpan, type LevelSample, type TimelineMark } from "$lib/guitar/timeline";
    import {
        OnsetDetector,
        bassPitchClass,
        foldToChroma,
        matchChords,
        noteEnergies,
        suppressHarmonics,
        type AudioCapture,
    } from "$lib/audio";

    /** Resolving a guitar's closest pair of notes; the reasoning is on the chord recogniser. */
    const MAX_BIN_WIDTH = 1.5;

    const ENVELOPE_SECONDS = 0.05;
    const TIMELINE_SPAN_MS = 6000;

    let detector = new OnsetDetector();

    $: leadBar = leadBarFor($acceptance);

    $: attackLevel = attackLevelFor($sensitivity);
    $: detector.floor = attackLevel;
    $: minLevel = windowLevelFor($sensitivity);

    let trace: LevelSample[] = [];
    let marks: TimelineMark[] = [];
    let clock = 0;
    let gathering: number | null = null;

    // Recomputed by `retarget` rather than reactively, because the first prompt is drawn from it
    // in this same block and a `$:` has not run by then.
    let sets = DEFAULT_SETS;
    let pool = chordsIn(sets);

    let target: DrillChord = pool[0];
    let upcoming: DrillChord = pool[1];
    let strums = 0;
    let missed: Attempt | null = null;
    let result: { chord: string; ms: number | null } | null = null;

    /**
     * The strum that landed the previous chord, which is where the clock starts.
     *
     * Null breaks the chain — at the start of a session, and after a skip — because a change is
     * measured between two chords and there is no honest number without both of them.
     */
    let previous: { chord: string; onset: number } | null = null;

    let history: Strum[] = [];
    let streak = 0;
    let bestStreak = 0;

    /** Landings outnumber timings — the first of a session has nothing to be timed from. */
    $: timed = history.filter((strum) => strum.ms !== null).length;

    let sound = true;
    let fingering = false;
    let chimes: Chimes | null = null;

    /**
     * When the microphone can be believed again.
     *
     * A tone played through a speaker is audio the microphone is about to hear, and it arrives
     * once the chord that triggered it has decayed — which is exactly the shape the onset
     * detector is looking for. Left un-ignored it can name itself a strum, be judged against the
     * new prompt, miss, and chime again.
     */
    let deafUntil = 0;

    function begin() {
        history = [];
        streak = 0;
        bestStreak = 0;
        previous = null;
        result = null;
        deafUntil = 0;
        chimes = startChimes();

        upcoming = pickNext(pool, null);
        advance();
    }

    /**
     * Ticking a set mid-session can leave a prompt from one that was just unticked. Only the
     * chords that fell out of the pool are redrawn: asking for a chord the player has just said
     * they don't want is the one thing the control must not do, and redrawing a preview that is
     * still valid would break the promise that the preview is what arrives next.
     */
    function retarget() {
        pool = chordsIn(sets);
        if (!pool.includes(upcoming)) upcoming = pickNext(pool, target);
        if (!pool.includes(target)) advance();
    }

    function announce(landed: boolean) {
        if (!sound || !chimes) return;

        if (landed) chimes.right();
        else chimes.wrong();

        deafUntil = performance.now() + CHIME_MS;
    }

    /** Promotes the preview to the prompt and draws a new one behind it. */
    function advance() {
        target = upcoming;
        upcoming = pickNext(pool, target);
        strums = 0;
        missed = null;
    }

    /**
     * Skipping honours the preview — the chord shown as next is the one that arrives — because a
     * preview that can be overruled is worse than none. The chain breaks, so the change across a
     * skip goes untimed.
     */
    function skip() {
        streak = 0;
        previous = null;
        result = null;
        advance();
    }

    function onFrame(capture: AudioCapture) {
        let now = performance.now();
        clock = now;

        let level = capture.readLevel(ENVELOPE_SECONDS);
        trace.push({ time: now, level });
        trace = withinSpan(trace, now, TIMELINE_SPAN_MS);

        // Skipped rather than offered-and-ignored, so the chime never starts a refractory period
        // that would swallow the strum right after it.
        if (now >= deafUntil && detector.offer(level, now)) {
            gathering = now;
            marks.push({ time: now, label: null });
        }

        marks = withinSpan(marks, now, TIMELINE_SPAN_MS);

        if (gathering !== null && now - gathering >= capture.windowSeconds * 1000) {
            assess(capture, gathering);
            gathering = null;
        }
    }

    /**
     * Judges the window that has just filled against the chord on screen.
     *
     * Both ends of the measurement are *strums*, not the moments they were named — naming takes a
     * whole analysis window, and charging the player for the tool's own latency would add three
     * quarters of a second to every change. The bias is identical at both ends, so it cancels.
     */
    function assess(capture: AudioCapture, onset: number) {
        if (capture.readLevel() < minLevel) return;

        strums++;

        let energies = suppressHarmonics(noteEnergies(capture.readSpectrum(), capture.sampleRate));
        let chroma = foldToChroma(energies);

        let best = matchChords(chroma, { bass: bassPitchClass(energies) })[0] ?? null;
        // The same bar decides whether the recogniser will name a strum at all. Leaving it fixed
        // while acceptance moved would give a quiet player "too quiet to name" in place of the
        // verdict they had just asked for.
        let recognisable = best && best.score >= leadBar ? best : null;
        let attempt = judgeAttempt(target, chroma, recognisable, $acceptance);

        let name = recognisable?.name ?? null;
        marks = marks.map((mark) => (mark.time === onset ? { ...mark, label: name } : mark));

        // Recorded whether or not it landed, so the board can say how often the hand goes to the
        // wrong shape — but only when the recogniser named something. A strum too quiet or too
        // short to identify is evidence about the playing, not about the chord.
        if (recognisable !== null) {
            history = [...history, {
                chord: target.label,
                from: previous?.chord ?? null,
                ms: attempt.accepted && previous !== null ? onset - previous.onset : null,
                landed: attempt.accepted,
            }];
        }

        if (!attempt.accepted) {
            missed = attempt;
            announce(false);
            return;
        }

        result = { chord: target.label, ms: previous === null ? null : onset - previous.onset };
        previous = { chord: target.label, onset };

        // Counting only the chords found first time: a streak that survives any number of wrong
        // strums is just a count of prompts, and measures nothing.
        streak = strums === 1 ? streak + 1 : 0;
        bestStreak = Math.max(bestStreak, streak);

        announce(true);
        advance();
    }

    function reset() {
        chimes?.stop();
        chimes = null;
        deafUntil = 0;

        detector.clear();
        trace = [];
        marks = [];
        gathering = null;
        missed = null;
        result = null;
        previous = null;
        strums = 0;
    }
</script>

<svelte:head>
    <title>Chord trainer</title>
    <meta name="description" content="Prompts a chord, times how long you take to play it" />
</svelte:head>

<Container size="narrow">
    <Section>
        <Stack gap="lg">
            <Stack gap="sm">
                <Eyebrow>Tool</Eyebrow>
                <Heading level={1}>Chord trainer</Heading>
                <Text size="lg" muted>
                    It asks for a chord and shows you the one after it, so what you are practising
                    is the change rather than the chord. A rising chime means it landed and a
                    falling one means it didn't, so you can keep your eyes on the fretboard. Each
                    change is timed from strum to strum, and the table at the bottom says which
                    ones are holding you up.
                </Text>
            </Stack>

            <ChordSets bind:selected={sets} changed={retarget} />

            <MicrophoneGate
                maxBinWidth={MAX_BIN_WIDTH}
                read={onFrame}
                {begin}
                {reset}
                startLabel="Start practising">
                <div class="display">
                    <ChordPrompt
                        {target}
                        {upcoming}
                        {result}
                        {missed}
                        {streak}
                        {fingering}
                        listening={gathering !== null} />

                    <div class="controls">
                        <Button variant="ghost" size="sm" on:click={skip}>Skip this one</Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            on:click={() => (fingering = !fingering)}>
                            Fingering: {fingering ? "on" : "off"}
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            on:click={() => (sound = !sound)}>
                            Sound: {sound ? "on" : "off"}
                        </Button>
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
                        <Acceptance bind:value={$acceptance} />
                    </div>
                </div>
            </MicrophoneGate>

            {#if history.length > 0}
                <Card>
                    <Stack gap="md">
                        <Stack gap="sm">
                            <Heading level={2} size="sm">This session</Heading>
                            <Text size="sm" muted>
                                {timed}
                                {timed === 1 ? "change" : "changes"} timed, best run of
                                {bestStreak} found first time. Slowest at the top — those are the
                                ones worth drilling. Changes are the honest unit and fill up more
                                slowly; any column sorts, and sorts the other way if you click it
                                again.
                            </Text>
                        </Stack>

                        <ScoreBoard {history} />
                    </Stack>
                </Card>
            {/if}
        </Stack>
    </Section>

    <Section space="tight">
        <Stack gap="sm">
            <Heading level={2} size="sm">What it can and cannot check</Heading>
            <Text muted>
                <strong>It hears chords, not hands.</strong> An E-shape barre at the fifth fret and
                an open A are the same six notes, so nothing in the audio could tell them apart —
                asked for a barre chord, you can play the open one and it will pass. The barre set
                is a prompt and a diagram, not a check. Ticking it alongside the open chords is
                still the useful thing to do, because G&nbsp;→&nbsp;Bm is the change that stops
                people and it does not exist inside either set on its own.
            </Text>
            <Text muted>
                Power chords go the other way and are checked properly. A D5 is two of the three
                notes in a D, so a full D scores about 81% against it — under the 85% bar, since
                the D wins the ranking outright. Asked for D5 and handed a D, it says no.
            </Text>
            <Text muted>
                <strong>Fingering is off by default</strong>, and that is the point: a diagram
                under every prompt turns the drill into copying, and the times stop measuring
                whether you remember the shape. Turn it on when a barre chord is new, off once it
                isn't.
            </Text>
        </Stack>
    </Section>

    <Section space="tight">
        <Stack gap="sm">
            <Heading level={2} size="sm">What counts as playing it</Heading>
            <Text muted>
                A strum passes if the chord asked for scores at least {Math.round($acceptance * 100)}%,
                or at least {Math.round(leadBar * 100)}% when it is also the best match found. Two
                bars rather than one, because coming first is itself evidence: a chord that won
                only has to be plausible, and one that came second has to be convincing on its own.
            </Text>
            <Text muted>
                The acceptance slider moves both — a quiet guitar, a laptop microphone across the
                room, or a room with something else going on in it all cost a few percent, and a
                tool that fails chords you know you played is worse than one set a little loose.
                One control rather than two, because the second bar follows the first: the two are
                the same question asked of different evidence, and reconciling two confidence
                sliders is not a job to hand anyone.
            </Text>
            <Text muted>
                The point of the second bar is that a chord can be played and still lose. A major
                whose third came out quiet — a muted B string, a thumb not quite clearing the fret
                — fits the power chord's two-note template more closely than its own three-note
                one, because the template beating it is the one that never asked for the note that
                went missing. Asked for D and told D5, you played a D, so it counts.
            </Text>
            <Text muted>
                It is not generous about the third being wrong rather than quiet. An Am scored
                against A reaches about 69%, which is the mistake a drill exists to catch — and it
                is also where the slider stops being forgiving and starts being wrong. Below 70%
                that mistake begins to pass. The slider goes there anyway, because a bad microphone
                is a real problem and you know what you played, but the number turns amber when it
                does.
            </Text>
        </Stack>
    </Section>

    <Section space="tight">
        <Stack gap="sm">
            <Heading level={2} size="sm">What the board counts</Heading>
            <Text muted>
                Two groupings of the same session. <strong>Chords</strong> asks whether you know a
                shape; <strong>changes</strong> asks whether you know a move, which is the honest
                unit — C&nbsp;→&nbsp;G and Em&nbsp;→&nbsp;G are not the same difficulty. There are
                eight of the first and fifty-six of the second, so the chord board is readable in a
                couple of minutes and the change board takes a proper session before its ranking
                means anything.
            </Text>
            <Text muted>
                <strong>Error</strong> is how often a strum was recognised as some other chord.
                Only strums the tool could name count either way, so playing too quietly does not
                show up here — it isn't evidence about the chord. Best against average is the
                useful pair: a low best with a high average is a change you can make and haven't
                learned, and it is a different problem from one you have never made at all.
            </Text>
        </Stack>
    </Section>

    <Section space="tight">
        <Stack gap="sm">
            <Heading level={2} size="sm">About the times</Heading>
            <Text muted>
                A time is the gap between the strum that landed the last chord and the strum that
                landed this one — a real chord change, not a reaction test. That only works because
                the next chord is already on screen: you are never timed on reading it.
            </Text>
            <Text muted>
                Both ends are the strum itself, not the moment it was named. Naming needs three
                quarters of a second of audio, and charging you for the tool's own latency would
                add that to every change. It is the same delay at both ends, so it cancels.
            </Text>
            <Text muted>
                That same window is a floor on what can be measured: change inside about a second
                and the first chord never gets a clean window to be recognised in, so it will not
                register at all. Wait for the chime, then change — which means letting each chord
                ring and moving your hand while it does, the thing worth practising anyway.
            </Text>
            <Text muted>
                Part of that second is the tone itself. Anything played through a speaker is audio
                the microphone is about to hear, so the strum detector is deliberately deaf for as
                long as a chime can be heard for — otherwise a chime landing on a chord that has
                decayed looks exactly like a new strum. Turning the sound off removes that pause
                along with the tones.
            </Text>
            <Text muted>
                The first chord of a session has nothing to be timed from, so it isn't. Neither is
                the one after a skip. Wrong strums cost nothing except the streak, which only
                counts chords found on the first attempt, and if nothing registers at all your
                playing is not clearing the dashed band — the sensitivity slider moves it.
            </Text>
        </Stack>
    </Section>
</Container>

<style>
    .display {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1.5rem;
        padding: 1rem 0;
    }

    .controls {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 0.5rem;
    }

    .listening {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        width: 100%;
    }
</style>
