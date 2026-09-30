# feature-full-auto — how it works

## What it does

**EXPERIMENTAL, test-only.** It's `feature-pipeline` with every
human-in-the-loop stop removed, built to answer one question: what does a
fully unattended run actually produce? Not a faster or safer version of
`feature-pipeline` — a deliberately less-safe one, for dogfooding.

Only invoke it by name, only on a project/simulator whose data you don't
mind being mutated, never as the default for a normal feature request.

## What's actually different from feature-pipeline

| | feature-pipeline | feature-full-auto |
|---|---|---|
| Upfront checkpoint | Yes, one, before any code | **None — starts building immediately** |
| `rn-app-driver` data-safety gate | Respected (stops to ask before mutating app data) | **Bypassed automatically (`--confirm` on everything)** |
| Review-agent recommendations | Reported as open items, user picks which to apply | **All applied, including judgment calls** |
| Judgment calls (ambiguous renames, product decisions) | Left to the user | **Resolved to the most conservative, easiest-to-undo option — and the choice is recorded** |
| End-of-run recommendation list | Yes, numbered, nothing pre-applied | **None — everything's already applied by the time the report exists** |
| Merge to `main` / CI-CD deploy / store submission | Never | **Still never — unchanged hard boundary** |
| Commit as its own step | Yes | **Yes, twice — once for the build, once for the review-pass fixes, kept separate** |

## How it works — the flow

```
 1. Scope/design/data plan decided        (no checkpoint — proceeds immediately,
                                            decisions recorded for the report)
 2. Build
 3. Test
 4. On-device verification via rn-app-driver
      → every data-changing action auto-confirmed, logged
 5. Commit (build)
 6. Review pass — real subagent calls (refactoring-agent, test-coverage-agent,
    architecture-reviewer, security-review, instrumentation agents)
 7. Implement EVERY recommendation from step 6, including judgment calls
    (most-conservative option picked, reasoning recorded)
 8. Commit (fixes) — kept separate from step 5's commit
 9. Push + open PR, if a remote exists
10. Report: everything decided unattended, every data mutation, what a
    human should double-check first
```

## The report is the only safety net left

Because nothing here was reviewed before being applied, the final report
has to account for every place it decided something instead of asking —
that's the actual point of running this: to see afterward how many of
those unattended decisions were fine, and which weren't. See
`docs/harness-verification.md` for what to check after a real run.

## Worked example

**Input:**
> "Run feature-full-auto on PocketSpotter's rest-timer screen — add a
> configurable rest duration per exercise."

**What the skill does:**

1. Decides scope on its own — e.g. "duration configurable per exercise,
   stored alongside the exercise data, default 90s if unset" — and starts
   building immediately, no checkpoint. Records this decision for the
   report.
2. Builds the duration picker UI and the storage wiring.
3. Tests it.
4. Drives it on the simulator via `rn-app-driver` — say adding a test
   exercise with a custom duration would normally print "may change app
   data... re-run with `--confirm`"; here it auto-adds `--confirm` and
   logs "added exercise 'Test Squat' with 120s rest — data mutated,
   unreviewed."
5. Commits the build.
6. Runs the review pass — `architecture-reviewer` recommends "this
   duration field probably belongs on the Exercise model, not a separate
   lookup table" — a genuine judgment call with product implications.
7. Implements it anyway, picking the more conservative option (adds the
   field to the existing model rather than restructuring into a new
   table) and records: "Judgment call: kept duration on the existing
   Exercise model rather than introducing a new table, since that's the
   smaller, easier-to-revert change."
8. Commits the fix separately from the build commit.
9. Pushes and opens a PR if a remote exists.
10. **Report** lists: the scope decision made unattended, the exercise
    added to simulator data during verification, the judgment call and
    why it was resolved that way, and flags all three as things a human
    should specifically double-check before trusting this PR.

**Output:** a complete, already-"fixed" PR — with an explicit, honest
paper trail of every place a human normally would have been asked first.
