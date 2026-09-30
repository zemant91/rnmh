# feature-implementation — how it works

## What it does

Runs a full feature — a screen, a flow, a piece of end-to-end product
work — from "here's what I need" through to tested, reviewed code. It
doesn't reinvent UI-building or test-writing itself; it's the connective
tissue between this harness's other skills (`design-to-code` for the UI
breakdown, `testing` for coverage) plus the parts none of them cover on
their own: scoping the feature before design exists, wiring data/state,
and a completion checklist that crosses UI, logic, data, and tests.

The defining trait is **a checkpoint at every stage** — scope, then
design, then the data/state plan, then build, then test, then the
completion check. Each stage gets a confirmation before moving to the
next. That's the trade-off against `feature-pipeline` (same underlying
steps, one checkpoint total, then hands-off).

## How it works — the flow

```
Step 0  Scope the feature (what it does, what's out of scope)
   │
Step 1  Design breakdown          → hands off to design-to-code Steps 1-7
   │
Step 2  Data/state/error wiring   → detects the project's existing pattern,
   │                                 doesn't invent a new one silently
Step 3  Plan + confirm            → checkpoint: restate scope + design +
   │                                 data plan, wait for go-ahead
Step 4  Build                     → UI via design-to-code Step 8,
   │                                 logic/data per Step 2's decisions
Step 5  Test                      → hands off to testing's process
   │
Step 6  Completion checklist      → every state implemented? a11y in
                                     place? error paths wired? tested?
                                     driven on-device if rn-app-driver
                                     is available?
```

Nothing here is a black box — every step either does the connective work
directly (scoping, data/state decisions, the checklist) or names exactly
which other skill's process it's handing off to and for what.

## When to reach for it (vs. the alternatives)

- **This skill** — a full feature, want a checkpoint at each stage so you
  can redirect mid-flight.
- **`feature-pipeline`** — same steps, but one checkpoint up front, then
  it runs straight through to a tested PR.
- **`design-to-code` alone** — just the UI, no feature-level scoping,
  data wiring, or test pass.
- **`testing` alone** — writing tests for code that already exists.

## Worked example

**Input (what you'd say):**
> "Add a 'favorite workout' feature to PocketSpotter — tap a star on any
> workout card to save it, and a Favorites tab to see them all."

**What the skill does:**

1. **Step 0 — Scope.** States explicitly: in scope is the star toggle on
   the existing workout card component and a new Favorites tab listing
   starred workouts; out of scope is any syncing across devices or a
   favorites limit. Notes this needs new local state (which workouts are
   starred) but no new native capability, flag, or analytics event —
   unless you'd said otherwise.
2. **Step 1 — Design.** Hands off to `design-to-code`: breaks down how
   the star toggle should look/animate on the card, and what the new
   Favorites tab's empty/loading/populated states look like.
3. **Step 2 — Data/state.** Checks how the project already persists
   local data (say it's already using AsyncStorage for settings) and
   proposes storing starred workout IDs there rather than introducing a
   new local database — states this as a decision, not a silent default.
4. **Step 3 — Checkpoint.** One message: "Building the star toggle +
   Favorites tab, storing starred IDs in AsyncStorage alongside your
   existing settings storage, no sync/limit in this pass — go ahead?"
5. **Step 4 — Build.** Implements the star toggle component, the
   AsyncStorage read/write, and the Favorites screen.
6. **Step 5 — Test.** Applies `testing`'s process — likely a unit test
   for the starred-IDs persistence logic and a component test for the
   toggle's visual states.
7. **Step 6 — Completion checklist.** Confirms: empty state (no
   favorites yet) is built, not just the happy path; star toggle has an
   accessible label ("Add to favorites" / "Remove from favorites"); if
   `rn-app-driver` is available, actually taps the star on the simulator
   and confirms the tab updates — rather than only reading the code back.

**Output:** a working favorite-workout feature with an explicit record of
what was in/out of scope, where the data lives and why, and a checklist
confirming nothing was left half-done — with a confirmation gate before
each of the six stages above.
