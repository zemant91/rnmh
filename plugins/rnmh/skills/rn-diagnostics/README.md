# rn-diagnostics — how it works

## What it does

Triages a React Native bug that isn't a plain logic error — a crash, a
perf problem, a bundler failure, a native build/linking issue, or
something that only shows up in a release build or on one platform.
The core discipline: **classify before touching anything**, then gather
exactly the evidence that classification calls for, then check that
evidence against known root causes — rather than jumping straight to a
guessed fix.

## How it works — the flow

```
0. CLASSIFY first — into one bucket (+ modifiers):
   native crash / JS crash / performance / bundler-Metro /
   native build-linking / (+ dev-vs-release, +platform-only)
        │
        ▼
1. Reproduce with an exact, minimal, stated repro
        │
        ▼
2. Gather ONLY the evidence that bucket needs
   (symbolicated crash log, source-mapped JS stack, Profiler trace,
   full build log, etc. — not a generic "here's everything")
        │
        ▼
3. Check the evidence against that bucket's known root-cause list
   (ruling out, not assuming the first plausible match)
        │
        ▼
4. Confirm the root cause with specific evidence — not "likely"
        │
        ▼
5. Hand off the fix: a structural cause → refactoring skill;
   a confirmed Performance root cause → performance-audit's catalog
```

Guessing the wrong bucket wastes a full diagnostic pass — a build-log
question needs a completely different toolchain than a Profiler trace —
so Step 0 is stated explicitly before anything else happens.

## When to reach for it

- A crash, not a plain logic bug with an obvious cause.
- Jank, dropped frames, excessive re-renders.
- A Metro/Gradle/Xcode build failure that isn't self-explanatory.
- Something that only reproduces in release, or only on one platform.

For a plain logic bug with a clear repro, the general debug discipline is
enough on its own — this skill is specifically the RN-tooling layer on
top of that.

## Worked example

**Input:**
> "The app crashes on Android in release builds only, right after
> tapping 'Start Workout.' Works fine in dev."

**What the skill does:**

1. **Classify:** Native or JS-layer crash? — needs checking first. Say
   it's a hard native crash (app terminates, no red screen). Bucket:
   **Native crash**, modifier: **release-only**, **Android-only**.
2. **Gather:** asks for `adb logcat` around the crash timestamp, and
   since it's release, whether ProGuard/R8 is enabled (if so, the
   mapping file is needed to de-obfuscate the stack).
3. **Root-cause check:** cross-references the release-only modifier's
   known causes — ProGuard/R8 stripping a class relied on via
   reflection, or Hermes bytecode behavior differing from dev's JSC.
   Say the de-obfuscated stack shows a `ClassNotFoundException` for a
   native module class — that matches the "ProGuard stripped a
   reflectively-used class" hypothesis specifically, not just
   generically "something's different in release."
4. **Confirms** the root cause with the actual evidence (the specific
   exception + the specific stripped class), not "probably ProGuard."
5. **Hands off:** since the fix is a one-line ProGuard keep-rule, not a
   structural pattern, applies it directly rather than routing to
   `refactoring`.

**Output:**
> Classification: Native crash, release-only, Android-only. Evidence:
> de-obfuscated logcat shows `ClassNotFoundException` for
> `WorkoutNativeModule` — R8 stripped it because it's only referenced via
> reflection. Confirmed root cause. Fix: added a `-keep` rule for that
> class in `proguard-rules.pro`.

If the evidence hadn't been conclusive, the report would have said
exactly that instead of presenting a guess as a diagnosis — e.g. "stack
shows a native crash but the mapping file wasn't available; need the
release build's actual mapping.txt to de-obfuscate before confirming."
