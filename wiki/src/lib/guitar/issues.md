# guitar issues

See the [wiki index](../../../README.md#issues) for the tag format.

## The drill does not choose what to drill
`planned` `medium` `src/lib/guitar/practice.ts`

The trainer prompts at random. It ranks the chords you have played by how long they take you —
which is the evidence the choice should be made from — and then ignores that ranking when picking
the next one.

`chordScores` and `transitionScores` already produce the ranking, and `sortScores` already puts
the worst at the top, so weighting the draw towards it is a small change to `pickNext`. What makes
it worth thinking about rather than just doing is that a drill which only ever asks for your worst
chord stops being playable: the useful version keeps the easy ones in the mix, and needs some
notion of how much evidence a ranking rests on before acting on it. One slow attempt is not
grounds for hammering that chord for ten minutes.

Which ranking to draw from is the second question, and the two boards disagree by design.
Weighting by chord over-drills a shape that is only slow out of one particular chord; weighting by
change is what the player actually wants and needs
[far more evidence per row](README.md#the-two-boards) — fifty-six of them against eight. A draw
that used the change board early in a session would be chasing single attempts.

## A barre chord cannot be checked, only asked for
`known` `medium` `src/lib/guitar/practice.ts`

An E-shape barre at the fifth fret and an open A are the same six notes. Nothing in a chroma could
tell them apart, so the drill accepts an open chord where it asked for a barre one, and the times
and error rates on the barre set are about the *chord* rather than the shape.

This is a property of listening to pitch, not a bug to be fixed there. A tool that could tell them
apart would need to hear something other than which notes are sounding — the attack of six strings
under one finger differs from four strings and two open ones, and so does the sustain — and that
is a different instrument from the one this is built on.

Recorded rather than solved because the honest response was to say so on the page and pick a
default that respects it: the set is offered with its diagram, and the page states plainly that
the barre set is a prompt rather than a check. What would be wrong is presenting a barre time as
if it had been verified.

The [fingering toggle](README.md#fingering-off-by-default) is the closest thing to a mitigation —
if you cannot be checked on the shape, at least you can be shown it.

## Changing early and playing the wrong shape are the same error
`open` `medium` `src/routes/guitar/trainer/+page.svelte` `src/lib/guitar/practice.ts`

The error column counts any strum named as a chord other than the one asked for. Reaching for the
previewed chord too early is one of those, so a player whose hands are ahead of the drill collects
an error rate that says nothing about whether they know the shapes.

The two are already told apart on screen —
[the prompt names it](README.md#what-it-says-when-a-strum-doesnt-land) rather than reporting a low
score — so the information exists at the moment the `Strum` is recorded and is thrown away. The
fix is a third outcome rather than a flag: "wrong chord" and "right chord, too soon" want counting
separately, because the practice they call for is opposite. One says drill the shape; the other
says you are ready for a faster tempo.

It is left open rather than done because the counting rule is the easy half. What a board with two
error columns looks like, on six columns that
[already scroll on a phone](README.md#scoreboard), is not.

## A session is lost when you stop listening
`open` `low` `src/routes/guitar/trainer/+page.svelte`

Starting the microphone clears the history, so stopping and starting throws away the times. The
scoreboard survives on screen after a stop, which makes this worse rather than better: what is
being looked at is about to be discarded, and nothing says so.

Keeping it across a restart is a one-line change. Keeping it across a *visit* is the question
worth answering first, and it is a bigger one than
[the sliders'](README.md#settings-that-survive-a-reload): a setting is one number that the newest
value always wins, and a session is a growing list where the interesting question — is this chord
getting faster — needs the old ones kept and dated.

## The toggles are not remembered, only the sliders are
`open` `low` `src/routes/guitar/trainer/+page.svelte` `src/lib/guitar/settings.ts`

[`settings.ts`](README.md#settings-that-survive-a-reload) remembers sensitivity and acceptance. The
trainer's three switches — the chord sets, the fingering toggle and the sound toggle — still reset
on every load.

The sets are the worst of them: every visit starts on the open chords, which is exactly wrong for
someone who came back to drill barre chords. Sound is a close second, since a setting whose whole
purpose is "not right now, I am in a shared room" is the one most annoying to reset.

What is left is genuinely small — the machinery exists, and the only reason `remembered` did not
cover these too is that it stores a number and these are a list of strings and two booleans. A
second constructor beside it is a few lines.

## The sensitivity slider is still a guess
`planned` `low` `src/lib/guitar/Sensitivity.svelte` `src/lib/guitar/sensitivity.ts`

Persisting it removed the daily annoyance but not the underlying one: the player still has to
find a good value by moving a slider and watching a dashed band, once.

A "listen for a few seconds and set it from what you played" button would set it better than they
can, and would turn the slider into a fallback rather than the interface. The same argument does
not apply to [acceptance](README.md#acceptance-is-a-control-for-the-same-reason-sensitivity-is),
which is a judgement about how strict to be rather than a measurement.

## Every chord has one fingering
`planned` `low` `src/lib/guitar/shapes.ts` `src/lib/guitar/practice.ts`

`DrillChord` carries a single `ChordShape`, so the diagram shows one way of playing each chord.
Several of them have more than one worth knowing — G with the ring and little fingers on the top
two strings, C as an A-shape barre at the third fret, Dm without the barre — and the diagram
currently asserts one of them by omission.

The type is ready for it: nothing about `ChordShape`, `fretWindow` or `barresOf` cares how many
there are, and a `shapes: ChordShape[]` with the first as the default is a small change. What is
not decided is the interface. Alternatives are only useful if they can be *chosen*, and a picker
inside the prompt is the last place a control should go — the prompt is what the player is looking
at while their hands are busy.

## Nothing tells you the chime is why a fast change did not register
`open` `low` `src/routes/guitar/trainer/+page.svelte` `src/lib/guitar/chime.ts`

Turning the sound on lowers how fast you can change chords, because the microphone is ignored for
`CHIME_MS` after every tone. Nothing on screen says so, and the symptom — a strum that produces no
tick at all — looks the same as playing too quietly.

The page copy explains it, which is not the same as noticing it. The honest fix is probably to
draw the deaf window on the timeline the way
[the sensitivity threshold is drawn](README.md#sensitivity): it is the same class of invisible
rule, and the same argument applies that a threshold you can see is one you can aim at.

## Both listening pages carry their own copy of the frame loop
`open` `low` `src/routes/guitar/chords/+page.svelte` `src/routes/guitar/trainer/+page.svelte`

Appending to the trace, offering the level to the onset detector, trimming what has scrolled off
and waiting a window before analysing is about fifteen lines, and the recogniser and the trainer
each hold their own copy. The pure parts are already shared — `withinSpan`, `sensitivity.ts`,
`OnsetDetector` — so what is duplicated is the wiring between them.

It was left duplicated deliberately. The state involved is four reassigned variables that Svelte 4
tracks by assignment, and the obvious extractions either hide those behind a class that then needs
`watcher = watcher` after every mutation, or turn the loop into a component the page drives
through `bind:this` and reads back through events. Both are more machinery than the fifteen lines
they replace, for two callers.

A third listening tool is the point at which that stops being true.
