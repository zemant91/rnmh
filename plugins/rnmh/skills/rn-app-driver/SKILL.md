---
name: "rn-app-driver"
description: "Use when you need to operate a running React Native app on the iOS simulator — reproduce a bug, walk through or verify a flow, or check a feature you just built. Reads the screen as a compact React component tree, acts with real touches (AXe), and verifies each step."
---

# RN app driver (iOS simulator, dev builds)

Lets you use a running React Native app the way a user would: look at the
screen, act with real touches, check what happened.

The screen is read from the app's React component tree via Hermes (~10 ms,
~1–3k chars). Touches are real HID events on the iOS simulator via AXe,
aimed at element frames taken from that tree. So you never guess
coordinates from a screenshot.

## When to use
- Reproducing a bug report step by step (e.g. as part of `rn-diagnostics`).
- Verifying a feature or fix end to end after implementing it (e.g. the
  completion check in `feature-implementation`).
- Exploring an unfamiliar screen or flow before changing it.

Not for: release builds (no Metro/Hermes debugger), Android (not wired
yet), or pixel-level visual review on its own (use screenshots, see below).

## Prerequisites
- A booted iOS simulator with the app running in **dev mode** (Metro on
  `localhost:8081`).
- `axe` on PATH (`brew install cameroncooke/axe/axe`) and Node 22+.
- Run every command **from the app's project root**. The scripts live in
  this skill's `scripts/` folder. Below, `$D` means that folder's absolute
  path (this skill's base directory + `/scripts`).
- State goes to `.rnmh/app-driver/` in the project (`screen.txt`,
  `actions.log`). If `.rnmh/` isn't in the project's `.gitignore`, mention
  it to the user rather than committing those files.

If a command fails with "Metro not reachable" or "No debuggable target",
ask the user to start Metro / open the app. Don't start builds yourself
unless asked.

## The loop
1. **Look**: `node $D/screen.mjs`
2. **Act**: one `node $D/act.mjs ...` command. It waits for the UI to
   settle and prints the new screen, so you normally don't need to call
   `screen.mjs` again.
3. **Check** the printed screen against what you expected. Only then
   decide the next action.

One action per command, so every step is verified. Never plan several
actions ahead on screens you haven't seen yet.

## Reading the screen

```
screen: Home
@Home/scroll ScrollView [0,62,402,723]
  "Saturday" "September 26"
  HomeActions
    @HomeActions/log-attack Pressable "Log attack" icon:Plus [24,561,354,84]
TabBar
  @TabBar/history Pressable "History" icon:TabHistory [101,796,100,44]
```

- `screen:` is the active route. Only what's visible is shown: the top
  of the native stack and the focused tab.
- `@<id>` is something you can act on. Ids are stable across screens and
  runs. The priority is `testID`, then `<Group>/<label-slug>`, then
  `<Group>/<n>` for list rows whose text changes.
- Bare names (e.g. `HomeActions`) are the app's own components grouping
  their children.
- Quoted strings are visible text. `icon:X` is an icon inside the element
  (the only label an icon-only button has).
- `[x,y,w,h]` is the frame in points.
- `offscreen`: outside its ScrollView's visible area. Scroll before
  touching it.
- `disabled`: the element is disabled.
- `(duplicate name — add testID)`: two elements got the same id. Report
  it as a testability issue.

## Actions

```bash
node $D/act.mjs press <id|"text">            # real tap at element center
node $D/act.mjs press <id> --long            # long press (0.8 s)
node $D/act.mjs scroll <scroll-id> down      # up | down | left | right, inside that list
node $D/act.mjs type <id> "text"             # tap the field, then type (US-keyboard ASCII only)
node $D/act.mjs press <id> --direct          # call onPress from JS, no touch
```

- Target by **id** whenever possible. Quoted text works (exact match,
  then substring). If several elements match, the command errors and
  lists them; retry with an id.
- `--direct` skips real input and hit-testing. Use it only to get quickly
  to a state that isn't under test, and say so in your report. Never
  use it to verify UI behaviour.
- Visual questions (layout, colors, spacing, images, maps, canvas,
  webviews, system alerts, the keyboard) need a screenshot. The tree
  doesn't describe those:

```bash
xcrun simctl io booted screenshot .rnmh/app-driver/shot.png
```

  Screenshots are slow (~450 ms) and costly in context. Use them for
  visual checks, not for navigation.

## Safety rules
- `act.mjs` exits with code 2 and "may change app data" when the label,
  icon name or enclosing group matches the policy (save, delete, trash,
  edit, log, end…). **Stop and ask the user.** Re-run with `--confirm`
  only after they explicitly agree to that specific action. One approval
  covers one action.
- The policy is a label heuristic and can miss things. If an element
  obviously creates, edits or deletes data (form submit, rating picker,
  persisting toggle), ask first even if the command wouldn't refuse.
- Per-project policy: `.rnmh/app-driver-policy.json` in the project root
  (same shape as `scripts/policy.default.json`) replaces the default.
- Don't type real credentials or personal data. Use obvious test values.
- If you created test data anyway, tell the user exactly what, so they
  can remove it.

## When something doesn't work

| Output | Meaning | What to do |
|---|---|---|
| `is offscreen — scroll its list first` | Element outside the visible area | `scroll` the enclosing `@…/scroll` toward it, then retry |
| `WARNING: screen did not change` | Touch landed, nothing reacted | Covered by another view, `pointerEvents`, keyboard, or disabled. Take a screenshot. May be a real bug worth reporting |
| `(still changing)` | Animation, timer or live data | Usually fine. Read the printed screen anyway |
| `nothing matches` | Wrong screen or label | Read the current screen printed with the error |
| `no measured frame` | No native view to measure | Try another element, or `--direct` (report it) |
| `AXe types US-keyboard characters only` | Non-ASCII input | Tell the user; not supported yet |

If the same action fails twice, stop and report instead of retrying
variations.

## Reporting
When done, report:
- the path taken, e.g. `Home → TabBar/history → History/4 → AttackDetail`;
- what you observed at each checkpoint (quote the relevant screen lines);
- warnings: `screen did not change`, `offscreen`, duplicate ids,
  icon-only buttons without an accessibility label;
- anything you used `--direct` or `--confirm` for.

`.rnmh/app-driver/actions.log` is a timestamped log of every action.
Point the user to it for longer sessions.

## Known limitations
- iOS simulator + dev builds only. Android isn't wired yet.
- The "library wrapper vs app component" grouping is a name heuristic.
  Some groups may be missing or extra.
- Screens under transparent modals are hidden even when visible.
- Taps use touch down/up. AXe's default tap style isn't delivered to RN
  `Pressable`s on Xcode 27 / iOS 27.
- `type` is ASCII-only.
- System alerts, permission dialogs and the native keyboard aren't in the
  tree.
