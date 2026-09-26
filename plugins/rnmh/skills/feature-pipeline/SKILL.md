---
name: "feature-pipeline"
description: "Use when a feature should be implemented hands-off after a single upfront confirmation — from an idea or design reference through build, tests, on-device verification, and an automated review pass, ending at a tested, reviewed PR ready for merge. Never merges to main and never touches CI/CD deployment or store submission. Runs feature-implementation's steps as one uninterrupted pass instead of stopping at each one, and explicitly invokes this harness's other agents (architecture-reviewer, refactoring-agent, test-coverage-agent, and the relevant instrumentation agents) as real subagent calls rather than soft cross-references, so the chaining is actually enforced instead of just written down."
---

# Feature pipeline — one checkpoint, then hands-off to a tested PR

## When to use

You want a feature handed over end-to-end and only asked once, up front —
not at every stage `feature-implementation` would normally pause at. For
step-by-step control with a confirmation at each stage instead, use
`feature-implementation` directly — this skill runs the same underlying
process, collapsed to one confirmation and then run straight through.

## What this skill never does on its own

- Never merges the resulting branch/PR to `main`.
- Never runs a CI/CD deploy or a store submission — that's
  `ci-cd-pipeline`'s remit, and its own agent already refuses to touch
  secrets or signing; this skill doesn't override that boundary.
- Never removes the single upfront checkpoint. If something genuinely
  changes the scope agreed there mid-pipeline — not an implementation
  detail, an actual change to what's being built — stop and say so rather
  than silently re-deciding it.
- Never treats a subagent's "Recommended, not applied" finding as
  resolved. Those go into the final report as open items, not swept under.
- Never re-runs its own review pass to auto-fix the recommendations it
  just produced. Every recommendation is an open item in the final
  report; applying any of them is a separate, explicit follow-up the
  user asks for by naming which ones — never a repeat cycle this skill
  decides to run on its own initiative.

## The one checkpoint — scope, design, and data/state in a single message

Before touching any code, work out (without asking anything yet):
- The feature's scope: what it does, what's explicitly out for this pass —
  `feature-implementation` Step 0, but as a stated proposal from the
  clearest reading of what was asked, not a round of questions. If
  something is genuinely ambiguous enough that a wrong guess would be
  expensive to unwind, name that specific ambiguity here rather than
  silently picking a side.
- The design direction: a reference's breakdown, or a proposed direction
  if none was given (`design-to-code` Step 1) — kept to a brief summary
  here, not the full analysis.
- The data/state/error-handling approach (`feature-implementation` Step 2)
  — detected from the project's existing conventions wherever they apply;
  where nothing existing covers it, state the choice being made and why,
  since there's no second round to revisit it in.
- Anything beyond UI in scope: a rollout flag, push/deep-link wiring, new
  analytics events.

Present all of that as one message and wait for one go-ahead. Nothing
after this point stops for confirmation again — that's the entire
difference between this skill and `feature-implementation`'s normal flow.

## What runs afterward, unattended

1. **Build** — UI per `design-to-code` Step 8, logic/data per the
   confirmed plan.
2. **Test** — `testing`'s process, applied directly.
3. **On-device verification, if it applies** — if `rn-app-driver` is
   available, the target is an iOS simulator, and it's a **dev build**
   (Metro reachable, `axe` installed): actually drive the built feature —
   look at the real screen, act on it, check the result — rather than
   only reading the code back. `rn-app-driver` doesn't cover Android or
   release builds; if any of its prerequisites aren't met, name that gap
   explicitly in the final report instead of skipping verification
   silently.
4. **Automated review pass — as real subagent invocations, not textual
   references.** Actually invoke each of these against the files this
   feature touched, one at a time, rather than only recalling their
   guidance:
   - `refactoring-agent`
   - `test-coverage-agent` (in case Step 2's testing pass left a gap)
   - `architecture-reviewer`
   - `security-review`'s checklist, applied directly (it has no dedicated
     agent), if the feature touches anything sensitive per the checkpoint
     scope
   - whichever of `feature-flags-audit-agent`, `push-deep-linking-agent`,
     or `analytics-coverage-agent` matches what the checkpoint flagged
     beyond plain UI+logic
