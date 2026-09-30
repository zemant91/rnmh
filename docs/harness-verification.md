# Harness verification log

Nothing in `plugins/rnmh` has been run against real code yet — every
skill and agent was written in conversation, never dogfooded. This file
is the checklist for closing that gap before adding anything new, and the
running log of what's been checked and what it found. An entry here
exists only once a skill/agent was actually used on real work — not a
speculative "this might be wrong."

## How this is used

- Work through the batches below in order — Batches 1 and 2 are cheap and
  check structural risk (which skill fires at all, and whether a skill
  that does fire actually follows its own internal handoffs) before
  spending real time on content quality. Batches 3 and 4 use actual
  project work, not synthetic tests, since that's the only way to tell
  whether a skill's guidance holds up.
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

## Batch 2 — internal step-chaining reliability (feature-implementation)

`feature-implementation`'s steps reference other skills by name
(`design-to-code` at Step 1, `testing` at Step 5) as plain text in its own
SKILL.md — nothing forces those handoffs to actually happen. A live
session may just improvise from a vague memory of what the other skill
says instead of actually reading/applying it. This is a different failure
mode than Batch 1: that one is about which skill fires at all; this one is
about whether a skill that *did* fire actually follows its own internal
references once running. Check, the next real time `feature-implementation`
runs (or is meant to run) on an actual feature:

- Did `feature-implementation` actually get invoked (auto-triggered or
  explicit), or did a different skill (`design-to-code`, or nothing) fire
  instead for a natural "add feature X" request?
- At Step 1, did the model actually apply `design-to-code`'s full process
  (breakdown, anti-slop check, state coverage, motion, accessibility,
  platform idioms), or skip straight to UI code with only a rough
  paraphrase?
- At Step 3, did the model actually stop and wait for a go-ahead before
  writing code, or proceed straight through?
- At Step 5, did the model actually apply `testing`'s Trophy-layer
  guidance and RN-specific mocking concerns, or write generic tests
  without consulting that skill?
- At Step 6, was the completion checklist actually run and reported
  honestly (including anything left incomplete), or skipped/rubber-
  stamped?

## rn-app-driver — tested while building it (2026-09-26)

Built and exercised against a real app (pain tracker, iOS 27 simulator,
Xcode 27) in the same session, so it starts out dogfooded rather than
untested: screen snapshot on Home/History/AttackDetail, real taps on tabs
and a stack back button, scroll inside a list, offscreen refusal,
data-changing refusal (`icon:Trash`). Not yet exercised: `type`, `--long`,
Android. Findings fixed along the way: Metro needs an `Origin` header; RN's
Promise polyfill breaks CDP `awaitPromise`; AXe's default tap style doesn't
reach RN `Pressable`s on iOS 27 (touch down/up does); settle must wait for
the first change before treating the screen as stable.

## Batch 3 — content quality on real work

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

## Batch 4 — agent hit-rate

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

## Batch 5 — feature-full-auto vs. feature-pipeline (dogfood comparison)

`feature-full-auto` exists only to answer this comparison, so run it on
the same kind of real feature `feature-pipeline` was tested on, and check:

- Did it actually implement every review-pass recommendation, not just
  each agent's own narrow mechanical set — or did it quietly fall back to
  only the safe subset out of habit?
- For each judgment-call recommendation it resolved on its own (a product
  decision, an ambiguous rename, module placement): was the "most
  conservative option" it picked actually reasonable, and did it name the
  decision plainly in the report rather than burying it?
- Did any `rn-app-driver` action it auto-confirmed actually mutate app
  data in a way that's annoying to clean up? Is that logged clearly
  enough to find and undo?
- Compare the two final diffs on the same feature, if both get run:
  does `feature-full-auto`'s unattended version hold up as well as
  `feature-pipeline`'s reviewed-then-selectively-applied one, or does the
  gap between "recommended" and "safe to auto-apply" turn out to matter
  in practice?

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

### 2026-09-26 — feature-pipeline (first real run)
- Tested on: PocketSpotter (gym-rep-counter-app), brand-new repo, "Exercises
  list" screen (catalog + group filters), iPhone 17 Pro simulator via
  `rn-app-driver`.
- Trigger: explicit (`feature-pipeline` run directly from Claude Code).
- Held up:
  - Scoped itself to one useful slice (exercise catalog + filtered list)
    instead of trying to build the whole v1 backlog at once.
  - Picked only the relevant agents (`refactoring-agent`,
    `test-coverage-agent`, `architecture-reviewer`) and explicitly skipped
    `security-review` with a stated reason (no sensitive data in this
    feature) — the self-scoping worked as designed.
  - `test-coverage-agent` actually applied 2 new tests (id uniqueness,
    every group has a filter), each verified against broken logic — matches
    its mutation-testing bar, not just a recommendation.
  - `rn-app-driver` refused to claim a synthetic back-swipe worked when it
    didn't actually navigate, and reported it as an open finding instead of
    quietly moving on — the "don't fake what you didn't verify" discipline
    held under real use.
  - Found a real architecture issue: the exercise catalog (`squat`-style
    ids) and the workout-program data (`e1`...`e12` ids) are linked only by
    name, which would break `Log Set` later — a genuine catch, not busywork.
  - Handled a real tool gap transparently: the Figma MCP can't read node
    data from Make-file sources, so it fell back to reading the rendered
    preview (text/sizes/colors) and said so upfront rather than silently
    guessing at fidelity.
