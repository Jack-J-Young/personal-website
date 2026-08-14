# audio issues

See the [wiki index](../../../README.md#issues) for the tag format.

## Some chords are the same set of notes and cannot be told apart
`known` `medium` `src/lib/audio/chords.ts`

Matching works from pitch classes, so any two chords built from the same twelve-note set score
identically. This is a property of the representation, not a bug to fix:

- **Csus2 and Gsus4** are both C, D and G. So is every other sus2/sus4 pair a fourth apart.
- **An augmented triad** is symmetric — Caug, Eaug and G#aug are the same three notes.
- **Inversions and slash chords** read as the plain chord. C/G is a C.
- **A sixth chord and its relative minor seventh** are the same set: C6 is Am7.

The bass note breaks the first case in practice, since the lowest note found adds a small bonus to
templates rooted there. It cannot break the augmented case at all.

Separating these properly needs the actual voicing — which note is lowest, and in what octave —
rather than a chromagram. That would mean multi-pitch estimation, which is a substantially harder
problem than what is here.

## The harmonic weights are fitted to synthesised strings, not a real guitar
`known` `medium` `src/lib/audio/chroma.ts`

`HARMONIC_WEIGHTS` was tuned against sawtooth oscillators, chosen because their 1/n series is
harsher than a plucked string's. That makes the values conservative rather than wrong, but it is
still not the instrument.

A real guitar brings body resonance, fret buzz, a pick attack full of broadband noise, and upper
partials that are inharmonic — a stiff string's overtones are progressively sharp of the exact
multiples this assumes. Expect the table to need revisiting after real playing, and treat a
regression there as a tuning problem rather than a structural one.

## StableChoice is no longer used by anything
`known` `low` `src/lib/audio/stability.ts`

The chord page used to hold its display steady by requiring four agreeing readings. It now takes
one reading per strum instead, so there is nothing to steady and the class is unused.

The trainer was the expected second customer and turned out not to need it either: it judges one
window per strum for the same reason the chord page does. What would want it is a live "what are
you holding right now" readout, which is a different tool from either of these — counted
confirmation is exactly the right shape for one, and the class is tested and documented. Delete it
if that tool doesn't get built.

## An onset timestamp is about 60ms late
`known` `low` `src/lib/audio/onset.ts`

Onsets are found from a 50ms loudness envelope, sampled once per animation frame, so the reported
moment trails the actual strike by up to roughly 60ms.

This is deliberate rather than unfixed. Detecting the true attack edge would mean per-sample work
in an `AudioWorklet`, and the bias is constant — a change *time* is the difference between two
onsets, so it cancels. It would only matter if a figure were ever presented as absolute latency.

## The chromagram runs on the main thread
`open` `low` `src/lib/audio/chroma.ts` `src/lib/guitar/MicrophoneGate.svelte`

A 32768-point spectrum walked over 49 semitone bands is real work, and it happens on the thread
that also renders.

It used to happen *every frame*, which was the medium-severity version of this. Onset gating cut
it to once per strum, so what remains is an occasional spike rather than a sustained load, and the
per-frame cost is now a 2205-sample RMS. Moving it to an `AudioWorklet` or a worker is still the
right end state, but it no longer blocks the trainer.

Related: the loop is driven by `requestAnimationFrame`, which does not fire in a background tab.
That is the right behaviour here — a meter nobody can see should not burn CPU, and it resumes on
return — but it means the tools are deliberately dead while hidden.

## Only standard tuning is offered
`known` `low` `src/lib/audio/notes.ts`

`STANDARD_TUNING` is the only tuning defined. The tuner itself is chromatic and so works in any
tuning, but the six string boxes below the dial always name EADGBE, so in drop D or an open tuning
they label the wrong targets.

`nearestString` already takes a tuning as a parameter, so this is a UI affordance to add rather
than a change to the maths.
