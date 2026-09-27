---
name: "feature-full-auto"
description: "EXPERIMENTAL, test-only — a deliberately unsafe variant of feature-pipeline that removes every human-in-the-loop stop: no upfront checkpoint, rn-app-driver's data-changing confirmation gate is bypassed automatically, and every review-agent recommendation gets implemented rather than reported, including genuine judgment calls (picks the most conservative option itself and states why). Only invoke explicitly by name, when the point is specifically to see what full automation produces — never on a project whose data you care about, never as the default for a normal feature request. Still never merges or pushes to main, and never touches CI/CD deploy or store submission — those stay hard boundaries regardless of mode."
---

# Feature full-auto — EXPERIMENTAL, no checkpoints at all

## What this is, and isn't

This exists to answer one question: what does a fully unattended run
actually produce, with every stop this harness normally keeps removed?
It's a test variant of `feature-pipeline`, not a replacement for it and
not something to reach for on real work. For anything you actually care
about, use `feature-pipeline` instead — one checkpoint, agents report
open findings instead of self-applying them, and `rn-app-driver`'s
data-safety stop stays intact. Only run this one when the goal is
specifically to see what full automation does, on a project/simulator
whose data you don't mind being mutated.

## What's different from feature-pipeline

- **No upfront checkpoint.** Work out scope, design direction, and
  data/state/error-handling in one pass, then start building immediately
  — don't present it for a go-ahead. Record what was decided for the
  final report instead.
- **`rn-app-driver`'s data-changing confirmation gate is bypassed.** Any
  action that would normally print "may change app data... re-run with
  `--confirm`" gets `--confirm` automatically instead of stopping to ask.
  Real app data can be created, edited, or deleted on the simulator with
  nobody reviewing that first. Log every such action plainly in the
  report — after the fact is the only review it gets.
- **Every review-pass recommendation gets implemented,** not just each
  agent's own narrow "apply directly" set. Where a recommendation is a
  genuine judgment call with more than one reasonable answer (a product
  decision, an ambiguous rename, which module something belongs in), pick
  the most conservative, easiest-to-undo option, implement it, and say
  explicitly in the report which option was picked and why. Never
  silently pick a default without naming it as a real decision made
  unattended.
- **No recommendation list to choose from at the end** — by the time the
  report is written, everything in it has already been applied.

## What this still never does (unchanged from feature-pipeline)

- Never merges the resulting branch/PR to `main`, and never pushes to
  `main` directly.
- Never runs a CI/CD deploy or a store submission — no agent in this
  harness does that regardless of mode, and this skill doesn't add one.
- Never folds "commit" into another step. It's its own unconditional
  action, same reasoning as `feature-pipeline`'s Step 5/8: a real dogfood
  run of that skill skipped the commit entirely when it was only
  mentioned inside another step's sentence.

## Process

1. Work out scope, design direction, and data/state/error-handling
   approach in one pass. Proceed immediately — note the decisions made
   for the final report rather than asking.
2. Build (`design-to-code` for UI, the confirmed plan for logic/data).
3. Test.
4. On-device verification via `rn-app-driver`, if its prerequisites are
   met — auto-passing `--confirm` on every action it would otherwise
   refuse. Log each one, with what it did to app data.
5. Commit the build to a feature branch — unconditional, its own step.
6. Invoke the review pass as real subagent calls: `refactoring-agent`,
   `test-coverage-agent`, `architecture-reviewer`, `security-review`'s
   checklist if the feature touches anything sensitive, and whichever of
   `feature-flags-audit-agent`/`push-deep-linking-agent`/
   `analytics-coverage-agent` matches scope.
7. Implement every recommendation from step 6 — including ones outside
   each agent's own narrow apply-set. For a genuine judgment call, pick
   the most conservative option and record the choice and reasoning.
8. Commit the fixes from step 7 separately from the original build (a
   reviewer should be able to see the two apart).
9. If a git remote is configured and reachable, push the branch and open
   the PR; if not, say so plainly.
10. Produce one report covering: what was built; every decision made
    without being asked (scope choices, judgment-call recommendations,
    which option was picked and why); every `rn-app-driver` action that
    changed app data; and what a human should double-check first, given
    that nothing here was actually reviewed before being applied.

## Reporting

The report is the only safety net this skill has left, so it has to be
complete about every place it decided something instead of asking —
that's the actual point of running this instead of `feature-pipeline`:
to see afterward how many of those unattended decisions were fine, and
which ones weren't. See `docs/harness-verification.md` for what to check
after a real run.
