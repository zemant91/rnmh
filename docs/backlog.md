# Backlog

Ideas worth doing but not designed or scheduled yet — as opposed to
`harness-verification.md` (checks against real usage) or the README's
Roadmap (what's already built). An entry here moves to the roadmap once
it's actually been designed and built, not before.

## rn-app-driver: per-case state setup

Saved cases currently assume where the app starts, and most on-device
flakiness comes from navigating to the right state through the UI.

- Let each saved case declare the state it needs as data (a seed/fixture
  step) that `run-case` applies before the first tap.
- Open question: reset via the app itself (debug menu / deep link) or
  directly at the storage level.
- Source: LinkedIn feedback on post #2 + own experience in the first
  `feature-pipeline` run (several on-device runs needed because of
  data/state).

## feature-pipeline: persist findings between runs

Each run's report currently ends in the chat, so the next run rediscovers
the same issues.

- Write the consolidated report (open recommendations, what was applied)
  to a file in the project, e.g. under `.rnmh/`.
- The next run reads it first and starts from the open items.
- Pairs with the planned iterate-on-own-recommendations loop — note it
  conflicts with the current "never re-runs its own review pass" rule,
  which needs revisiting.
