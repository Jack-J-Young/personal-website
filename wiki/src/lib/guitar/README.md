# guitar/

The UI for the guitar tools, and the practice drill built on top of them.

**All the *signal* reasoning lives in [audio/](../audio/README.md)** — these components start a
microphone, run a loop, and draw what comes back. What is here that isn't drawing is `practice.ts`,
which decides what to ask for and whether you played it. That is a judgement about a drill rather
than about audio, so it deliberately sits on this side of the line.

They are built from [the design system](../ui/README.md) and own no colours beyond the two tokens
[described there](../ui/README.md#tokens).

| Component | Role |
|---|---|
| `MicrophoneGate.svelte` | Owns the whole microphone lifecycle: the start button, permission errors, the frame loop, the input level meter, and stopping. |
| `TunerDial.svelte` | Note name, cents readout, and the needle. |
| `StringGuide.svelte` | The six standard-tuning boxes under the dial. |
| `ChromaBars.svelte` | Twelve bars showing what the chord recogniser actually heard. |
| `Timeline.svelte` | The scrolling loudness trace, with a tag on each strum. |
| `Sensitivity.svelte` | The slider that sets how loud a strum has to be to count. |
| `Acceptance.svelte` | The slider that sets how *close* a strum has to be to count. |
| `ChordPrompt.svelte` | The trainer's face: the chord to play, the one after it, the time, and the streak. |
| `ChordDiagram.svelte` | A chord box — six strings, four frets, dots where the fingers go. |
| `ChordSets.svelte` | Which chords the drill draws from: a box per set, a chip per chord. |
| `ScoreBoard.svelte` | The session's numbers, by chord or by change, sorted on whichever column was clicked. |
| `practice.ts` | The drill: which chords, which one next, whether a strum counts, and what the session adds up to. |
| `shapes.ts` | What a fingering is, and the two things a diagram needs worked out from it. |
| `settings.ts` | The two sliders, as stores that survive a reload. |
| `chime.ts` | The two feedback tones. Impure — it owns an `AudioContext`. |
| `timeline.ts` | The shapes the timeline is drawn from, and the trim that drops what has scrolled off. |
| `sensitivity.ts` | Slider position → the loudness a strum has to reach. |
| `loudness.ts` | RMS mapped to the 0–1 a meter or a waveform should draw. |

[Issues](issues.md)

## MicrophoneGate

Both tools are the same shape — open a microphone, do something with each window, draw it — so the
part that is genuinely fiddly is written once.

- **It takes a `read` function rather than dispatching an event.** The callback fires once per
  animation frame, and a Svelte event dispatched sixty times a second to do the same job is pure
  overhead. `EditorButton`'s `click` prop is the same pattern.
- **It stops the microphone in `onDestroy`.** Leaving the page has to release the device, or the
  browser's recording indicator stays lit and reads as the site still listening after you have
  left it. That cleanup is guarded, because **`onDestroy` also runs during server rendering**,
  where `cancelAnimationFrame` does not exist — an unguarded call there is a 500, not a warning.
- **It shows what the browser refused to turn off.** `unwantedProcessing` comes back from the
  capture, and if gain control or noise suppression survived, the user is told, because that is
  the difference between "this tool is broken" and "your headset is fighting it".
- **Callers state a requirement, not a window size** — `minWindowSeconds` or `maxBinWidth`. The
  reasoning is in [the audio README](../audio/README.md#the-window-size-problem).
- **`begin` fires when listening starts, `reset` when it stops.** Anything timing the user needs
  the first of those rather than component setup: the gap between the page loading and the
  microphone opening is however long it took to find the browser's Allow button, and charging
  that to the first chord would put a twenty-second outlier at the top of every scoreboard.

The level meter reads the **tail** of the window, not all of it. A window sized for chords spans
three quarters of a second, and a meter averaged over that much audio lags far enough behind the
playing to look broken.

It is drawn through `perceivedLevel`, which square-roots the RMS: loudness is perceived closer to
the square root of amplitude, and a linear bar barely moves for anything short of a hard strum.
The timeline draws its waveform through the same function, so the two agree about how loud
something looks.

## TunerDial

The needle spans ±50 cents — half a semitone either way, which is the point at which the note name
itself changes, so the dial covers exactly one note and no more.

**The tolerance band is drawn behind the needle** rather than only stated as a number, so landing
inside it is the visible goal. Five cents is the default and is inaudible.

> **The root element sets `width: 100%` and that is load-bearing.** It sits in a flex column with
> `align-items: center`, so without it the dial shrinks to the width of the note name, and the
> track's own `width: 100%` then resolves against *that* instead of the page — rendering a 448px
> dial at 190px. `StringGuide` avoids this only because its root already sets a width.

## StringGuide

Six boxes under the dial. The active one is highlighted, and a string tuned at least once this
session stays marked, so you can see how far through the set you are without keeping count.

**A string is only marked once it has been in tune continuously for a second**, using
[`SustainedValue`](../audio/README.md#not-trusting-a-single-reading). A single frame's agreement is
not evidence: a string crossing through pitch as it settles, or one stray reading during the noisy
attack of a pluck, both land on "in tune" for an instant — and can land there while the *wrong*
string is nearest, ticking off one that was never touched. Marking is the only thing in the tuner
that cannot be undone by playing again, so it is the only thing that waits.

The bar filling along the bottom of the active box is that second elapsing. It is not decoration:
a tool that deliberately does nothing for a second is indistinguishable from one that has stopped
working, unless the waiting is visible.

## ChromaBars

The evidence behind the answer: which twelve notes the microphone heard, with the matched chord's
tones lit. A wrong guess is then legible as a wrong guess rather than a black box, which matters
for a detector with [ambiguities it cannot resolve](../audio/issues.md).

The bars, the chord name and the runner-up list all come from the same single reading, taken once
per strum, so they cannot disagree with each other. Nothing here updates between strums.

## Timeline

The scrolling record of what has been played, and the answer to "why did it say that". It exists
because the recogniser's honesty is not much use if the only thing on screen is its latest
conclusion.

**Newest at the left.** Audio emerges at the "now" line and drifts right as it ages, which is the
opposite of a DAW and deliberate: the thing being looked at is the strum that just happened, and
putting it at a fixed edge means the eye does not have to track a moving write head.

Three things are drawn, and each is a different kind of fact:

| | |
|---|---|
| The waveform | What the microphone heard — the loudness envelope, mirrored about the centre |
| A tick | A strum, placed at the moment [the onset detector](../audio/README.md#timing-a-strum-and-naming-it-separately) found it |
| A shaded band | The audio being gathered for a reading, growing from the now line back to the tick |
| A dashed band | Too quiet to be a strum — the [sensitivity](#sensitivity) threshold, drawn so it can be aimed at |

The band is the same idea as the tuner's hold bar: a tool that deliberately says nothing for three
quarters of a second is indistinguishable from one that has stopped working, unless the waiting is
visible. It stops growing exactly when the label appears, because that is the moment the window
holds nothing but the chord — so the band *is* the audio the answer came from, not a progress bar
standing in for it.

**A tick with no label is a strum that could not be named** — cut short, muted, or followed too
quickly by the next one. That is worth showing rather than hiding, because it distinguishes "the
tool missed it" from "you played something it could not use".

Labels hang to the **left** of their tick, over the audio they describe rather than over the strum
before it. The waveform is a stretched `<svg>` path with `preserveAspectRatio="none"`, so it costs
one attribute per frame and needs no resize handling; the ticks and labels are positioned in
percentages outside it, so the text is never stretched with it.

## Practice

`practice.ts` is the drill, and it is pure: chords in, judgements out, no DOM and no audio API.
That is what lets the interesting decision — whether a strum counts — be tested rather than
eyeballed through a microphone.

### What counts as the chord asked for

Two bars, not one:

| | The prompted chord must reach |
|---|---|
| It was also the best match found | `leadBarFor(acceptance)`, 0.70 by default |
| Something else matched better | `acceptance`, `DEFAULT_ACCEPTANCE` of 0.85 |

Coming first is itself evidence, so a chord that won only has to be plausible while one that came
second has to be convincing on its own.

**The second bar is the whole point.** A chord can be played and still lose the ranking: a major
whose third came out quiet fits the power chord's two-note template more closely than its own
three-note one, because the template beating it is the one that never asked for the note that went
missing. Ask for D, get told `D5`, and a D was still played. Judging on the winner alone would
call that a failure and train the player out of a chord they had right.

What stops that becoming a licence is that the leniency is aimed at a *missing* note rather than a
wrong one. [The numbers](../audio/README.md#asking-about-one-chord--scorechord) put a faint third
at 0.88, no third at 0.85, and the minor sharing the same root at 0.69 — so 0.85 amounts to
"the third was audible", and the mistake a drill exists to catch is nowhere near it.

### Acceptance is a control, for the same reason sensitivity is

A score is not only a fact about the playing. A quiet guitar, a laptop microphone across the room,
or a room with something else going on in it all cost a few percent, and **a tool that fails
chords the player knows they played is worse than one set slightly loose** — it teaches them to
distrust it, which is the end of its usefulness.

So `judgeAttempt` takes the bar as a parameter and the page owns the slider. Two things fall out of
that, and both are the reason it is worth writing down:

**One control, not two.** `leadBarFor` derives the winner's bar by subtracting a fixed 0.15, so the
default is exactly the 0.85 / 0.70 pair it always was. The two bars are the same question asked of
different evidence; exposing both would be handing the player the job of keeping them consistent —
the same argument that keeps `windowLevelFor` derived from `attackLevelFor` in
[sensitivity](#sensitivity).

**The floor is where leniency turns into being wrong.** A minor scored against the major sharing
its root reaches 0.69, so under about 0.7 the drill starts accepting the one mistake it exists to
catch. The slider goes to 0.6 anyway — the player knows what they played and a bad microphone is a
real problem — but the readout turns `--caution` amber below 0.7 and the hint says what is being
given up. A limit with no reason attached is just an obstacle.

The same bar decides whether the recogniser [names a strum at all](#the-times). Leaving that fixed
while acceptance moved would hand a quiet player "too quiet to name" in place of the verdict they
had just lowered the bar to get.

One thing it does not do is re-judge history. A strum was accepted or refused under the bar in
force at the time, and moving the slider does not go back and change the scoreboard — which is
honest, and also means a session with the slider moved half way through is two sessions in one
table. That is worth knowing before reading much into it.

### The chords, and which one comes next

Three sets, each chord in them switched on or off individually:

| Set | | |
|---|---|---|
| Open | 8 | C, D, E, G, A, Em, Am, Dm |
| Barre | 7 | F, F♯m, G, Bm, B, C♯m, Dm — E, Em and Am shapes moved up the neck |
| Power | 7 | E5 through D5, rooted on the low E and A strings |

Still far short of the hundred and twenty the recogniser knows, for the same reason as before: a
drill is only worth doing if every prompt is something you can nearly play already, and being
asked for F♯m7 in the first week is a way of being told to stop.

**Combinable rather than exclusive, because the interesting change crosses the sets.** G→Bm is the
one that stops people and it does not exist inside either set on its own.

**The selection is a list of chords, not a list of sets.** `chordsIn` takes labels, and the set box
is a shortcut that turns its whole group on or off. A set that also had to be ticked would be a
second thing to get wrong — and the useful selection is usually not a whole set anyway, since the
point of a session is often four chords a song needs and nothing else.

It always returns them in the order the sets are offered rather than the order they were switched
on. A selection is a set, and one that reordered itself as it was edited would be a different list
every time it was read.

### The name is not the chord

A barre G and an open G are the same six notes. Nothing in the audio could distinguish them, so a
`DrillChord` carries three strings rather than one:

| | |
|---|---|
| `name` | What the recogniser calls it, and the only thing a strum is judged against |
| `tag` | `"barre"` where the name does not say which hand is meant, null otherwise |
| `label` | `name` plus `tag`, unique across every set — what the prompt shows and the board groups by |

Without the label the scoreboard would average an open G with a barre G into one row, which is two
different things to practise reported as one.

Power chords need no tag: `chordName` already writes them E5 and A5, so nothing they contain can
collide.

**What the tool cannot do follows from the same fact.** Asked for a barre chord you can play the
open one and it will pass — [the barre set is a prompt, not a check](issues.md#a-barre-chord-cannot-be-checked-only-asked-for).
Power chords go the other way and *are* checked: a D5 is two of the three notes in a D, so a full
D scores about 0.81 against the D5 template while losing the ranking to D itself — which puts it
on the 0.85 bar, just under. The two-bar rule handles it with no special case.

### Which one comes next

`pickNext` never repeats the chord just asked for, because a change from a chord to itself is not
a change and takes no time. It takes its random source as a parameter, which is what makes that
property testable rather than a matter of running it a few times and hoping.

**Excluded by name, not by identity.** An open G into a barre G is a real thing to practise and
not a thing this can measure: the second strum would be accepted for sounding like the first, and
the time would be a number about nothing.

It is otherwise uniform, and [it should not be](issues.md#the-drill-does-not-choose-what-to-drill).

### The times

**A time is the gap between two strums** — the one that landed the previous chord and the one that
lands this one. That is a chord change, which is the thing the tool is about; a chord played
correctly in isolation was never the hard part.

That measurement is only honest because [the next chord is on screen already](#the-preview). Timed
from a prompt the player has not yet read, the same number would be a reaction test with a chord
change buried in it.

Both ends are onsets rather than the moments the chords were named. Naming costs a whole analysis
window, and charging that to the player would add three quarters of a second to every change. The
onset timestamp is
[biased late by about 60ms](../audio/README.md#timing-a-strum-and-naming-it-separately) — the same
at both ends, so it cancels.

Two changes go untimed, and both are the same reason: **there is no honest number without a chord
at each end.** The first of a session has no predecessor, and the one after a skip has one the
player never played.

### What a session records

`Strum` is one strum the recogniser could put a name to, judged against what was on screen:
the chord asked for, the chord it followed, how long the change took, and whether it landed.

**Misses are kept, not just landings.** A chord reached every time and a chord reached on the
third attempt can have identical times, and only one of them is learned — the times alone cannot
tell those apart, so on their own they flatter the player.

Two things are deliberately *not* recorded:

- **A strum too quiet or too short to name at all.** That is evidence about the playing or the
  microphone, not about the chord, and counting it as a mistake would turn the error column into a
  reading of the sensitivity slider.
- **A time on a miss.** A time measures a change that completed. There is a number available —
  the gap since the last landing — but it is the time to a chord that was not played.

The consequence worth knowing is that `landed` and *timed* are different counts: a chord landed at
the start of a session, or after a skip, has nowhere to be timed from and still happened.

### The two boards

`chordScores` and `transitionScores` are the same fold over a different name for a strum, which is
why `tally` takes the naming as a parameter rather than existing twice.

| | Rows | Answers |
|---|---|---|
| Chords | Eight | Do you know the shape |
| Changes | Up to fifty-six | Do you know the move |

**The change is the honest unit** — C→G and Em→G are not the same difficulty and averaging them
says little about either. It is not simply better, though: eight rows fill with evidence in a
couple of minutes and fifty-six do not, so a change board read too early is one attempt per row
dressed up as a ranking. Both exist because both are true at different points in a session.

Each row carries `landed`, `missed`, an `error` share, and `best` / `average` / `last`. Best
against average is the pair that says something neither says alone: a low best with a high average
is a change you can make and have not learned, which is a different problem from one you have
never made.

### Sorting

`sortScores` takes the column and the direction, and every column is offered because every column
is somebody's question — slowest first to pick what to drill, most-landed to see what the session
actually consisted of, worst error rate to find the shape your hand gets wrong.

**A row with no time yet sorts last whichever way the column points.** It is not the fastest and
not the slowest; it has no answer, and floating an unmeasured chord to the top of a list of times
would read as a claim about it.

Ties break on the name rather than on insertion order, so the board does not quietly reshuffle
itself as a session goes on — an order that changes for no visible reason is worse than an
arbitrary one.

`DEFAULT_SORT` is slowest best time first, for the reason the times are kept at all: one slow
attempt is a fumble, but a best time that stays high is a chord your hand cannot reach yet.

### The floor, which is real

Nothing faster than about a second can be measured, and the reason is physical rather than fixable.

A chord needs a whole 743ms window of nothing but itself to be recognised, and
[strumming again abandons the reading in progress](../audio/README.md#timing-a-strum-and-naming-it-separately)
— there is no window containing only the first chord once the second has started. On top of that
the detector goes [deliberately deaf](#feedback-tones) for as long as a chime can be heard for.

So a change played faster than that does not read as fast; it does not read at all, and the prompt
sits there unchanged. The tool's answer is to make the wait audible — the chime is the cue to
move — which turns the limit into the instruction "let it ring", and letting a chord ring while
your hand moves is the thing worth practising anyway.

## Shapes and diagrams

`shapes.ts` is a `ChordShape` — a fret and a finger for each of the six strings, low E first — and
two things derived from it. Nothing else is stored, because everything else about a diagram
follows from those twelve numbers.

**Frets are absolute.** An A-shape barre at the fifth fret says 5, not 1, and `fretWindow` works
out where the diagram starts. Recording an offset alongside relative frets would be two facts that
have to agree, and the failure when they don't is a diagram that looks right and teaches the wrong
shape.

`fretWindow` starts at the nut for anything within reach of it, because "third fret" means nothing
to a hand that cannot see where the neck begins. Only once a shape is out of that reach does the
diagram slide up and say where it went — which is the `5fr` in the corner. It also *grows* rather
than clips: a shape spanning five frets gets five rows.

`barresOf` derives the bars from the fingering. A barre **is** one finger on several strings at one
fret — there is nothing else it could be — so recording it separately would be a second copy of a
fact already written down, free to disagree with the first. It bars only the strings at that
finger's own fret, which matters for the A-shape major: the index finger lies across the second
fret while three fingers sit at the fourth, and reading the fingering without the fret would put
all five strings in the bar.

`ChordDiagram.svelte` draws it in abstract SVG units scaled by a `width` prop. Three details are
load-bearing:

- **The nut is drawn thick when the window starts at it.** It is the one line that is a fact about
  the guitar rather than a fret, and the diagram is unreadable without knowing whether the top line
  is it.
- **The fret number sits in a gutter to the left of the nut**, at full-strength `--text`. It was
  first drawn to the right of the first fret row, which is exactly where a barre chord draws its
  bar — so the one shape whose fret number matters most had it printed on top of the bar. There is
  nothing on the left of the neck to collide with. It is anchored at the very left edge rather than
  against the nut, so if a two-digit fret ever runs out of room it is the "fr" that goes and not
  the number.
- **The gutter is kept whether or not a number goes in it**, so diagrams of chords at different
  places on the neck are the same shape and can sit side by side.

Where on the neck a shape goes is not an annotation on the diagram — without it the diagram is of
the wrong chord — which is why it is neither muted nor small.

Finger numbers go inside the dots, and on a bar there is one number at its centre rather than one
per string. The difference between "put something here" and "put *this* finger here" is most of
what a barre chord diagram is for.

## ChordSets

A box per set and a chip per chord. The box shows `5/8` and goes indeterminate when a set is
partly on, which is the state a real selection is usually in.

**A change that would leave fewer than two chords is refused rather than disabled**, because a
disabled control gives no reason and this one has one: `isDrillable` wants two chords that *sound*
different, since the drill measures changes and there is no change between a chord and itself.
That is two distinct names, not two entries — an open G and a barre G would leave `pickNext`
nothing to pick.

> A refusal has to put the checkbox back by hand. The browser has already flipped it and cleared
> its indeterminate mark, and Svelte only repaints what its own computed value says has changed —
> which after a refusal is nothing. The restore recomputes both from state rather than remembering
> what they were.

Chips are `aria-pressed` buttons rather than checkboxes, so they have no browser-managed state to
put back, and they fill with the accent colour rather than merely brightening: twenty-two of them
are read at a glance, and a difference in weight scans faster than a difference in shade.

Changing the selection mid-session redraws only what fell out of the pool. Asking for a chord the
player has just said they don't want is the one thing the control must not do; redrawing a preview
that is still valid would break [the promise](#the-preview) that the preview is what arrives next.

## ChordPrompt

### The preview

Two chords, not one: what to play now at 4rem, and what comes next at 2rem beside it. **A chord
prompted the instant it is needed can only be reacted to**, and reaction is not what anyone is
practising — the change is, and a change has to be prepared while the current chord rings.

They sit in a grid rather than a flex row so the two share a baseline despite the size difference.
`align-items: baseline` across grid items does that; centring them would leave the small chord
floating against the big one's x-height.

**The preview is a promise and is kept.** Skipping promotes the chord that was shown as next
rather than drawing a fresh one, because a preview that can be overruled is worse than no preview
— it would train the player to ignore it.

Because the preview does the work the old pause did, there is no pause: landing a chord promotes
the prompt immediately. That is what makes the drill continuous, and it is also what makes
[strum-to-strum timing](#the-times) valid, since a fixed pause would sit inside every measurement.

The current chord is wrapped in `{#key target.name}` so each one is a new node and animates in.
Patched text would change with no sign that anything had happened, which matters when the player
is looking at their hands.

### What it says when a strum doesn't land

Reaching the *preview* early is called out by name — "that was G — let Am ring first" — rather
than reported as a low score against the chord still being asked for. Both are true, but a player
who has already moved on reads "27% of an Am" as the tool being broken rather than as being early,
and being early is the single most likely mistake once a preview exists.

### Fingering, off by default

The diagrams appear under both chords when the toggle is on, and the toggle starts off. That is
the whole design decision: **a diagram under every prompt turns the drill into copying**, and the
times stop measuring whether the shape is remembered — which is the only thing they were measuring.

Both chords get one rather than only the current one, because the preview exists so the *change*
can be prepared, and a shape you cannot see is not one you can prepare.

The tag — "barre" — renders at full strength inside an otherwise dimmed label. It is not decoration
on the word "play": it is the part of the prompt that says which of two identical-sounding chords
is being asked for.

**The streak counts only chords found on the first strum.** A streak that survives any number of
wrong attempts is just a count of prompts and measures nothing. Wrong strums are otherwise free —
they cost the streak and nothing else — because a drill that punishes hunting for a chord
discourages the thing it is for.

## Feedback tones

`chime.ts`: rising for a chord that landed, falling for one that didn't. The point is that
**nobody practising is looking at the screen** — the information has to arrive through the ear, or
the player finds out the last chord failed only after moving on from it.

Rising perfect fifth for the good one, deliberately. It is the common case in a drill that is
working, so it gets heard hundreds of times an hour and has to be a sound nobody wants to switch
off. The falling one is low and soft, because a missed strum is information rather than a penalty.

Sine waves, for a reason that is not aesthetic: **a tone played through a speaker is audio the
microphone is about to hear**, and a sine puts all of its energy in one chroma bin instead of
smearing a harmonic series across several. The worst it can do is add one note rather than look
like a chord.

That is the smaller half of the problem. The larger half:

> A chime arrives once the chord that triggered it has decayed, which is exactly the shape
> [the onset detector](../audio/README.md#timing-a-strum-and-naming-it-separately) is looking for
> — a rise against the recent past. Left alone it names itself a strum, gets judged against the
> new prompt, misses, and chimes again.

So the trainer ignores the microphone for `CHIME_MS` after playing one. That number is exported
rather than kept inside the module because it is a cost paid by whatever is listening: it raises
[the floor](#the-floor-which-is-real) on how fast two strums can be told apart, and switching the
sound off removes the pause along with the tones.

The detector is *skipped* rather than offered-and-ignored during that window. Offering would let
the chime start a refractory period and swallow the real strum right after it.

## ScoreBoard

Two tabs over [the same session](#the-two-boards), six columns, all of them sortable.

**The component holds the grouping and the sort, and the page holds neither.** Which rows exist is
a question about the drill and lives in `practice.ts`; which of them you are currently looking at
is a question about a table, and pushing that up to the page would put table state in a route for
no gain. The tab and the sort survive switching between the tabs, which is the behaviour anyone
who has just sorted by error rate expects.

A repeated click on a column flips the direction. A *new* column starts descending, except the
name, which starts at A — nobody clicks "Error" to find out which chord they never get wrong.

**The bar behind each name stays tied to the best time** even when the sort is not, so it is the
one thing on the row that means the same after every click. It is drawn as a share of the slowest
best time, so the row holding you up most is full width and the rest read against it; an absolute
scale would need a maximum nobody could name, since two seconds is slow for a practised player and
fast for a first week.

The sort arrow occupies its width whether or not the column is the sorted one. Six monospace
columns that reflow every time a header is clicked look broken, and the fix costs one
`inline-block`.

The panel scrolls sideways rather than dropping a column on a narrow screen. Every one of the six
is a number somebody asked for, and there is no honest way to pick which phone users don't need.

## Settings that survive a reload

`settings.ts` holds the two sliders as stores backed by `localStorage`. They are the two settings
that are **about the room rather than the playing** — how loud a strum arrives and how close the
recogniser gets — and a microphone and a guitar do not change between visits. Asking on every load
is asking the same question over and over and ignoring the answer.

Stores rather than props, because the sensitivity slider appears on both listening pages and a
setting that meant different things on each would be worse than no setting at all. That is the
same argument that put the mapping in `sensitivity.ts` in the first place.

**A stored value is clamped, not trusted.** The ranges are ours and may change, and a value saved
under an older one would otherwise come back as a setting the slider cannot express — a control
that appears to do nothing until it is moved. Anything unreadable falls back to the default, and
the fallback is written back, so junk in storage cleans itself up.

Writes are wrapped, so private browsing and blocked storage still get working sliders. They just
do not survive a reload, which is where they were before this existed.

## Sensitivity

How loud a strum arrives at the microphone is not knowable in advance. A laptop lid two feet from
an acoustic and a phone resting on the soundboard differ by more than an order of magnitude, and
the symptom of getting it wrong is silent: no ticks appear, and the tool looks broken rather than
mis-set.

So the threshold is a control, and — more importantly — **it is drawn**. The dashed band on the
timeline is the threshold, on the same scale as the waveform, so setting it is a matter of moving
the band until playing clears it rather than interpreting a number. That pairing is the reason
this is worth a component at all; a bare slider labelled "sensitivity" would be a guess.

The mapping is in `sensitivity.ts` rather than the pages, because both listening tools offer the
slider and a setting that meant different things on two pages would be worse than no setting.

It is geometric, not linear: `LOUDEST × (QUIETEST / LOUDEST) ** value`. Equal movements are then
equal steps in loudness as it is heard, rather than in amplitude. A linear scale spends most of
its travel in a range no microphone reports and crosses everything useful in the last few pixels.

One control moves two thresholds, because they are the same judgement asked at two moments:
`attackLevelFor` is what counts as a strum, and `windowLevelFor` is whether the window that
follows holds enough sound to analyse. The second is derived from the first rather than exposed,
since a tool with two loudness sliders would be asking the user to reconcile them.

Styling is `accent-color` on a plain `<input type="range">`, rather than rebuilding the track and
thumb across three vendor prefixes to say one thing.
