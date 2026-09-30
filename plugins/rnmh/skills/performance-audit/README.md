# performance-audit — how it works

## What it does

A proactive, periodic or pre-release performance review of a bare RN app
— bundle size, startup time, render hot paths, list virtualization,
images/memory. Not for chasing an active complaint with an unknown cause
— that's `rn-diagnostics`'s Performance bucket first; this skill is the
audit/fix-catalog side once a category is already known, or when nothing
specific is broken yet but it's time to check.

## The rule everything here follows: measure, don't guess

Every finding has to point at something concrete — a bundle-size number,
a profiler trace showing what re-rendered and why, an actual measured
frame drop. Applying `useMemo`/`useCallback`/`React.memo` "just in case"
has its own cost (comparison overhead, obscured logic) for no confirmed
benefit — so nothing here gets applied without the measurement that
justifies it, or it's handed over as a recommendation naming what would
need measuring first.

## How it works — the categories

```
0. Detect the actual setup first — engine (Hermes?), architecture
   (Fabric/TurboModules?), existing bundle-analyzer, list library —
   don't recommend switching any of these without confirming what's
   already decided
        │
        ▼
1. Bundle size       → analyzer output, duplicate dependency versions,
                        a heavy lib pulled in for a thin slice of it
2. Startup time      → Hermes on? heavy sync work gating first render?
                        first-screen assets blocked on network?
3. Render perf       → profiler-confirmed re-renders only — never a
                        blanket memoization recommendation
4. Lists             → missing/unstable keyExtractor (safe, common fix);
                        getItemLayout only for genuinely fixed row height
5. Images/memory     → oversized assets, missing image cache, leaked
                        subscriptions/timers with no cleanup
        │
        ▼
6. Rank fixes by confirmed impact vs. effort; apply only what's both
   safe and measurement-backed, otherwise hand off as a recommendation
```

## When to reach for it

- A periodic or pre-release audit with no single active complaint.
- Reviewing a PR for a performance regression before merge.
- After `rn-diagnostics` confirmed a Performance-bucket root cause and
  named the category — this skill supplies the fix technique.

## Worked example

**Input:**
> "Pre-release audit on PocketSpotter before we submit to the store."

**What the skill does:**

1. **Detect setup:** confirms Hermes is enabled, the New Architecture is
   off (so old-bridge-traffic advice still applies here), no bundle
   analyzer is wired up yet, and lists use plain `FlatList`.
2. **Bundle size:** flags the missing analyzer as a gap rather than
   guessing size by eye; suggests adding `source-map-explorer`. Notes
   `moment.js` is imported wholesale for one date-formatting call —
   names it as a candidate for a lighter alternative, but flags that
   replacement should be confirmed to cover actual usage first, not
   assumed.
3. **Startup:** Hermes is already on — no finding there. Finds the app
   eagerly initializes the Health-sync native module on every cold start
   even on screens that never use it — names this as a real
   time-to-interactive cost, not just "runs at startup by convention."
4. **Render perf:** doesn't recommend blanket memoization. Instead
   profiles the Home screen and finds the workout list's row component
   re-renders on every parent tick because of an inline arrow function
   passed as `onPress` — this is a `rn-diagnostics`-catalog cause,
   confirmed in the trace, so the fix (stabilize the callback with
   `useCallback`) is applied here with the trace as evidence.
5. **Lists:** the workout `FlatList` uses array index as `keyExtractor`
   on a list that supports reordering — flags this as a concrete,
   unambiguous, low-risk fix, and applies it directly (a stable workout
   ID exists already).
6. **Images:** the exercise thumbnail images are served at 4x their
   rendered size — flags the mismatch with actual numbers (200x200pt
   rendered, 1600x1600px assets) as a concrete finding.
7. **Report, ranked:** "Fixed (measured): unstable keyExtractor, inline
   callback causing row re-renders (trace attached). Recommended,
   ranked by impact: oversized thumbnail assets (high impact, low
   effort), eager Health-module init on startup (medium impact, needs
   a lazy-init decision), bundle analyzer missing (do this first, so
   the moment.js call is a measured decision not a guess)."

**Output:** two fixes applied because they were both safe and
measurement-backed, and a ranked list of the rest — nothing invented, and
nothing where there wasn't yet a real measurement behind it.
