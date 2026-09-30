# ci-cd-pipeline — how it works

## What it does

Sets up or reviews CI/CD for a bare RN app — lint/type-check/test gating,
caching (Node/CocoaPods/Gradle), parallel iOS/Android builds, signing and
secrets handling, artifact/source-map retention, and automated store
delivery. It automates the same concerns `release-checklist` walks
through manually — the goal is having the pipeline enforce them on every
build instead of relying on someone remembering to run the checklist.

## How it works — the flow

```
0. Detect the existing setup — GitHub Actions / Bitrise / CircleCI
   config, or a Fastlane Fastfile already centralizing build/sign/upload
   — don't default to a provider that isn't already chosen
        │
        ▼
1. Ask, don't assume: which provider if none exists; which stages
   NOW (lint/type-check? tests? build-only sanity? signed store upload?)
   vs. later; trigger strategy (every PR vs. merge vs. tag); where
   secrets live
        │
        ▼
2. CHECKPOINT — restate the scope as a plan, wait for go-ahead
   (a wrong pipeline shape is expensive to unwind once secrets and
   store delivery are wired to it)
        │
        ▼
3. Caching FROM THE START — Node, CocoaPods, Gradle, each keyed to
   its own lockfile — not added later as an afterthought
        │
        ▼
4. Build matrix — iOS/Android as PARALLEL jobs unless resources force
   otherwise; not every PR needs a full native build on both platforms
        │
        ▼
5. Signing/secrets — via the provider's own secrets store or Fastlane
   match, NEVER committed; verify verbose logs aren't echoing one
        │
        ▼
6. Gating — fastest checks (lint/type-check) BEFORE slow ones (tests,
   native builds); a failing check must actually BLOCK merge, not just
   run and be ignorable
        │
        ▼
7. Artifacts — IPA/AAB + source maps retained from CI, matched to the
   exact shipped build/version, with a stated retention policy
        │
        ▼
8. Store delivery — automated (Fastlane pilot/supply) vs. manual,
   asked not assumed; version/build-number bump strategy decided once
        │
        ▼
9. Report: what's automated, what's manual by choice, what's a gap
```

## Why the checkpoint before any config exists

Once secrets and store delivery are wired to a pipeline shape, changing
that shape later is expensive — so the scope (which stages, which
triggers, where secrets live) gets confirmed as a plan before any config
file is created, the same discipline `project-bootstrap` and
`design-to-code` use before generating anything.

## When to reach for it

- Setting up CI/CD for the first time.
- Reviewing an existing pipeline for gaps, slowness, or a secrets
  concern.
- Adding a new stage (a new environment, an E2E stage, automating signing
  that wasn't automated yet).

## Worked example

**Input:**
> "Set up CI for PocketSpotter — GitHub repo, nothing configured yet."

**What the skill does:**

1. **Detect:** confirms no `.github/workflows/`, no Fastlane, nothing
   exists yet.
2. **Ask:** GitHub Actions is the lowest-friction default given the repo
   host, but confirms rather than assumes. Asks which stages are wanted
   now — say the answer is lint + type-check + tests on every PR, full
   signed builds deferred for now.
3. **Checkpoint:** "Setting up GitHub Actions: lint/type-check/tests on
   every PR, no native builds or store delivery yet — cache Node modules
   keyed to the lockfile — go ahead?" Waits.
4. **Caching:** wires Node-modules caching keyed to `package-lock.json`
   from the very first workflow file, not as a later optimization.
5. **Build matrix:** not relevant yet since native builds aren't in scope
   this pass — notes this explicitly rather than silently building it
   anyway.
6. **Signing/secrets:** none needed yet — notes this is deferred, not
   skipped by oversight.
7. **Gating:** orders lint first, then type-check, then tests — each a
   required status check that blocks merge on failure, not just an
   informational run.
8. **Store delivery:** out of scope this pass, as agreed at the
   checkpoint.
9. **Report:** "Added `.github/workflows/ci.yml`: lint → type-check →
   tests, gated as required checks on every PR, Node modules cached by
   lockfile hash. Deferred by choice: native builds, signing, store
   delivery — revisit with `ci-cd-pipeline` again once those are wanted."

**Output:** a working, gated PR pipeline scoped to exactly what was
asked for — with the deferred pieces named explicitly so nothing looks
silently decided.
