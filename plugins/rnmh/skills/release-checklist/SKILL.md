---
name: "release-checklist"
description: "Use before submitting a bare React Native app to the App Store or Play Store, or cutting any production release — versioning, code signing, store compliance (privacy manifest/permissions), and a rollback/feature-flag safety net. Not a generic deploy checklist; specific to what actually blocks or burns an RN mobile release."
---

# Release checklist (bare React Native, App Store + Play Store)

## When to use
- About to submit a new version to the App Store and/or Play Store.
- Cutting any production build, including an internal/TestFlight/internal-
  track release that precedes a public one.

Not a substitute for the account's general `engineering:deploy-checklist`
skill where that applies (CI status, approvals) — this is the layer
specific to what actually blocks or burns a mobile store release, which a
generic deploy checklist doesn't cover.

## Versioning

- Platform version identifiers bumped and consistent: iOS
  `CFBundleShortVersionString` (marketing version) and `CFBundleVersion`
  (build number, must increase on every submission even for the same
  marketing version); Android `versionName` and `versionCode` (must
  strictly increase every submission, no exceptions).
- The version actually reflects what changed — don't ship a build-number
  bump with no changelog entry if user-facing behavior changed.
- Confirm the two platforms' marketing version strings match each other
  for the same release, unless there's a deliberate reason (a
  platform-specific hotfix) to diverge — and if so, say so explicitly
  rather than letting it happen unnoticed.

## Build & signing

- iOS: provisioning profile and signing certificate are valid and not
  about to expire, and match the target (distribution, not development/ad
  hoc) — an expired or mismatched profile is a common last-minute
  submission blocker.
- Android: signing config points at the actual release keystore, not a
  debug key — verify this explicitly, since a debug-signed release build
  still runs and can pass casual testing while being unsubmittable (or
  worse, unupdatable later if it slips through once).
- Confirm the release build was actually tested as a release build on a
  physical device, not only debug — release-only bugs (Hermes bytecode
  behavior, ProGuard/R8 stripping, minification) don't show up in dev (see
  the `rn-diagnostics` skill's dev-vs-release-only category if something
  surfaces here).
- Environment configuration (API base URL, feature flags, analytics keys)
  points at production, not a dev/staging endpoint — check this
  explicitly rather than assuming the build config handles it; this is a
  frequent silent mistake precisely because the app otherwise works fine
  in testing.

## Store compliance

- **iOS privacy manifest** (`PrivacyInfo.xcprivacy`): required if the app
  or any included SDK/native dependency uses an API category Apple tracks
  under "required reason" APIs (e.g. certain filesystem, UserDefaults, or
  system-boot-time APIs) — check third-party native dependencies for this,
  not just first-party code, since a missing manifest from a dependency
  can block submission with no obvious link to what's actually missing.
- **iOS App Privacy "nutrition label"** in App Store Connect matches what
  the app actually collects/uses — mismatches here are a common rejection
  and review-delay reason.
- **Android Data Safety form** in Play Console matches actual data
  collection/sharing behavior, for the same reason.
- **Permissions justification**: every requested permission (camera,
  location, notifications, health data, etc.) has a matching, accurate
  usage-description string (iOS `Info.plist` `*UsageDescription` keys) and
  is actually used for what the description says — an unused or
  overbroad permission request is a rejection risk on both stores.
- If the app targets a category with extra platform requirements (health,
  finance, kids) confirm those specific requirements before submission,
  not after a rejection names them.

## Rollout & safety net

- Staged rollout percentage set deliberately (not defaulting to 100%
  immediately) when the store supports it, for anything non-trivial in
  scope.
- A way to disable or revert a specific new feature without needing a new
  store review cycle exists for anything risky in this release (a feature
  flag, a remote config toggle) — if nothing like this exists yet for the
  feature being shipped, say so explicitly as a gap rather than silently
  shipping without one.
- Crash reporting/analytics for this build are confirmed wired up and
  pointed at the production environment before release, not discovered
  missing after a crash spike with no data to diagnose it.
- A rollback plan exists for the worst case: if this fails badly right
  after release, what happens? At minimum: halt the rollout percentage
  if staged, and confirm whether the previous version is still
  installable/available as a fallback.

## Process

1. Confirm scope: which platform(s), which release type (internal /
   staged / full public).
2. Work through Versioning, then Build & signing, then Store compliance,
   then Rollout & safety net, in that order — each section can reveal a
   blocker the next section shouldn't be checked against yet (e.g. no
   point verifying store compliance on a build signed with the wrong
   key).
3. Report explicitly: what's confirmed OK, what's a blocker that must be
   fixed before submitting, and what's a gap worth flagging but not
   necessarily blocking (e.g. no feature flag for a low-risk feature) —
   don't collapse these three into one undifferentiated list.
