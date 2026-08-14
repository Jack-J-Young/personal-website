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
worth answering first, and it is the same question as
[the sensitivity slider's](#sensitivity-is-not-remembered-between-visits) — both want somewhere to
put per-user practice state, and inventing that twice would be a mistake.

## Sensitivity is not remembered between visits
`planned` `low` `src/lib/guitar/Sensitivity.svelte` `src/lib/guitar/sensitivity.ts`

The slider starts at the default every time a page is loaded, so anyone whose setup needs a
different value has to set it again on each visit — now on two pages rather than one.

`src/lib/theme.ts` already establishes the pattern: a store initialised from `localStorage` behind
a browser check. The reason it is not done yet is that the right thing to remember may not be the
slider position. A "listen for a few seconds and set it from what you played" button would set it
better than the user can, and would make persistence a detail rather than the feature.

The trainer's sound toggle has the same gap and no such excuse — a setting whose whole purpose is
"not right now, I am in a shared room" is the one most annoying to reset on every visit. It is
listed here rather than separately because both want the same piece of machinery.

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
