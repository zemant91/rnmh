# feature-pipeline — how it works

## What it does

Runs the same steps as `feature-implementation`, but collapsed to **one
checkpoint up front** instead of a confirmation at every stage. Scope,
design direction, and the data/state plan get worked out and presented
once; after that go-ahead, the whole thing — build, test, on-device
verification, an automated review pass by this harness's other agents,
commit, and (if a remote exists) push + open a PR — runs unattended.

It never merges to `main`, never touches CI/CD deploy or store
submission, and never re-runs its own review pass to silently fix what
it just found. Every "Recommended, not applied" item from the review
agents ends up as a numbered item in the final report — applying any of
them is a separate, explicit thing the user asks for afterward.

## How it works — the flow

```
ONE CHECKPOINT
  scope + design direction + data/state plan + any open items
  from earlier runs (see persisted findings, below) — one message,
  one go-ahead, nothing stops again after this.
        │
        ▼
 1. Build            (design-to-code Step 8 + the confirmed data plan)
 2. Test              (testing's process)
 3. On-device check   (rn-app-driver, if a dev build + simulator are up)
 4. Review pass        — real subagent calls, not just "recalled" advice:
                          refactoring-agent, test-coverage-agent,
                          architecture-reviewer, security-review
                          (if sensitive data is touched), and whichever
                          instrumentation agent matches the feature
 5. Commit             (its own unconditional step — always happens)
 6. Push + open PR     (only if a remote is configured and reachable)
 7. Report             (what was built, what each agent found/applied,
                        every open recommendation numbered)
 8. Persist            (open recommendations saved to
                        .rnmh/feature-pipeline/open-recommendations.json)
```

## Persisted findings between runs

Each run appends its open recommendations to a JSON file in the project
(`.rnmh/feature-pipeline/open-recommendations.json`). The next run reads
it before presenting its checkpoint, so an old, never-addressed finding
gets mentioned again instead of being forgotten once the chat session
ends. This is visibility only — an old item still needs to be explicitly
named before it gets applied, exactly like a fresh one would.

## When to reach for it (vs. the alternatives)

- **This skill** — want the feature handed over end-to-end, asked only
  once, ending at a tested PR ready for review.
- **`feature-implementation`** — want a confirmation at every stage
  instead of just one.
- **`feature-full-auto`** — the experimental, no-checkpoints-at-all
  variant; only for deliberately testing what full automation produces,
  never for real work.

## Worked example

**Input:**
> "Build a tab-bar navigation for PocketSpotter — Home, Exercises,
> Favorites, Profile. Use feature-pipeline."

**What the skill does:**

1. **One checkpoint.** Presents: scope (bottom tab bar, four tabs, no
   nested stack changes beyond what's needed to host each tab's existing
   screen), design direction (a compact summary — icon set, active/
   inactive states, matching the app's existing minimal palette), and the
   data/state plan (navigation state only — no new persisted state
   needed). Also checks the persisted-findings file; say it finds one
   open item from the prior run ("Tabs have no `flex: 1`, a tap between
   tabs lands nowhere") and folds a one-line mention of it into the same
   checkpoint message, asking whether to fix it in this pass too. Waits
   for one go-ahead.
2. **Build.** Wires up the tab navigator and the four tab screens.
3. **Test.** Adds/updates navigation tests per `testing`'s process.
4. **On-device check.** If a dev build is running in the simulator,
   actually taps through all four tabs and confirms each one renders and
   is reachable — not just reading the navigator config back.
5. **Review pass.** Invokes `architecture-reviewer` (checks the
   navigator's structure against the rest of the app), `refactoring-agent`,
   `test-coverage-agent`. Say `architecture-reviewer` reports "Recommended:
   extract tab icon logic into a shared helper, three call sites
   duplicate it" — that goes into the report as an open item, not applied
   automatically.
6. **Commit**, then **push + PR** if a remote exists — otherwise, says so
   plainly and notes the commits exist locally.
7. **Report.** Lists what was built, what on-device verification
   confirmed, and one numbered open recommendation (the icon-helper
   extraction) plus whether the earlier `flex: 1` item got folded in and
   fixed.
8. **Persist.** Writes the new open item to the JSON file for the next
   run to pick up, and marks the `flex: 1` item `applied` if it was
   addressed this pass.

**Output:** a tested, on-device-verified, reviewed PR (or local commit),
plus one clearly numbered thing still open for you to decide on.
