# Harness verification log

Nothing in `plugins/rnmh` has been run against real code yet — every
skill and agent was written in conversation, never dogfooded. This file
is the checklist for closing that gap before adding anything new, and the
running log of what's been checked and what it found. An entry here
exists only once a skill/agent was actually used on real work — not a
speculative "this might be wrong."

## How this is used

- Work through the batches below in order — Batch 1 is cheap and checks a
  structural risk (auto-trigger collisions between overlapping skills)
  before spending real time on content quality. Batches 2 and 3 use
  actual project work, not synthetic tests, since that's the only way to
  tell whether a skill's guidance holds up.
- After each test, append an entry in the format below — plain text back
  in conversation is fine too, but capturing it here means a finding isn't
  lost, and it's the same running-log pattern `conventions.md` already
  uses in this repo.
- A finding here gets acted on (the skill/agent fixed, or the doc updated
  to explain why the behavior is actually fine) before it's marked
  resolved — this file isn't meant to accumulate open findings
  indefinitely.

## Batch 1 — auto-trigger disambiguation

Several skills cover adjacent ground on purpose (cross-referenced in each
other's descriptions), but nobody has checked what Claude Code actually
picks when a request is phrased naturally rather than as an explicit
`/rnmh:<name>` command. Try these as plain descriptions of a problem, not
slash commands, and note what actually fires:

- "приложение крашится только в релизной сборке на Android" — expected
  `rn-diagnostics` (native-crash + release-only bucket); watch for
  `analytics-crash-reporting` firing instead or alongside.
- "хочу добавить трекинг падений в проде" — expected
  `analytics-crash-reporting`; watch for `rn-diagnostics`.
- "приложение тормозит при скролле длинного списка" — expected either
  `rn-diagnostics` (Performance bucket, if framed as an active complaint)
  or `performance-audit` (if framed as a review) — check which one a
  natural phrasing actually triggers, since the skill descriptions try to
  route this but the routing itself is untested.
- "ссылка из письма не открывает приложение" — expected
  `push-deep-linking`; watch for `security-review`.
- "надо перед сдачей в стор всё проверить" — expected `release-checklist`;
  watch for `ci-cd-pipeline`.
- "хочу автоматизировать сборку и тесты" — expected `ci-cd-pipeline`,
  should have the least overlap of the set.

## Batch 2 — content quality on real work

Use these the next time real work naturally calls for them — not a
contrived test case:

- `testing` — does the setup-detection actually read this project's real
  Jest/RNTL conventions correctly? Does the Trophy-layer guidance produce
  a sensible test scope, or does it feel like busywork relative to what
  actually matters in the code being tested?
- `localization` — if a project has or is adding i18n: does the
  pluralization guidance actually hold for Russian's three-form plural
  system (a good real test since a wrong claim there would be obvious
  immediately)? Does the Hermes/`Intl` gap warning apply to this project's
  actual RN version, or is that a stale/overstated claim?
- `refactoring` / `architecture-reviewer` — the most mature pair; use as a
  baseline for how much value to expect, and check whether the newer
  `design-to-code`/`project-bootstrap` planning checkpoint (Step 8b /
  Process step 4) actually gets followed in practice or reads as
  unnecessary friction.

## Batch 3 — agent hit-rate

The newer agents' "apply directly" sets were deliberately kept narrow.
Run at least one to see whether that narrowness makes them mostly a
reporting tool rather than real automation:

- `test-coverage-agent` on a real under-tested file — does it find and
  safely add anything, or is the result entirely "Recommended, not
  applied"?
- `refactoring-agent` on the same kind of target, as a comparison
  baseline — it's the most mature agent, so its applied/recommended ratio
  is the reference point for what "normal" looks like.
- One newer agent (`localization-coverage-agent` or
  `performance-audit-agent` are good candidates) — check whether it ever
  hits its mechanical set in practice, or whether the safety protocol is
  so narrow it never finds an applicable case.

## Entry format

```
### YYYY-MM-DD — <skill or agent name>
- Tested on: <project / file / real task, not a synthetic example>
- Trigger: <auto (which one fired) / explicit /rnmh:...>
- Held up: <what was actually correct/useful, specific not vague>
- Didn't hold up: <the actual gap — quote the SKILL.md line if it's a
  specific claim that was wrong, not just "felt off">
- Fix: <concrete change needed, or "needs discussion">
```

## Log

(empty — nothing verified yet)
