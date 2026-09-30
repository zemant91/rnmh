# design-to-code — how it works

## What it does

Takes a UI reference (a Dribbble/Mobbin link, a screenshot, a photo of a
screen, a Figma frame — or no reference at all, just "make it nice") and
turns it into a concrete, non-generic bare-React-Native implementation
plan. The core problem it's built to catch: AI-generated mobile UI tends
to converge on the same "slop" look (white card, 16px radius, soft
shadow, blue accent, fade-in-only motion) regardless of what app it's
for. This skill forces an explicit breakdown of what actually makes a
reference distinctive, checks the proposed build against a checklist of
those generic habits, and keeps parallel apps from converging into one
house style.

## How it works — ten steps, roughly in three phases

```
UNDERSTAND THE REFERENCE
  1. Break it down: grid/spacing, palette, typography, the one
     "signature move," material/texture, emotional brief
  2. Anti-slop checklist — is the plan about to fall back on
     generic habits? (3+ matches = stop and pick something else)
  3. Cross-project check — has this exact move already been used
     in another of the user's apps?

COVER WHAT THE REFERENCE DOESN'T SHOW
  4. Screen archetype + state coverage (loading/empty/error/success/
     offline) — a happy-path-only reference is incomplete by default
  5. Motion spec — concrete spring parameters tied to the emotional
     brief, not "add a nice animation"
  6. Accessibility minimums — touch targets, contrast, font scaling,
     labels — non-negotiable even if the reference ignores them
  7. Platform idioms — where iOS and Android should actually diverge

BUILD IT
  8. Move → RN technology mapping (MaskedView, Reanimated, etc.)
  8b. State the plan, wait for a go-ahead — before writing code
  9. Check live whether a stylistic call is actually fresh or dated
     (no frozen trend list baked into the skill)
  10. Hand off to a usability/accessibility review pass rather than
      re-deriving it here
```

## When to reach for it

- Given a reference and asked to break it down or build something like it.
- Asked to make a screen "beautiful" with no reference — this skill
  suggests directions first rather than defaulting to a generic layout.
- As part of a bigger feature — `feature-implementation` runs this as its
  own Step 1 rather than duplicating it, so use that skill instead when
  the UI is only part of what's being built.

## Worked example

**Input:**
> "Here's a Dribbble link for a workout-timer screen — build something
> like this for PocketSpotter."

**What the skill does:**

1. **Breakdown:** grid — generous 24px outer margin, no cards, flush
   full-bleed timer ring; palette — near-monochrome dark with one orange
   accent; typography — huge, tight-tracking numerals for the countdown;
   signature move — the timer ring itself morphs shape slightly as it
   counts down; material — flat, no shadows at all; emotional brief —
   "intense, focused." Notes honestly: "the button row underneath is
   fairly generic — flat pills, nothing distinctive there."
2. **Anti-slop check:** confirms the plan doesn't default to
   card+shadow+blue-accent — the reference's near-monochrome + single
   accent already breaks that pattern.
3. **Cross-project check:** checks whether another of the user's apps
   already uses a morphing-ring timer — if PocketSpotter's sibling gym app
   already has one, flags it and asks whether to differentiate.
4. **Archetype + states:** classifies this as a "focused single-task"
   screen; flags that the reference shows only the countdown running —
   design is also needed for paused, finished, and "timer interrupted by
   a call" states.
5. **Motion:** ties the ring's countdown animation to "intense/energy" —
   lower damping (12-18), higher stiffness (150-220), short duration.
6. **Accessibility:** flags that the reference's numerals are large
   enough, but the pause button as drawn is under 44pt — adjusts it.
7. **Platform idioms:** notes the ring should respect Dynamic Island
   safe-area on iOS vs. a cutout-aware layout on Android.
8. **RN mapping:** ring via Skia or a custom SVG path, morph via
   Reanimated shared values, numerals via native monospace tabular
   figures.
8b. **States the plan** ("building the countdown + paused + finished
   states this pass, call-interruption handling deferred — go ahead?")
   and waits.
9. Nothing here needed a live trend check, so skips it.
10. Once built, offers a follow-up accessibility/usability pass rather
    than doing it inline.

**Output:** a screen that's traceably tied to a real design brief instead
of a generic default, with explicit states, motion, and accessibility
built in from the start — not bolted on after.