5. **Commit — its own step, unconditional.** Once build, test, on-device
   verification, and the review pass are done, commit the work to a
   feature branch. Do this regardless of whether a remote is configured —
   a missing remote only changes step 6, never this one. A real dogfood
   run skipped this entirely when it was only mentioned inside the
   report/PR step instead of standing on its own — that's why it's a
   separate, explicit action here rather than folded into step 6 or 7.
6. **Push and open a PR — only if a remote is configured and reachable.**
   If there's no remote, or it isn't reachable, say so plainly in the
   final report instead: the commits from step 5 still exist on the
   branch, just not pushed.
7. **Consolidate.** Apply what each agent already applies directly per its
   own safety protocol — that's how those agents already work, this skill
   doesn't change it. Collect everything every agent reported as
   "Recommended, not applied" into one combined list in the final report,
   rather than leaving it scattered across separate outputs.

## Constraints worth stating at the checkpoint, not after

- This depends on the harness's other skills/agents actually being
  installed, and — for on-device verification — a reachable simulator with
  the app already running in dev mode. If either isn't true, say so as
  part of the checkpoint message, not as a surprise partway through.
- Subagent invocation only works if the live session actually makes the
  call — this skill's Process below spells out each invocation as an
  explicit action, not as background knowledge to recall, specifically
  because that distinction is what makes the chaining reliable (see
  `docs/harness-verification.md`, Batch 2, for why a soft cross-reference
  alone isn't enough).
- Whether this actually ends at a pushed, opened PR depends on the
  project having a git remote already configured and reachable (e.g.
  GitHub) — not just a local repo. If no remote is configured, say so at
  the checkpoint. This never skips the commit itself (see step 5 below) —
  only whether step 6 can also push and open a PR.

## After the report — applying recommendations

The consolidated report lists every open recommendation, numbered. Do not
act on any of them yet. End the report with an explicit, low-effort reply
format instead of leaving it open-ended — e.g. "Reply with the numbers to
apply (like `1,3,6`), `all`, or `none`." This isn't a clickable checklist
(a plain terminal session has no such widget — only the chat surface
this harness is sometimes used from does), but a numbered list plus a
one-line reply format is the cheapest equivalent it can actually offer
there.

If the user then names which ones to apply, treat that as one explicit,
separate follow-up pass: apply only the named items, re-run whatever
tests/on-device checks that change touches, and update the report to
reflect what changed. Never launch this pass unprompted, and never
expand it to "everything on the list" unless the user actually said that.

## Process

1. Work out scope, design direction, and data/state/error-handling
   approach in one pass — no questions yet, just a proposed plan.
2. Present the single combined checkpoint message and wait for the one
   go-ahead.
3. Build (`feature-implementation` Step 4).
4. Test (`feature-implementation` Step 5).
5. Run on-device verification via `rn-app-driver` if its prerequisites are
   met.
6. Explicitly invoke each relevant subagent — `refactoring-agent`,
   `test-coverage-agent`, `architecture-reviewer`, and any
   instrumentation-specific agent the checkpoint flagged — one at a time,
   noting what each one applied versus recommended.
7. Apply `security-review`'s checklist directly if the feature touches
   anything sensitive.
8. Commit the work to a feature branch. Do this unconditionally — with or
   without a remote, finished or with open recommendations still listed.
9. If a git remote is configured and reachable, push the branch and open
   the PR; if not, say so plainly — the branch from step 8 still has its
   commits, just not pushed.
10. Produce one consolidated report: what was built, what
    testing/on-device verification confirmed, what each agent applied,
    whether step 9 pushed/opened a PR or stopped at local commits, and
    everything still open as a numbered recommendation. Merging and
    shipping stay manual either way.
11. If the user then names specific recommendations to apply, treat it as
    one explicit follow-up pass — apply only those, re-verify what they
    touch, and update the report. Don't do this unless asked, and don't
    quietly widen it beyond what was named.
