---
name: "rnmh-doctor"
description: "Use to check whether the local machine actually has everything this harness's real-execution skills depend on — axe (rn-app-driver), fastlane/CocoaPods/Android SDK (ci-cd-pipeline's verified store deploy), and reachability to npm/GitHub (rn-library-research). Run it once after installing the plugin, or any time a skill fails in a way that might be a missing-tool problem rather than a code problem."
---

# rnmh-doctor (environment check for this harness)

A diagnostic, not a setup step — it reports what's present and what's
missing, grouped by which skill in this harness actually needs it, rather
than leaving a gap to surface later as a confusing mid-task failure in
`rn-app-driver` or `ci-cd-pipeline`.

## When to use
- Once, right after installing the plugin, before relying on
  `rn-app-driver` or `ci-cd-pipeline`'s real-deploy parts for the first
  time.
- Any time one of those skills fails in a way that could be an
  environment problem (a tool not found, a network call failing) rather
  than a logic problem — run this first to rule it out before debugging
  further.

## What it checks

Run `node $D/doctor.mjs` (`$D` = this skill's `scripts/` folder, same
convention as `rn-app-driver`). It checks the machine itself, not any
particular project, grouped by which skill depends on each item:

- **Core**: platform, Node.js version, git.
- **rn-app-driver**: `axe` on PATH, a reachable iOS simulator
  (`xcrun`/`simctl`) — both skipped with a clear reason on non-macOS,
  since this skill's real-touch execution is iOS-simulator-only.
- **ci-cd-pipeline**: `fastlane` (global or via `bundle exec`),
  CocoaPods (iOS builds), `ANDROID_HOME`/`adb` (Android builds).
- **rn-library-research**: the npm registry and GitHub API are actually
  reachable from here — a library-research finding is only as good as
  the live check behind it, so a silent network failure there would
  otherwise look like "nothing found" rather than "couldn't check."

It deliberately does **not** re-check what `npx react-native doctor`
already covers well from inside a real project (Watchman, JDK, the exact
Xcode/Gradle versions a specific project needs) — suggest running that
too, from the project root, as a complement rather than a replacement.

## What NOT to do
- Don't try to auto-install anything this reports as missing — hand the
  install hint to the user and let them run it; a dependency this
  consequential (signing tools, store-upload tools) shouldn't be
  installed without the user doing it themselves.
- Don't treat a clean report as a guarantee a specific project's build
  will succeed — it confirms the harness's own tools are present, not
  that a given project's own configuration is correct (that's what
  `npx react-native doctor` and the relevant skill's own checks are for).
- Don't skip a check and call it "not applicable" without a concrete
  reason (platform mismatch) — an unexplained skip is indistinguishable
  from a bug in the check itself.

## Process
1. Run `node $D/doctor.mjs`.
2. Read the report back grouped by skill, not as a raw tool dump — e.g.
   "axe is missing, so `rn-app-driver` won't work until it's installed:
   `brew install cameroncooke/axe/axe`," not just "axe: not found."
3. If inside an actual RN project, also suggest `npx react-native doctor`
   for the project-specific layer this script doesn't cover.
4. Don't install anything on the user's behalf — report and hand over the
   install hints.