- Didn't hold up / open questions (resolved):
  - Single upfront checkpoint: confirmed it did happen — Valiantsin
    approved the plan before any code was written ("да, подтверждал
    реализацию, нельзя отдавать на 100% работу агентам"). Matches spec.
  - Run didn't reach a pushed/opened PR because the project only had a
    local git repo, no configured remote — not a chaining failure, just an
    unstated prerequisite. `feature-pipeline`'s SKILL.md now names this
    explicitly at the checkpoint and falls back to "tested, reviewed local
    commits" when no remote exists, instead of silently promising a PR it
    can't open.
  - `refactoring-agent` and `architecture-reviewer` made zero applied
    edits between them (7 recommendations total) — consistent with their
    deliberately narrow "apply directly" sets, one data point toward that
    ratio being normal rather than a gap.
- Fix applied:
  - Added a git-remote check to `feature-pipeline`'s checkpoint
    constraints (say upfront if there's no remote to push/open a PR
    against).
  - Added an explicit "After the report — applying recommendations"
    policy: never auto-loop the review pass to silently fix its own
    findings (two of this run's 7 recommendations were real product/UX
    decisions — back button vs. tab bar, where a shared type lives — not
    things an agent should resolve on its own). Instead, the consolidated
    report lists recommendations numbered, and applying any of them is one
    explicit follow-up pass only when the user names which ones.

### 2026-09-27 — feature-pipeline (second real run, same feature)

- Tested on: PocketSpotter, follow-up to the 2026-09-26 run — bottom tab
  navigation (5 tabs), resolving the open "Start Workout target" question
  from that run in favor of a tab.
- Trigger: explicit (`feature-pipeline` run again from Claude Code).
- Held up:
  - Findings this round were concretely useful and non-obvious: missing
    `flex: 1` on tabs (silent dead-zone tap targets, no visual symptom),
    safe-area/orientation gap on iPad/Android rotation, a color-contrast
    check on the exact inactive-label color/size the design specified
    (correctly framed as a design call, not overridden), and a genuinely
    subtle one — Home never unmounting means a stale date/training day if
    the app stays open past midnight.
  - `test-coverage-agent` correctly added nothing and said why (no RNTL
    installed, no pure logic to unit-test in this diff) instead of
    inventing a test harness — matches its own restriction.
  - `security-review` correctly self-skipped again (no network/sensitive
    data in this diff).
  - The "list recommendations, apply nothing automatically" policy from
    the previous fix visibly held: the report explicitly stated "ничего
    из этого не применено."
  - Correctly deferred a couple of found issues instead of unilaterally
    fixing them: a type-import direction that's technically backwards but
    is already how this project's own `CLAUDE.md` says to do it (respected
    the existing convention over a textbook fix), and the Start-Workout
    routing question was surfaced as an open product decision rather than
    picked on its own.
- Didn't hold up:
  - **No commit happened at all** — not even a local one — despite the
    previous fix explicitly saying the pipeline should still produce
    "tested, reviewed commits on a branch" without a remote. Root cause:
    that instruction was folded into the same sentence as the report/PR
    step instead of being its own action, so the live run appears to have
    skipped it entirely. This is a concrete, observed instance of exactly
    what Batch 2 warned about in the abstract — a soft/buried instruction
    not getting followed.
  - `rn-app-driver`: swipe-to-scroll via AXe didn't move the list; had to
    scroll through the simulator's own hardware panel instead.
  - `rn-app-driver`: a scroll on the Home screen was reported under
    `@Tabs/scroll` rather than the screen's own `home/scroll` testID —
    looks like the component-tree walk is misattributing an element to
    the enclosing tab navigator once a bottom tab bar is in the tree.
- Fix applied:
  - `feature-pipeline`'s "What runs afterward" list and Process now treat
    commit as its own unconditional step (new step 5 / Process step 8),
    separate from push/PR (step 6 / step 9) — a missing remote can no
    longer read as "skip the commit too."
- Fix still open:
  - The two `rn-app-driver` findings above (scroll-via-AXe not reaching
    the list, testID misattribution under a tab navigator) are gaps in
    `rn-app-driver` itself, not `feature-pipeline` — need a session
    working directly with `rn-app-driver` on a tab-based screen to
    reproduce and fix, same as the fixes already logged in its own section
    above.

### 2026-09-30 — rn-app-driver (type reliability)
- Tested on: PocketSpotter, registration screen (email + password fields).
- Trigger: explicit, `rnmh:rn-app-driver`.
- Didn't hold up: `act.mjs type` tapped the field and sent keystrokes with
  no wait in between; two `type` calls in a row (email field, then
  password field) left the second field empty — the tap almost certainly
  landed before the field actually became first responder, a race that's
  worse switching focus between two fields than focusing a fresh one.
  Reported as: had to fall back to a manual/computer-control input method
  outside `act.mjs` to type at all, and that path doesn't write to
  `actions.log`/`actions.jsonl` since it never goes through the script.
- Fix: `type` now waits 250ms after the tap before sending keystrokes,
  then checks whether the screen actually changed; if not, it re-locates
  the field (in case the keyboard appearing moved it) and retries once
  before giving up. A retry is recorded in the log line and in
  `actions.jsonl` (`retried: true`), so — unlike the manual-workaround
  path — it stays visible even when it takes two attempts.
- Fix still open: verified the retry loop's control flow with a synthetic
  test (mocked axe/settle calls — no real simulator reachable from where
  this fix was written); NOT yet verified against a real simulator. Needs
  a real run on the same registration screen to confirm the delay and the
  "changed" check actually catch this specific race, and to see whether
  the invalid-email/short-password validation checks can now be saved as
  a case per the original ask.
