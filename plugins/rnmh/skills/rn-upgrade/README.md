# rn-upgrade — how it works

## What it does

Upgrades the React Native version and/or native dependencies of a bare RN
project, covering the parts that most commonly break silently or block a
release: doing it on a clean baseline, one version at a time, applying
the *official* native-project diff instead of hand-editing config from
memory, and upgrading dependencies in an order that keeps a resulting
failure attributable to one specific change.

## How it works — the flow

```
BEFORE STARTING
  clean working tree + green tests → own branch → confirm the
  version jump is single-step or needs intermediates (never skip
  versions) → check each native dependency's own RN-support range

APPLY THE BUMP
  official upgrade diff (Upgrade Helper / `react-native upgrade`)
  for native project files — never hand-edited from memory
  + read the release notes for breaking changes with no file diff
  → clean native build (fresh pod install / gradlew clean)

UPGRADE ORDER
  1. RN core itself, fully working
  2. native deps that REQUIRE the new RN version
  3. remaining native deps, ONE AT A TIME (never bulk)
  4. pure-JS deps last

NEW ARCHITECTURE (if in scope)
  its own separate, revertible step — never folded into the version bump

VERIFY
  both platforms, dev AND release build (Hermes/ProGuard/R8/codegen
  differ in release) → re-run rn-diagnostics / architecture-reviewer
  if something broke or structure shifted
```

## Why the ordering is the point

The failure modes this skill exists to prevent are all "it broke, but
nobody can tell which of the five things that changed caused it" —
bulk-bumping native dependencies together, skipping an intermediate RN
version, or hand-editing native config instead of applying the real diff
all produce exactly that kind of unattributable failure. Every rule here
traces back to keeping one variable moving at a time.

## When to reach for it

- Bumping the RN version itself.
- Bumping any dependency with native (not pure-JS) code that pins an RN
  range.
- Turning on something version-gated, like the New Architecture, on an
  existing project.

## Worked example

**Input:**
> "Upgrade PocketSpotter from RN 0.74 to 0.76, and bump react-native-vision-camera
> while we're at it."

**What the skill does:**

1. **Before starting:** confirms the tree is clean, tests are green,
   creates an `upgrade/rn-0.76` branch. Notes 0.74 → 0.76 is two minor
   versions — lays out the actual sequence: 0.74 → 0.75 → 0.76, not a
   direct jump. Checks `react-native-vision-camera`'s changelog for its
   stated RN 0.76 support.
2. **Applies the bump:** pulls the official Upgrade Helper diff for
   0.74→0.75 first, applies it to the native project files, reads 0.75's
   release notes for breaking changes with no file diff (say, a
   deprecated JS API PocketSpotter still uses). Does a clean
   `pod install` + Xcode clean build.
3. **Repeats for 0.75→0.76.**
4. **Dependency order:** RN core is fully working and existing features
   still run before touching vision-camera. Checks whether vision-camera
   *requires* 0.76 to function (say it doesn't strictly require it, so
   it's bumped as a normal step-3 dependency, not step-2). Bumps it
   alone, applies its migration codemod if it ships one, tests before
   moving to any other pure-JS bump.
5. **New Architecture:** not in scope this time — skipped, noted as such.
6. **Verification:** runs on both iOS and Android, and specifically
   builds and tests a **release** build, not just dev — catches, say, a
   Hermes-only crash that dev's JSC build didn't surface. Hands that off
   to `rn-diagnostics` rather than guessing at a fix inline.
7. **Report:** "Upgraded 0.74→0.75→0.76, then vision-camera (codemod
   applied). Release build initially crashed on Android — see
   rn-diagnostics report — root cause confirmed as X, fixed. Still open:
   one deprecated JS API from 0.75's release notes not yet migrated,
   left as a known gap."

**Output:** a working upgrade with a traceable order, a release build
actually verified rather than assumed, and nothing silently deferred.
