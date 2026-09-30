---
name: "ci-cd-pipeline"
description: "Use when setting up or reviewing a CI/CD pipeline for a bare React Native + TypeScript app — lint/type-check/test gating, caching (Node/CocoaPods/Gradle), parallel iOS/Android builds, signing and secrets handling, artifact/source-map retention, and a real, verified Fastlane setup for basic (internal-track) store delivery — public release submission always stays a manual, explicit step. Automates the concerns `release-checklist` covers manually. For an unattended pass auditing an already-existing pipeline config for gaps, see the `ci-cd-audit-agent` subagent instead."
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
- Decide the version/build-number bump strategy once (CI increments it,
  vs. a developer bumps it and CI only reads it) and apply it
  consistently — a mismatch causes a rejected upload (duplicate build
  number).
- For the actual Fastlane setup and execution — writing the lanes,
  finding each credential, running and verifying the upload, and the
  gate around public release — see "Fastlane setup and basic store
  deploy" below. This isn't a config-writing exercise alone: a lane
  isn't done until it's actually been run once and the build confirmed
  to have arrived.

## Fastlane setup and basic store deploy

This is the one part of this skill that goes beyond writing config: once
a Fastfile/lane is in place, actually run it and confirm the upload
really happened — a fastlane lane handed over untested is a config file
with a hope attached to it, not a working pipeline stage.

### Credentials — say exactly where to find each one, never ask for one in chat

- **iOS — App Store Connect API key**: App Store Connect → Users and
  Access → Integrations → App Store Connect API → generate a key with
  the App Manager (or Developer) role. Apple shows the private key (a
  `.p8` file) exactly once at creation — note the Key ID and Issuer ID
  shown alongside it too, Fastlane needs all three. Reference it from the
  Fastfile via `app_store_connect_api_key` (a path or env var to the
  key), never paste the key's contents into a file that gets committed.
- **iOS signing**: check whether Fastlane match is already in use or
  wanted (an encrypted cert/profile store in a private git repo or cloud
  bucket, keyed to a passphrase kept in CI secrets) before assuming it —
  if certs/profiles are currently managed manually, say so and ask before
  introducing match as a new moving part.
- **Android — Google Play service account**: Play Console → Setup → API
  access → link a Google Cloud project → create a service account there
  → grant it a release-management role in Play Console → download its
  JSON key. This requires a Play Console developer account (and an app
  record) to exist first — a one-time paid registration with its own
  identity-verification step on Google's side, which is a prerequisite
  this skill can't shortcut. If the account or app record doesn't exist
  yet, say so explicitly and scope this pass to the iOS lane only, rather
  than writing an Android lane that can't be tested.
- **Android signing**: confirm whether a release keystore already exists
  before generating one — a keystore that's ever signed a real release
  build must never be regenerated or lost (Play Console ties every future
  update to the original signing key), so "does one already exist" is the
  first question, not "here's a new one."
- Every credential above is referenced from the Fastfile/Appfile by path,
  env var, or CI secret name only — never written into a committed file
  directly, and never typed into chat. If a value needs to reach the
  pipeline, it goes into the CI provider's own secrets store or a local,
  gitignored `.env`.

### Lanes to create (internal distribution only — this is the "basic" deploy)

- `ios beta` — build, sign with the App Store distribution profile,
  upload to TestFlight via `pilot`.
- `android internal` — build a signed AAB, upload to the Play Console
  Internal testing track via `supply`.
- Nothing that promotes a build to public review or production goes into
  a lane at this stage — see the gate below.

### Run it for real, don't just hand over the file

- After writing a lane, run it and confirm the build actually shows up in
  TestFlight / the Play Console internal track — check Fastlane's own
  exit status **and**, where practical, the actual listing. A multi-step
  lane can exit 0 having failed partway through in some failure modes, so
  the uploaded build is the real source of truth, not the process exit
  code alone.
- If a lane can't be run end-to-end yet (e.g. no Play Console account or
  app record exists), say so plainly: the lane is written but unverified,
  not "done."

## The hard gate: public/production release is never automatic

- Once `ios beta` / `android internal` have each been run and confirmed
  working once, they may run unattended as a normal pipeline stage on
  every relevant build from then on — internal-track distribution
  doesn't reach real users and is easy to undo.
- Anything that reaches real users — an App Store review submission, a
  Play Console production-track rollout, or promoting an existing
  internal build to either — always needs the user's explicit, real-time
  go-ahead at the moment of that specific release, regardless of how
  automated the rest of the pipeline is. Never wire this into a routine
  trigger (e.g. "every merge to main auto-submits"), even if asked to,
  without confirming that's genuinely wanted first — this is a one-way
  door in a way an internal build isn't. `release-checklist`'s manual
  walk-through is exactly the check that belongs at this gate.

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
- Don't write a credential's actual value into the Fastfile/Appfile or
  any other committed file — reference it by path, env var, or CI secret
  name only.
- Don't wire a public/production release (App Store submission, a Play
  production-track rollout) into an automatic trigger, even if asked to,
  without confirming that's genuinely wanted first — that crosses from an
  internal build into something real users see, and it's a one-way door.

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
7. If Fastlane lanes for store delivery are in scope, write them, say
   exactly where each credential comes from, and actually run each lane
   once — a lane isn't done until the build is confirmed to have reached
   TestFlight/the Play Console internal track, not when the file merely
   compiles.
8. Report what's automated (naming which lanes were run and verified vs.
   written-but-unverified), what's left manual by choice, what's a gap
   worth flagging, and restate the public-release gate explicitly:
   internal-track lanes may run unattended once verified, public
   submission never does without the user's go-ahead at that moment.
