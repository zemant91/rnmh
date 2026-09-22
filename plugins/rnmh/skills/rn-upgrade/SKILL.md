---
name: "rn-upgrade"
description: "Use when upgrading the React Native version and/or native dependencies of a bare RN project. Covers pre-upgrade checks, safe ordering (core first, one version at a time), and native-project diff application — the parts of an RN upgrade that most commonly break silently or block release."
---

# RN / native dependency upgrade (bare React Native)

## When to use
- Bumping the React Native version itself.
- Bumping a native dependency (anything with iOS/Android native code, not
  a pure-JS package) that pins or assumes a particular RN version range.
- Enabling something version-gated (e.g. the New Architecture) on an
  existing project.

## Before starting

- Confirm the working tree is clean and CI/tests (if any exist for this
  project) are currently green — an upgrade started from a broken
  baseline makes it impossible to tell which failures are new.
- Do the upgrade on its own branch, isolated from feature work, so it can
  be reviewed and (if needed) abandoned without entangling unrelated
  changes.
- Bump **one RN minor/major version at a time**, not straight from the
  current version to the latest — skipping versions means skipping their
  individual breaking-change diffs and makes it much harder to attribute
  a new failure to a specific change.
- For each native dependency planned for a bump, check its own changelog
  for the RN version range it declares support for, rather than assuming
  the latest release of the dependency supports the RN version being
  targeted.
- Note which native dependencies pin a specific RN version tightly (peer
  dependency ranges) — these determine real ordering constraints, not just
  preference.

## Applying the version bump

- Use the official RN upgrade diff for the exact from-version/to-version
  pair (the React Native Upgrade Helper, or `npx react-native upgrade`) as
  the source of truth for native-project changes (Xcode project file,
  `Podfile`, `AndroidManifest.xml`, Gradle files, `Info.plist`) rather than
  hand-editing native config from memory or guesswork — these files are
  exactly where an upgrade silently breaks if a change is missed.
- Read the RN release notes for the target version for explicitly called
  out breaking changes and deprecations, not just the diff — some changes
  (deprecated JS APIs, changed default behavior) don't show up as a native
  file diff at all.
- After applying the version bump and native diff, do a clean native
  build before anything else (clear derived data / `pod install` fresh on
  iOS, `./gradlew clean` on Android) — a stale native build cache after an
  upgrade is a frequent source of confusing failures unrelated to the
  actual upgrade.

## Native dependency upgrade order

1. React Native core itself first, fully working (builds, runs, existing
   features still function) before touching native dependencies.
2. Native dependencies that explicitly require the new RN version to
   function at all (check their changelogs for this).
3. Remaining native dependencies, one at a time rather than in bulk —
   bulk-bumping several native packages together makes a resulting native
   build failure or runtime crash hard to attribute to the specific
   package responsible.
4. Pure-JS dependencies last — lowest risk, but still worth checking for
   their own major-version breaking changes independent of RN.

For each native dependency bumped, if it ships a codemod or migration
guide (common for navigation and animation libraries), apply it as
provided rather than hand-porting the changes.

## New Architecture (Fabric/TurboModules) considerations

If enabling the New Architecture as part of this upgrade (or if the target
RN version defaults to it), treat it as its own additional upgrade step,
not folded silently into the version bump:
- Check every native dependency in use against its own stated New
  Architecture support status — a dependency without support can fail
  silently or crash only at runtime, not at build time.
- Prefer enabling it as a separate, revertible step from the RN version
  bump itself, so a New-Architecture-specific regression doesn't get
  confused with a plain version-bump regression.

## Verification

- Run on both platforms, not just the one that happened to build first.
- Test an actual **release build**, not only dev — Hermes bytecode
  behavior, ProGuard/R8 stripping, and New Architecture codegen can all
  behave differently in release; a working dev build is not sufficient
  verification (see the `rn-diagnostics` skill's dev-vs-release-only
  category if something surfaces only here).
- Re-run this harness's other review skills where relevant after a
  non-trivial upgrade: `rn-diagnostics` for anything that crashes or
  behaves oddly, `architecture-reviewer` if the upgrade forced structural
  changes across many files.

## Process

1. Confirm current RN version, target version, and whether it's a single
   step or requires intermediate versions (per the "one version at a
   time" rule above) — lay out the actual sequence before starting.
2. For each native dependency in the project, check compatibility with the
   target RN version and note any that block or require special handling.
3. Apply the official upgrade diff for the RN version bump, then rebuild
   clean.
4. Upgrade native dependencies in the order above, one at a time, testing
   after each.
5. Handle the New Architecture as a separate step if it's in scope.
6. Verify on both platforms in both dev and release builds before
   considering the upgrade done.
7. Report: what was upgraded and in what order, what broke and how it was
   fixed, and what's still a known gap (a dependency not yet updated, a
   deprecation not yet addressed) rather than silently deferring it.
