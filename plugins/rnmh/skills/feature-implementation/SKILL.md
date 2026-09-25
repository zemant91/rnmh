---
name: "feature-implementation"
description: "Use when implementing a full feature end-to-end for a bare React Native + TypeScript app — from a design reference or requirements through to tested, reviewed code. Orchestrates this harness's other skills in the right order (design-to-code for the UI breakdown, testing for coverage, feature-flags/push/analytics skills where relevant) rather than duplicating them, and fills the gaps between them: requirements scoping before design exists, RN-specific data/state integration, and a full-feature completion checklist crossing UI, logic, data, and tests."
---

# Feature implementation, end to end (bare React Native + TypeScript)

## When to use
- Building a new feature/screen/flow start to finish — not just one
  isolated piece. For a single UI build with no surrounding feature work,
  or tests alone, reach for `design-to-code` or `testing` directly instead
  of this skill.
- Picking up a feature that has a design reference but no written
  requirements, or requirements but no design yet — either starting point
  should end up covering both before implementation begins.
- Reviewing a feature you just built against a completion checklist before
  calling it done.

This skill orchestrates the harness's other skills at the right points —
it does not duplicate their content. When a step below says to follow
another skill, read that skill's own SKILL.md in full for the actual
technique; what's here is the connective tissue and the RN-specific
concerns that don't live in any single existing skill: scoping a feature
before design exists, data/state integration, and a cross-cutting
completion check.

## Step 0 — Scope the feature before design or code

The gap this skill exists to close. Before reaching for `design-to-code`,
nail down:
- What the feature actually does — the core user-visible behavior, not
  implementation detail.
- What's explicitly out of scope for this pass. Unscoped "while I'm in
  here" additions to unrelated screens are a common way feature work
  quietly grows past what was asked for.
- Whether a design reference already exists, or needs to be found or
  created first — if nothing exists yet, `design-to-code`'s guidance on
  suggesting directions applies before anything else does.
- Whether this feature needs anything beyond UI: new data fetching or
  mutation, new state, a native capability (camera, biometrics), push or
  deep-link wiring, a rollout flag, new analytics events. Naming these now
  changes what Step 2 and Step 4 actually need to cover.

## Step 1 — Design breakdown

Hand off to `design-to-code`'s Steps 1-7: reference breakdown, anti-slop
check, state coverage (loading/empty/error/success), motion spec,
accessibility minimums, platform idioms. This skill doesn't re-derive any
of that — it takes the resulting breakdown as the input to Step 2.

## Step 2 — Data and state integration (the part design-to-code doesn't cover)

- Identify what data this feature reads or writes and how it plugs into
  whatever data-fetching/state approach the project already uses — detect
  what's already there rather than assuming a library, and don't introduce
  a second pattern alongside an existing one without naming that as a
  deliberate decision.
- Name every state this feature introduces beyond the UI states from
  `design-to-code` Step 4. A domain/business state that outlives a single
  screen (survives navigation, is shared with another feature) has a
  different lifetime than local component state — decide explicitly where
  it lives rather than defaulting to lifting everything to global state,
  or defaulting to local state without checking whether it needs to
  survive the screen.
- Error handling: decide where this feature's errors actually surface
  (inline per the design-to-code error state, a toast, a full error
  screen) and whether they need to reach existing error-reporting
  (`analytics-crash-reporting`, if that's set up) — decide this before
  writing the error paths, not as an afterthought once the happy path
  works.

## Step 3 — Plan and confirm before implementation

The same conversational checkpoint `design-to-code`'s Step 8b and
`project-bootstrap`'s Process use, applied at the feature level rather
than just the UI mapping: restate what's being built this pass (Step 0's
scope), the data/state/error-handling approach (Step 2), and anything
beyond plain UI+logic that's in scope (a flag, push/deep-link wiring, new
analytics events) — then wait for a go-ahead. Skip the wait only if the
user's own message already confirmed everything needed.

## Step 4 — Build

- UI: `design-to-code` Step 8's move-to-RN-technology mapping.
- Logic/data: wired per the Step 2 decisions — this harness doesn't
  prescribe how (no mandated architecture pattern), only that the decision
  was made explicitly rather than drifting mid-implementation.
- If Step 0 flagged a rollout flag, push/deep-link wiring, or new
  analytics events, bring in `feature-flags-remote-config`,
  `push-deep-linking`, or `analytics-crash-reporting` respectively at this
  point rather than improvising those concerns here.

## Step 5 — Test

Once the feature's logic and components exist, apply `testing`'s process:
what's worth testing at which Trophy layer, and the RN-specific mocking
concerns. This is part of the feature, not optional cleanup after it — if
nothing in scope clears the bar for testing, that's a valid outcome to
state explicitly, not a step to silently skip.

## Step 6 — Completion checklist

Before calling the feature done, confirm explicitly:
- Every state from `design-to-code` Step 4 is actually implemented, not
  just the happy path.
- The accessibility minimums from `design-to-code` Step 6 are in place.
- Error paths reach wherever Step 2 decided they should.
- Tests exist per Step 5, or an explicit reason is named for not writing
  one for a given piece.
- Anything flagged in Step 0 (flag, push/deep-link, analytics) is actually
  wired, not left as a TODO.

Report anything left incomplete explicitly — don't let a partially-done
feature look finished by omission.

## What NOT to do

- Don't skip Step 0 and jump straight to a design breakdown — a feature
  with no stated boundary tends to grow scope silently while it's built.
- Don't introduce a second state-management or data-fetching pattern
  alongside an existing one without naming that as a deliberate decision.
- Don't treat testing as optional-if-there's-time — Step 5 is part of the
  feature, not an extension of it.
- Don't re-derive guidance this skill delegates elsewhere (the UI
  breakdown, test-writing specifics) — follow the referenced skill's own
  process instead of improvising a shortcut version of it here.

## Process

1. Scope the feature (Step 0) before anything else.
2. Get or build the design breakdown (Step 1, via `design-to-code`).
3. Decide the data/state/error-handling integration (Step 2).
4. Restate the plan and wait for a go-ahead (Step 3).
5. Build UI and logic (Step 4), bringing in other harness skills for
   flags/push/analytics as scoped in Step 0.
6. Test (Step 5, via `testing`).
7. Run the completion checklist (Step 6) and report anything left
   incomplete.
