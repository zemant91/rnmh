---
name: "ci-cd-pipeline"
description: "Use when setting up or reviewing a CI/CD pipeline for a bare React Native + TypeScript app — lint/type-check/test gating, caching (Node/CocoaPods/Gradle), parallel iOS/Android builds, signing and secrets handling, artifact/source-map retention, and automated store delivery. Automates the concerns `release-checklist` covers manually. For an unattended pass auditing an already-existing pipeline config for gaps, see the `ci-cd-audit-agent` subagent instead."
---

# CI/CD pipeline (bare React Native + TypeScript)

## When to use
- Setting up CI (build/test on every PR) and/or CD (automated builds,
  store delivery) for the first time.
- Reviewing an existing pipeline for gaps, slowness, or a security concern
  (secrets handling).
- Adding a new stage to an existing pipeline (e.g. a new environment, an
  E2E stage, code signing that wasn't automated yet).

This skill automates the same concerns `release-checklist` walks through
manually before a submission — the goal here is to have the pipeline
enforce them on every relevant build instead of relying on someone
remembering to run the checklist. It also runs whatever the `testing`
skill's suite produces; it doesn't decide what to test, only how and when
those tests run.

## Check what's already there before assuming a setup

Detect the existing setup rather than assuming one: look for
`.github/workflows/`, a `bitrise.yml`, `.circleci/config.yml`, or a
Fastlane `fastlane/Fastfile` — don't default to GitHub Actions/Bitrise/
Fastlane if something else, or nothing, is already in place. If nothing
exists yet and the repo is hosted on GitHub, GitHub Actions is the lowest-
friction default to suggest, but confirm rather than assume it's wanted.
Check specifically whether Fastlane already orchestrates build/signing/
upload — that's common in mobile CI regardless of which provider triggers
it, since it centralizes iOS/Android build logic in one place callable
from any provider.

## Ask, don't assume — structural decisions

- Which CI provider, if none exists yet.
- Which stages are wanted now: lint/type-check, the test suite, a build-
  only sanity check (does it compile/link on both platforms), and/or a
  signed build with store upload — ask which of these to automate now vs.
  later, don't assume the full pipeline is wanted immediately.
- Trigger strategy: what runs on every PR vs. only on merge to
  main/release vs. on a tag/manual trigger.
- Where signing certs/API keys/per-environment config live — the CI
  provider's own secrets store is the usual default, but confirm rather
  than assume a different secrets manager is or isn't already in use.

## Core RN-specific CI concerns

### Caching
Node modules, CocoaPods (`Pods/` and its cache), and Gradle (`.gradle/`
cache, daemon) each meaningfully affect build time and are cached
separately — a pipeline missing any of the three redundantly re-resolves
or rebuilds from scratch every run. Key each cache to the relevant
lockfile (`package-lock.json`/`yarn.lock`/`Podfile.lock`/Gradle files) so
it invalidates when dependencies actually change, not on every run or
never.

### Build matrix
- iOS and Android builds are independent and usually should run as
  parallel jobs, not sequentially, unless runner resources force
  otherwise — sequential-by-default is a common unexamined slowdown.
- Not every PR necessarily needs a full native build on both platforms —
  weigh a lighter PR check (lint/type-check/tests) against reserving full
  platform builds for merge/tag, per the trigger-strategy decision above.

### Signing and secrets
- iOS certificates/provisioning profiles and the Android keystore must
  reach the CI runner without being committed to the repo in plain form —
  via the provider's encrypted secrets, an encrypted-certificate-storage
  approach (e.g. Fastlane match), or an equivalent. Check what's actually
  in place; a hardcoded or repo-committed keystore/cert is a real, common
  gap here, not a hypothetical one.
- No signing secret, API key, or credential should appear in build logs —
  verify verbose CI/build-tool output isn't inadvertently echoing one (a
  common leak point: a debug `echo`/verbose flag printing an env var that
  happens to hold a secret).

### Test and lint gating
- Confirm a failing test/lint/type-check actually blocks a merge (a
  required status check), rather than running and being ignorable — a
  pipeline that checks but doesn't gate on the result gives false
  confidence.
- Order the cheapest, fastest checks (lint, type-check) before the slower
  ones (full test suite, native builds), so a trivial mistake fails fast
  instead of waiting behind a long build.

### Artifact handling
- Build artifacts (IPA/AAB) and source maps should be uploaded/retained
  from CI, not only produced locally — confirm source maps specifically
  are captured and matched to the exact build/version that ships, since a
  crash reporter is only as useful as having the matching source map when
  a crash actually arrives.
- Name a retention/cleanup policy explicitly rather than letting every
  build's artifacts accumulate indefinitely by default.

### Store delivery
- Automated upload to TestFlight/Play Console's internal track (Fastlane's
  `pilot`/`supply`, or the provider's native store-upload action) vs. a
  manual upload step — ask which is wanted; automating this is usually
  worth it but does concentrate more trust in the pipeline's secrets.
- Decide the version/build-number bump strategy once (CI increments it,
  vs. a developer bumps it and CI only reads it) and apply it
  consistently — a mismatch causes a rejected upload (duplicate build
  number).

## What NOT to do
- Don't commit signing certificates, keystores, or API keys to the repo,
  even "temporarily" or in a private repo.
- Don't leave both platform builds sequential by default without checking
  whether parallel runners are available — this is often just leftover
  from a copied template, not a deliberate choice.
- Don't skip caching "to keep the config simple" — the resulting
  build-time cost compounds on every single run indefinitely.
- Don't wire up automated store delivery before test/lint gating exists —
  that just makes it faster to ship something broken.

## Process

1. Detect the existing CI/CD config, provider, and Fastlane usage (or its
   absence) before proposing anything.
2. Ask which stages are wanted now (the structural-decisions list above)
   rather than assuming the full pipeline is wanted at once.
3. Restate the resulting scope as a short plan — which stages, which
   triggers, where secrets live — before creating any config file, and
   wait for a go-ahead. This is a conversational checkpoint, not a saved
   document, same as `project-bootstrap`/`design-to-code`: a wrong
   pipeline shape is expensive to unwind once secrets and store delivery
   are wired to it. Skip the wait only if the user's own message already
   confirmed everything needed.
4. Set up caching for each relevant package manager from the start rather
   than adding it later.
5. Wire the fastest checks first and gate merges on them, then add the
   slower stages after.
6. Confirm secrets/signing are handled via the provider's own secrets
   mechanism, never committed to the repo.
7. Report what's automated, what's left manual by choice (e.g. manual
   store delivery), and what's a gap worth flagging (missing caching, no
   artifact/source-map retention, no gating).
