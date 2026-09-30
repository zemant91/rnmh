# release-checklist — how it works

## What it does

A manual, pre-submission walk-through before shipping a bare RN app to
the App Store/Play Store (or cutting any production release) —
versioning, code signing, store compliance (privacy manifest,
permissions), and a rollback/feature-flag safety net. Specific to what
actually blocks or burns a mobile release, not a generic deploy checklist
(CI status/approvals belong to `engineering:deploy-checklist` where that
applies). `ci-cd-pipeline` automates the same concerns into the pipeline
itself; this skill is the version you actually walk through by hand.

## How it works — four sections, checked in order

```
1. VERSIONING
   iOS CFBundleShortVersionString + CFBundleVersion (build number MUST
   increase every submission); Android versionName + versionCode
   (versionCode MUST strictly increase); marketing versions match
   across platforms unless a deliberate hotfix divergence is stated
        │
        ▼
2. BUILD & SIGNING
   iOS provisioning profile/cert valid, not expiring, DISTRIBUTION not
   dev/ad-hoc; Android signing points at the real release keystore, not
   debug; the RELEASE build was actually tested on a physical device
   (release-only bugs don't show up in dev); env config points at
   PRODUCTION, not staging
        │
        ▼
3. STORE COMPLIANCE
   iOS privacy manifest covers every "required reason" API used by
   first-party code AND third-party dependencies; App Privacy label /
   Play Data Safety form actually match real data collection; every
   requested permission has an accurate usage-description string AND
   is actually used for what it claims
        │
        ▼
4. ROLLOUT & SAFETY NET
   staged rollout % set deliberately (not defaulting to 100%); a way to
   disable/revert the new feature WITHOUT a new store review (a flag);
   crash reporting confirmed pointed at production; an actual rollback
   plan for "this fails badly right after release"
        │
        ▼
Report in three separate buckets: confirmed OK / blocker (must fix
before submitting) / gap worth flagging but not necessarily blocking
```

Sections are checked **in this order** deliberately — no point verifying
store compliance on a build that's signed with the wrong key.

## When to reach for it

- About to submit to the App Store and/or Play Store.
- Cutting any production build, including an internal/TestFlight/
  internal-track release ahead of a public one.

## Worked example

**Input:**
> "Getting PocketSpotter ready to submit v2.3.0 — run the release
> checklist."

**What the skill does:**

1. **Versioning:** confirms iOS build number bumped from the last
   submission, Android `versionCode` strictly increased, marketing
   versions match ("2.3.0" both platforms) — all OK.
2. **Build & signing:** checks the iOS distribution certificate — finds
   it expires in 8 days, before this release would realistically clear
   App Review. **Flags as a blocker**: renew before submitting. Confirms
   Android is signed with the release keystore, not debug — OK. Confirms
   the release build's API base URL points at production — OK. Notes the
   release build hasn't actually been run on a physical device yet, only
   simulator — **blocker**: release-only bugs (Hermes, R8 stripping)
   don't show up in dev/simulator, needs a real-device release test
   before submitting.
3. **Store compliance:** the new AI-coaching feature added a
   `UserDefaults`-reading dependency — checks whether the iOS privacy
   manifest covers it. It doesn't yet. **Blocker**: missing required-
   reason API declaration, would likely be rejected. Confirms the
   App Store "nutrition label" already matches what's collected — OK.
4. **Rollout & safety net:** the AI-coaching feature is gated behind the
   `aiCoachingEnabled` flag from an earlier `feature-flags-remote-config`
   pass — confirms it's actually a working revert path — OK. No staged
   rollout percentage is set yet for this release — **flags as a gap**,
   not a blocker, since the flag itself is already a safety net for this
   specific feature.
5. **Report, in three buckets:**
   - *Confirmed OK*: versioning, Android signing, prod env config, the
     AI-coaching flag as a safety net.
   - *Blockers*: expiring iOS cert, release build untested on physical
     device, missing privacy-manifest entry for the new dependency.
   - *Gap, not blocking*: no staged rollout percentage set — worth
     considering given this is a first AI-feature release.

**Output:** a clear go/no-go — three genuine blockers to fix before
submitting, one thing worth considering but not required, and everything
else confirmed clean — instead of one undifferentiated list that hides
which items are actually stopping the release.
