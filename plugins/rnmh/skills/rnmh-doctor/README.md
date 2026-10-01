# rnmh-doctor — how it works

## What it does

Checks whether the machine actually has what this harness's
real-execution skills need — not application code, not a project, just
the local toolchain: `axe` for `rn-app-driver`, `fastlane`/CocoaPods/the
Android SDK for `ci-cd-pipeline`'s verified store deploy, and whether npm/
GitHub are actually reachable for `rn-library-research`. A gap here would
otherwise surface later as a confusing failure half-way through some
other skill, with no obvious link back to "a tool was never installed."

## How it works

```
Run node $D/doctor.mjs — a real script, not Claude guessing from memory
        │
        ▼
Checks run grouped by which skill needs each one:
  Core            → platform, Node.js version, git
  rn-app-driver   → axe on PATH, a reachable iOS simulator
                    (skipped with a reason on non-macOS)
  ci-cd-pipeline  → fastlane, CocoaPods, ANDROID_HOME/adb
  rn-library-research → npm registry + GitHub API actually reachable
        │
        ▼
Report: ✅ present / ❌ missing (+ install hint) / ⚪ skipped (+ why) —
grouped so a gap reads as "X won't work until Y is installed," not as a
bare tool-by-tool dump
        │
        ▼
Suggest `npx react-native doctor` too, from inside an actual project,
for the project-specific layer this script doesn't duplicate
```

## What it deliberately doesn't do

Doesn't install anything it finds missing — hands over the install hint
and lets the user run it themselves, since these are consequential tools
(signing, store upload) that shouldn't be installed on someone's behalf.
Doesn't re-check what `npx react-native doctor` already covers well
(Watchman, JDK, project-specific Xcode/Gradle versions) — this script
stays scoped to what's specific to this harness.

## When to reach for it

- Once, right after installing the plugin, before trusting
  `rn-app-driver` or `ci-cd-pipeline`'s real-deploy parts.
- Any time one of those skills fails in a way that might be a missing
  tool rather than a code problem — rule that out here first.

## Worked example

**Input:**
> "Just installed the plugin on a fresh Mac — check if everything's
> ready before I try rn-app-driver on PocketSpotter."

**What the skill does:**

1. Runs `node $D/doctor.mjs`.
2. **Core**: platform is macOS, Node 22, git present — all clear.
3. **rn-app-driver**: `axe` isn't on PATH yet — reports this as a
   concrete blocker: "`rn-app-driver` won't work until `axe` is
   installed: `brew install cameroncooke/axe/axe`." The iOS simulator
   check passes (two simulators currently booted).
4. **ci-cd-pipeline**: `fastlane` isn't installed either — same
   treatment, with its own install hint. CocoaPods is present.
   `ANDROID_HOME` isn't set — flagged as a gap, not an error, since not
   every project needs the Android lane yet.
5. **rn-library-research**: both npm registry and GitHub API are
   reachable — no network/proxy issue on this machine.
6. Suggests running `npx react-native doctor` from inside PocketSpotter's
   project root too, since that checks things specific to that project's
   own toolchain.

**Output:**
> Core: all clear. `rn-app-driver` needs `axe` installed first
> (`brew install cameroncooke/axe/axe`) — nothing else blocking it.
> `ci-cd-pipeline`'s Fastlane deploy needs `fastlane` installed; Android
> lane needs `ANDROID_HOME` set whenever that's wanted.
> `rn-library-research` is fully usable right now. Run `npx react-native
> doctor` inside the project for the rest.

**Output:** a concrete, prioritized punch list instead of discovering
each gap one at a time as a skill fails mid-task.
