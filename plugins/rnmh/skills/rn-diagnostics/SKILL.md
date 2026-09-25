---
name: "rn-diagnostics"
description: "Use when triaging a React Native bug that isn't a plain logic error — a crash, a perf/re-render problem, a bundler/Metro failure, a native build/linking issue, or something that only happens in a release build or on one platform. Classifies the symptom first, then routes to the right RN-specific tool before proposing a fix."
---

# RN diagnostics (bare React Native, iOS + Android)

## When to use
- A crash (native or JS), not a straightforward logic bug with an obvious
  cause.
- Perf complaints: janky scrolling, dropped frames, sluggish interaction,
  excessive re-renders.
- A build/bundle failure (Metro, Gradle, Xcode/CocoaPods) that isn't
  self-explanatory from the error text alone.
- Something that only reproduces in a release build, or only on one
  platform.

For a plain logic bug with a clear repro and no RN-specific tooling
involved, the general reproduce → isolate → diagnose → fix discipline
(the account's `engineering:debug` skill, if available) is enough on its
own — this skill exists for the RN-specific triage layer on top of that,
not to replace it.

## Step 0 — Classify before touching anything

Don't start pulling logs or opening Xcode/Android Studio until the symptom
is placed into one of these buckets — each needs a different toolchain,
and guessing wrong wastes a full diagnostic pass:

1. **Native crash** — the app terminates/crashes outright (not a red
   screen), often only reproducible on-device or in a release build.
2. **JS-layer crash/exception** — a red screen, an unhandled promise
   rejection, or a caught error with a JS stack trace.
3. **Performance** — dropped frames, jank, slow interaction response,
   suspiciously frequent re-renders.
4. **Bundler/Metro** — fails to bundle, resolves the wrong module/file,
   stale cache symptoms, duplicate-package errors.
5. **Native build/linking** — fails in Xcode/CocoaPods or Gradle, autolink
   errors, native module not found at runtime despite being installed.
6. **Dev-only vs release-only** — reproduces in one build type but not the
   other (this can co-occur with any of 1-5 above; note it as a modifier,
   since it usually points at Hermes optimization, minification, or
   ProGuard/R8 stripping something that only matters in release).
7. **Platform-only** — reproduces on iOS or Android but not both (also a
   modifier on the above, not a separate root cause).

State the bucket (plus modifiers 6/7 if they apply) explicitly before
moving to Step 1.

## Step 1 — Gather what the bucket actually needs

- **Native crash**: the crash log itself. iOS: the `.ips`/`.crash` report
  and matching `dSYM` for that build (symbolicate with `atos` or Xcode
  Organizer — an unsymbolicated stack of hex addresses is not yet
  diagnosable). Android: `adb logcat` around the crash timestamp, and for
  a native (NDK) crash the tombstone plus `ndk-stack`; for a Java/Kotlin
  crash the exception stack from logcat is usually already symbolic unless
  R8/ProGuard obfuscation is on, in which case it needs the mapping file.
- **JS-layer crash**: the full JS stack trace with source maps applied
  (unminified — an obfuscated release-build stack is close to useless
  without the matching source map), plus whether it's wrapped by an error
  boundary or fully uncaught.
- **Performance**: React Native DevTools' Profiler (or Flipper's React
  DevTools plugin on older RN versions still using Flipper) to find
  what's re-rendering and why; the native-side frame timeline (Xcode
  Instruments / Android GPU rendering profiler) to tell a JS-thread
  problem from a UI/native-thread problem — these have different fixes
  and shouldn't be guessed from symptoms alone.
- **Bundler/Metro**: the full Metro error output (not just the last line),
  and whether `.ios.`/`.android.` platform-specific file resolution is
  involved; try a clean cache (`--reset-cache`) as a diagnostic step (does
  it change the symptom?), not as a blind fix.
- **Native build/linking**: the full Xcode/CocoaPods or Gradle build log
  (not just the error summary Metro or the CLI truncates to), the RN
  version and the native dependency's version, and whether autolinking
  actually picked up the module (check the generated
  `Podfile.lock`/autolinking config or Gradle's dependency list).
- **Dev vs release / platform-only modifiers**: confirm exactly which
  build types and platforms were tried — a report of "doesn't work" that
  only ever tested one combination isn't yet isolated.

## Step 2 — Common root-cause checklist per bucket

Use these as hypotheses to check against the gathered evidence, not as a
list to apply blindly:
- **Native crash**: native module version mismatch after a partial
  upgrade, a native module used before its native side finished
  initializing, memory pressure from a large image/list not being
  released.
- **JS-layer crash**: null/undefined from an async response reaching a
  render path with no guard, a hook rules-of-hooks violation surfacing
  only under a specific navigation path.
- **Performance**: unstable references passed to memoized children
  (inline functions/objects), heavy computation in render, unvirtualized
  or badly configured long lists, animation not running on Reanimated
  worklets/native driver.
- **Bundler/Metro**: duplicate copies of a package (two different
  versions resolved, common after partial `node_modules` upgrades or
  monorepo hoisting issues), a stale Metro cache after a native module or
  config change, a missing platform-specific file variant.
- **Native build/linking**: autolinking skipped because of a manual
  linking leftover from an older RN version, a CocoaPods/Gradle cache not
  invalidated after a dependency bump, a native module requiring a manual
  Info.plist/AndroidManifest entry the JS-side install step doesn't add
  automatically.
- **Release-only**: Hermes bytecode behavior differing from JSC dev
  behavior, ProGuard/R8 stripping a class relied on via reflection,
  environment variables/config only injected in one build type.

## Process

1. Reproduce with an exact, minimal set of steps — device/simulator, OS
   version, dev vs release build, which platform. If it can't be
   reproduced reliably yet, that's the actual current blocker — say so,
   don't guess past it.
2. Classify (Step 0).
3. Gather the bucket-specific evidence (Step 1) before forming a theory.
4. Check the evidence against the relevant root-cause hypotheses (Step 2),
   ruling out rather than assuming the first plausible match.
5. Once the root cause is confirmed (not just suspected), hand off:
   fixing a structural cause found this way (e.g. unstable references
   causing re-renders) can go through the `refactoring` skill in this
   harness rather than a one-off patch, if it's a pattern rather than a
   one-line fix. For a confirmed Performance-bucket root cause
   specifically, `performance-audit` has the fix-technique catalog and the
   surrounding checklist (list virtualization, memoization, bundle/startup
   concerns) for that category.

## Output format

State the classification (bucket + modifiers) first, then the evidence
gathered, then the confirmed root cause with the specific evidence that
confirms it (not just "likely"), then the fix. If the root cause is still
unconfirmed after gathering evidence, say exactly that and what
additional evidence (a specific log, a specific repro variant) would
confirm or rule out the leading hypothesis — don't present a guess as a
diagnosis.
