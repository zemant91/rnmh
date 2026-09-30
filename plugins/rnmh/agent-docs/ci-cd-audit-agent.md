# ci-cd-audit-agent — how it works

## What it does

An unattended audit of an *already-existing* CI/CD pipeline config
(GitHub Actions workflow, Bitrise config, a Fastlane Fastfile) — missing
caching, ungated merges, secret-leaking log lines, unnecessary sequential
builds. Unlike this harness's other agents, it audits **infrastructure
config itself** (YAML/Ruby), not application code — mistakes here are
expensive and easy to miss until a build silently breaks or a secret
leaks. The rule that overrides everything else: it can never create a CI
secret, a signing certificate, or a branch-protection rule — those live
outside the repo's files entirely — and it never invents a caching setup
or a build-matrix restructuring from scratch. It only finishes wiring a
gap the pipeline **already has most of the pieces for**.

## How it works — the mechanical set (the only things applied directly)

```
✓ A dependency-install step ALREADY using a built-in caching option
  (e.g. setup-node's cache param) that just isn't turned on, for a
  lockfile already present → turn it on, keyed to that lockfile
✓ A deploy/build/upload job in the SAME workflow as an existing
  test/lint job, with no dependency between them → add the missing
  `needs`, so deploy only runs after tests pass
✓ A stray debug echo/print of a variable that's ALSO referenced
  elsewhere in the same file as a signing/API secret, with no other
  functional purpose → remove it

✗ Caching set up from nothing → ci-cd-pipeline skill conversation
✗ Sequential → parallel build restructuring → a bigger decision
✗ A hardcoded credential that needs an actual secret created →
  flagged, never "fixed" by moving it to a still-committed .env file
✗ Introducing Fastlane or a new CI provider → out of scope entirely
```

## When to reach for it

- A broader, unattended audit of an existing pipeline than an interactive
  `ci-cd-pipeline` review.
- Periodically, or after the pipeline has grown organically and might
  have drifted from its own established patterns.

## Worked example

**Input:**
> Audit PocketSpotter's GitHub Actions workflow.

**What the agent does:**

1. **Orient:** Globs `.github/workflows/` — finds `ci.yml` with a
   `test` job (lint, type-check, test) and a separate `deploy` job
   (builds and uploads to TestFlight), both in the same file.
2. **Caching check:** the `test` job's `setup-node` step has a `cache`
   parameter available but unset, and `package-lock.json` already exists
   in the repo. Exactly the mechanical case — **applies**: turns on
   `cache: 'npm'`, keyed to the lockfile.
3. **Gating check:** finds `deploy` has no `needs: test` — it currently
   runs in parallel with `test`, meaning a broken test suite doesn't
   block a store upload. Exactly the mechanical case — **applies**: adds
   `needs: test` to the `deploy` job.
4. **Secret-leak check:** scans for stray debug output — finds a leftover
   `echo "API_KEY=$API_KEY"` in the deploy job, where `API_KEY` is also
   used as the actual signing secret elsewhere in the same file.
   **Applies**: removes the debug line.
5. **Out-of-mechanical-scope finding:** notices both `deploy`'s iOS and
   Android build steps run sequentially in the same job, one after the
   other, when the runner setup could support running them as parallel
   jobs — this is a build-matrix restructuring, not a mechanical fix.
   **Not applied** — flagged as a recommendation pointing at the
   `ci-cd-pipeline` skill.
6. **Verify + commit:** confirms the YAML is still valid after each edit;
   three commits, one per fix: "CI: enable npm cache," "CI: gate deploy
   on test job," "CI: remove stray secret echo."
7. **Report:**
   - **Applied**: npm caching turned on (keyed to lockfile); `deploy` now
     gated on `test` passing; removed a stray debug echo that printed the
     signing API key to build logs.
   - **Recommended, not applied**: iOS/Android builds in `deploy` run
     sequentially — worth restructuring to parallel jobs, but that's a
     `ci-cd-pipeline` conversation, not a mechanical edit.

**Output:** a pipeline that now actually blocks a broken build from
reaching the store, caches dependencies, and no longer leaks its own
signing key to the logs — with the one bigger restructuring correctly
left for a deliberate decision.
