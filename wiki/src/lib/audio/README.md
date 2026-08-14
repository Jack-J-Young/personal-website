# audio/

Pitch and chord detection from a microphone, for the [guitar tools](../guitar/README.md).

**This is live**, behind [`/guitar/tuner`](../../routes/README.md), `/guitar/chords` and
`/guitar/trainer`. Everything
except [`microphone.ts`](#microphonets) is pure and DOM-free — it takes arrays of numbers and
returns arrays of numbers — which is what makes it testable in node and what the colocated
`*.test.ts` files exercise.

This page is the specification. Where a constant is empirical rather than derived, it says so.

- [What each part is for](#what-each-part-is-for)
- [Pitch detection](#pitch-detection)
- [Chord detection](#chord-detection)
- [Timing a strum, and naming it separately](#timing-a-strum-and-naming-it-separately)
- [Not trusting a single reading](#not-trusting-a-single-reading)
- [The window size problem](#the-window-size-problem)
- [Microphone capture](#microphone-capture)
- [Verification](#verification)
- [Issues](issues.md)

## What each part is for

| Module | Holds |
|---|---|
| `notes.ts` | Frequency ↔ MIDI ↔ note name, cents, and standard tuning. No signal processing. |
| `pitch.ts` | Monophonic pitch, wrapping [pitchy](https://github.com/ianprime0509/pitchy), plus the plausibility gate and the rolling median that steadies a readout. |
| `chroma.ts` | Magnitude spectrum → per-note energy → harmonic suppression → twelve pitch classes. |
| `chords.ts` | Chord templates, the ranking against all of them, and the score against one. |
| `onset.ts` | When a string was struck, from the loudness envelope alone. |
| `stability.ts` | Two ways of not trusting a single reading: `StableChoice` (counted) and `SustainedValue` (timed). |
| `microphone.ts` | The only impure module: `getUserMedia`, `AudioContext`, `AnalyserNode`. |
| `index.ts` | The public surface. |

The two detectors are deliberately unrelated. **Monophonic pitch and polyphonic chord recognition
are different problems** and the good algorithms for them share nothing: one works in the time
domain on the shape of a repeating waveform, the other in the frequency domain on which notes are
present. Trying to build the chord recogniser out of the tuner would mean detecting several
pitches at once, which is a much harder problem than either.

## Pitch detection

`pitchy` implements the **McLeod Pitch Method**: it autocorrelates the window, normalises the
result, and picks the first strong peak, interpolating between samples for sub-sample precision.
The important property is that it reports a *clarity* alongside the pitch, so a reading can be
rejected on the algorithm's own confidence rather than a guess about loudness.

Two gates sit on top of it in `pitch.ts`:

- **Plausibility.** Below 60Hz or above 1400Hz is not something a guitar produced, and a clarity
  under 0.9 is not something to show a user. A plucked string clears 0.9 comfortably.
- **A rolling median** of the last five readings, in `PitchHistory`. A mean would let one octave
  error drag the needle a long way; a median ignores it unless it happens more often than not.
  Nothing is displayed until the window is full, so the needle appears already settled.

Detectors are cached per window length: they allocate their working buffers up front, and
building one per frame would allocate megabytes a second.

## Chord detection

Four stages, each a separate exported function so each can be tested and inspected on its own.

### 1. Note energies — `noteEnergies`

For every semitone from MIDI 40 (the open low E) to 88, take the **strongest** spectrum bin within
half a semitone of that note's centre frequency.

Strongest, not the sum. A semitone is a fixed *ratio*, so its band covers steadily more bins as
frequency rises — around three bins at the low E and dozens two octaves up. Summing would make
high notes read as louder purely because their bands are wider.

Where the band is narrower than a single bin, the nearest bin is used. That is the low-frequency
resolution limit showing through, and it is the reason [the window has to be large](#the-window-size-problem).

### 2. Harmonic suppression — `suppressHarmonics`

A plucked string is not one frequency. It produces a whole harmonic series, and those overtones
land on *other notes*: the third harmonic is a fifth above the octave, the fifth harmonic a major
third above two octaves. **Without this stage a single strummed low E reads as a chord** — which
is exactly what one of the tests pins.

Working upwards through the notes, each note's energy is subtracted from the positions its
harmonics would occupy, scaled by how much of it to expect there:

| Harmonic | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Semitones above (`12·log₂n`, rounded) | 12 | 19 | 24 | 28 | 31 | 34 | 36 | 38 | 40 | 42 | 43 |
| Weight | 0.55 | 0.4 | 0.28 | 0.18 | 0.14 | 0.12 | 0.1 | 0.09 | 0.08 | 0.07 | 0.06 |

Upwards, because by the time a note is reached everything below it that could have contributed to
it has already been accounted for — and only the energy that *survived* generates harmonics of its
own.

Two things about this table are worth knowing:

- **It has to run well past the fifth harmonic.** Truncating there leaves the 7th, 9th and 11th to
  pile onto pitch classes unrelated to the note that produced them. A plain D major measured that
  way scored as a Dmaj7.
- **The offsets cannot be exact.** The harmonic series is not equal-tempered — the third harmonic
  is 19.02 semitones up, the fifth 27.86, the seventh 33.69 — so several entries are a good
  fraction of a semitone from the note they are charged to. Rounding is the best available, and it
  is why suppression leaves residue.

The weights are empirical. A real string's overtones fall away roughly as 1/n, but the first two
are set deliberately *above* that: an octave or a fifth that is really an overtone is the most
damaging kind of false note, and over-subtracting costs less than leaving it in.

### 3. Fold to twelve — `foldToChroma`

Add the octaves together and scale so the loudest pitch class reads 1. Scaling to the peak rather
than the total is what makes a quiet chord and a hard strum score identically — matching cares
about the shape of the vector, not the volume.

### 4. Match — `matchChords`

Ten qualities × twelve roots, scored by **cosine similarity** against a weighted template. Cosine
compares shape and ignores magnitude, and it penalises energy sitting *outside* the template: a
note that shouldn't be there lengthens the chroma without lengthening its shadow on the template.

The root carries weight 1.3 against 1.0 for the other chord tones, because guitar voicings double
it — an open G has three Gs in it — so a real chroma leans on the root more than an even template
would expect.

**The lowest note found breaks ties**, adding a small bonus to templates rooted there. It changes
the *order* matches come back in and nothing else: `score` stays the pure similarity, because it
is shown to the user as a confidence and a chord picked on a hint must not claim certainty. That
separation is pinned by a test.

Some chords are genuinely indistinguishable this way, and no amount of tuning will separate them
— see [issues](issues.md).

### Asking about one chord — `scoreChord`

`matchChords` answers "what is this", which is the wrong question for anything that already knows
what it wants. `scoreChord` takes a root and a quality and returns that chord's similarity on the
same scale, without ranking the other hundred and nineteen.

The saving is real but incidental. **The reason it exists is that the top of the ranking is not
the same fact as the score of a given chord**, and a drill needs the second one. A major triad
whose third came out quiet fits the power chord's two-note template more closely than its own
three-note one — the template beating it is the one that never asked for the note that went
missing — so a played D can come back named `D5`. Reading only the winner would call that a
failure. Asking about D directly does not.

The numbers, for a triad scored against its own template:

| What was played | Scored as the major |
|---|---|
| All three notes even | 0.99 |
| Third at a fifth of the others | 0.91 |
| Third at a tenth of the others | 0.88 |
| No third at all | 0.85 |
| The minor sharing its root | 0.69 |

The gap between a faint third and no third is narrow, and the gap between either and the wrong
third is not. That is what makes a single cutoff workable, and
[the trainer](../guitar/README.md#practice) puts one at 0.85.

## Timing a strum, and naming it separately

*When* a chord was played and *which* chord it was are two questions, and the mistake worth
avoiding is answering them with one measurement.

The chromagram cannot answer *when*. It needs three quarters of a second of audio to separate
adjacent semitones, so every window it looks at during a change is part old chord, part silence,
and part however many strings the pick has reached so far. Run it every frame and it will name
each of those half-formed windows out loud — a run of plausible wrong answers on the way to the
right one, which is both unreadable and useless for timing.

An attack, on the other hand, is a step change in loudness, and loudness resolves in tens of
milliseconds. So `onset.ts` measures the moment and the chromagram measures the chord:

1. Every frame, take the RMS of only the **most recent 50ms** of the window. That is what
   `readLevel(seconds)` is for — averaging over the whole chord-sized window would flatten the
   very transient being looked for.
2. `OnsetDetector` calls it an attack when it is louder than it was 80ms ago by a factor, above a
   floor, and not within the refractory period of the last one. **The floor is public and may be
   changed while running** — it is the one option a player has a reason to move mid-session, since
   how loud a strum arrives depends on the guitar, the room and the microphone's position. The
   chord page hangs [a slider](../guitar/README.md#sensitivity) off it.
3. From that moment, wait one whole window. Now the analyser holds nothing but the new chord.
4. Take **one** reading and commit it.

**An onset is a rise, not a threshold.** The strum that matters most is the one over a chord still
ringing, and in absolute terms it is often quieter than the chord it interrupts — so comparing
against the recent past is the only comparison that works. It also falls out for free that a note
decaying never triggers one, because a decay is the opposite of a rise.

The refractory period is what makes a strum count once rather than once per string: six strings
enter over roughly a tenth of a second and each is its own small attack. It is also the floor on
how fast repeated strumming can be tracked, which is a real limit rather than an implementation
gap.

Strumming again always wins — a reading in progress is abandoned and the clock restarts from the
new onset — so the tool never names a chord out of audio that spans two of them.

**The timestamp is biased late, consistently.** The onset is found from a 50ms envelope on a frame
boundary, so it lands up to about 60ms after the string was actually struck. That bias is the same
for every strum, and a change *time* is the difference between two of them, so it cancels. It
would matter if the number were ever presented as an absolute latency; it isn't.

## Not trusting a single reading

Detection flickers frame to frame. A note decaying passes through silence, and a string settling
after a peg turn passes *through* being in tune on its way somewhere else. `stability.ts` holds
two ways of refusing to act on one reading, and which one is right depends on what the requirement
actually is.

| | `StableChoice` | `SustainedValue` |
|---|---|---|
| Waits for | N agreeing readings | N milliseconds unbroken |
| Used by | nothing, currently — [see issues](issues.md) | the tuner's "this string is done" mark |
| Reports | `justChanged` on the confirming reading | `progress(now)` through the hold |

**A count is not a duration.** Readings arrive on animation frames, so a fixed number of them is
anywhere between a third of a second and several seconds depending on the machine and what else is
on screen. Where the requirement is genuinely "hold it there for a second" — as it is for ticking
a string off — counting readings would mean the tuner behaved differently on a slow laptop.

`SustainedValue` takes the current time as an argument rather than reading a clock, which keeps it
pure and lets a test step through a second without waiting one.

Neither is used to gate the *display*. The tuner's dial stays live at frame rate: waiting before
marking a string is useful, but waiting before showing which way to turn the peg would just make
the tool feel broken.

## The window size problem

Nothing here takes an FFT size. Callers state **what a reading has to be good enough for** and
`windowSizeFor` works out the rest:

- the tuner asks for `minWindowSeconds`, because autocorrelation needs several whole periods of
  the lowest note it must find;
- the chord recogniser asks for `maxBinWidth`, because it has to tell adjacent semitones apart.

Both are the same knob from opposite ends — a window of `n` samples spans `n / sampleRate` seconds
and resolves `sampleRate / n` hertz — but **neither can be turned into a sample count without
knowing the sample rate**, and that is only known once the device is open.

That matters more than it sounds. `AnalyserNode` caps `fftSize` at 32768, so a machine running at
96kHz resolves *half* the frequency detail of one at 48kHz for the same setting. This was not
hypothetical: on a 96kHz device the recogniser called a plain D major a Dmaj7, and the cause was
not harmonics but **spectral leakage between adjacent semitones** — with 2.9Hz bins there are
under three of them to a semitone at the bottom of the range, so the skirt of the D3 partial
filled the band belonging to C#3 and invented a chord tone.

So `startCapture` asks for an `AudioContext` at a fixed 44.1kHz and lets the browser resample,
falling back to the device rate if it refuses. Nothing here needs bandwidth above about 5kHz, so
discarding the rest costs nothing and makes the analysis behave identically on every machine.

At 44.1kHz the chord recogniser's `maxBinWidth: 1.5` gives a 32768-sample window: **1.35Hz bins
over 743ms of audio**. The time cost is not an implementation shortcoming — resolving 5Hz requires
at least a fifth of a second of signal whatever the method. It is why this identifies a chord
being *held* rather than catching the instant one lands, and why
[the moment is measured separately](#timing-a-strum-and-naming-it-separately) rather than by
making the chromagram faster.

## Microphone capture

`startCapture` is the only place that touches the browser.

**It checks `isSecureContext` before anything else.** A microphone is only offered over HTTPS or
from a loopback host, and on an insecure origin `navigator.mediaDevices` is not refused but
*absent* — so the two have to be told apart, or "you are on plain HTTP" reads as "your browser is
too old". This is only reachable in development, since the site itself is HTTPS; `npm run dev:lan`
is the way to test on another device.

Both refusals throw a `MicrophoneUnavailable`, which `describeMicrophoneError` passes through
untouched. Without that they were flattened into the generic wording, because the switch it does
otherwise is on `error.name`, and a plain `Error` is named `"Error"`.

Three more things it does are load-bearing:

- **It turns off the browser's voice processing.** Automatic gain control rides over the decay of
  a plucked string, noise suppression treats a sustained tone as background hum and removes it,
  and echo cancellation filters in ways that shift phase. Asking is all a page can do — a browser
  may ignore it — so the capture reads the track's actual settings back and reports what stayed on
  as `unwantedProcessing`, which the UI shows.
- **`smoothingTimeConstant` is 0.** Averaging across frames would blur the attack of a note, and
  every reading is already a whole window of audio.
- **The source is never connected to the destination.** Routing a microphone to the speakers is a
  feedback loop.

`readLevel(seconds)` reads the **tail** of the window rather than all of it, because the newest
audio is at the end of the buffer. Everything that watches the envelope rather than the notes —
the onset detector, the drawn trace, the input meter — asks for a short span, since a window sized
for chords averages three quarters of a second and turns every attack into a slope.

Readings reuse their buffers, so a caller that wants to keep one must copy it.

## Verification

The committed suite pins behaviour against synthesised signals. Beyond that, the pipeline was run
in a real browser against synthesised guitar signals fed through `getUserMedia`, so the actual
`AnalyserNode`, the actual resampling and the actual detection code all ran.

**Sawtooth oscillators**, deliberately: they carry the full harmonic series at 1/n, which is a
harsher test than a plucked string, whose upper partials are far more damped.

| | Result |
|---|---|
| Six open strings, pitch | Correct note and string for all six, within **0.17 cents** |
| Sixteen chord voicings | **16/16**, similarity 0.982–0.997 |
| Narrowest margin | Dsus4 over Gsus2, 0.036 — the [sus ambiguity](issues.md), settled by the bass |
| Device rate | 96kHz, resampled to 44.1kHz, 1.35Hz bins, 743ms window |

Onset gating was measured the same way, by sampling the displayed chord every 40ms through a
sequence of strums:

| | Result |
|---|---|
| Am → C → G → D, 1.6s apart | 4/4 named, and **the display changed exactly four times** — no wrong answer between them |
| Strum to named | 801–864ms, consistent to about 60ms |
| Re-strum after 300ms | The interrupted reading is abandoned; the first strum keeps its tick and gets no label, the second is named correctly |

The second row is the whole point: before this, the same sequence produced a run of plausible
wrong chords per change before settling. The latency did not improve — it cannot, the window is
the window — but nothing is asserted during it any more.

The chord set was real open-position voicings including doubled notes — E, Em, A, Am, C, D, Dm, G,
G7, E5, A7, Cmaj7, F, Bm, Am7, Dsus4 — because the doubling is what a chromagram actually sees and
it is not the same as one note per chord tone.

The drill's acceptance rule was then driven the same way, playing whatever chord the page happened
to be asking for:

| | Result |
|---|---|
| Prompt, play it, repeat | Landed and named correctly every time, over about thirty prompts |
| Strum to named | **850ms**, to the millisecond, across every attempt |
| D with its third at a tenth | Recogniser said **`D5`**, drill accepted it as **D** |
| Asked for G, played C | Rejected, "heard C · 29% of a G" |

The third row is the case the two bars exist for, reproduced end to end rather than only in a unit
test: the recogniser is not wrong, and the drill is not overruling it — they are answering
different questions about the same window.

Strum-to-strum timing was checked against wall clock, driving the strums at a known spacing rather
than trusting the number the page reported:

| Actual gap | Reported |
|---|---|
| 1000ms | 1.0s |
| 1093–1099ms ×4 | 1.1s each |
| 1500ms | 1.5s |
| 2200ms | 2.2s |
| 3000ms | 3.0s |

Exact at every spacing, and the first change of a session correctly went untimed.

### A chime is a strum, unless something stops it

Feeding [the trainer's own tone](../guitar/README.md#feedback-tones) back into the microphone at
the same loudness as the guitar confirmed both halves of this:

| | Chime reached the microphone | Counted as a strum |
|---|---|---|
| Tone alone, into silence | yes | **yes** |
| Tone after a quiet strum, detector not deafened | yes | **yes** |
| The real chime, detector deafened for `CHIME_MS` | yes (880Hz and 1319Hz both measured) | **no** |

Identical audio at an identical moment in the last two rows, so the guard is the only difference —
it is load-bearing rather than defensive. Note also the second row: a tone played *while the chord
was still ringing* was ignored on its own merits, because there was no rise against the recent
past. The failure needs a decayed chord, which is exactly when a chime arrives.

A note on measuring any of this from a browser harness: **a hidden tab clamps `setTimeout` to
about a second**, which silently runs a `requestAnimationFrame` loop at 1Hz and makes every
envelope look like it collapses. Rebuilding the harness clock on `MessageChannel`, which is not
throttled, is what made these numbers trustworthy.

None of this is a substitute for a real guitar in a real room, which has body resonance, fret
buzz, and strings that go out of tune with each other. Expect the empirical weights above to need
revisiting once that happens.
