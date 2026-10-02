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
- State goes to `.rnmh/app-driver/` in the project: `screen.txt` (latest
  snapshot), `runs/<id>/` (one folder per exploration session — a fresh
  `screen.mjs` call starts a new one — with `actions.log` for reading and
  `actions.jsonl` for `save-case.mjs`), and `cases/<name>.json` for saved
  test cases (see below). If `.rnmh/` isn't in the project's
  `.gitignore`, mention it to the user rather than committing those files.

If a command fails with "Metro not reachable" or "No debuggable target",
ask the user to start Metro / open the app. Don't start builds yourself
unless asked.

## First session in a project: set up the safety policy
Before the first action in a project that has no
`.rnmh/app-driver-policy.json` yet, set it up, so data-changing buttons
are protected from the start instead of after an accidental save:

1. Run `node $D/init-policy.mjs` (dry run, writes nothing). It scans the
   project's source for form/editor components and components whose file
   writes data (submit handlers, mutations, storage/API writes) and lists
   them as candidate groups.
2. Show the list to the user and ask which to protect. Don't pick for
   them: the scan is a heuristic and over-includes on purpose.
3. Write only what they chose: `node $D/init-policy.mjs --write A,B`, or
   `--write none` if they want none. Re-running later adds groups; it
   never removes the ones already there.

Skip this if a project policy already exists. If the user doesn't want
to set it up now, say that buttons like "Done" will only be caught by
the rule below, then carry on.

## Fixtures: start from known, disposable data
If the app registers test fixtures (the `test-fixtures` skill generates
them), start a session that will change data from a fixture instead of
from whatever the app happens to contain:

```bash
node $D/fixture.mjs list                  # what the app offers
node $D/fixture.mjs load two-exercises    # reset data to that state, prints the settled screen
```

Loading resets the app's data through the app's own APIs, with its
server-state layer offline, so nothing reaches a backend and anything a
test saves is thrown away by the next load. Say in the report which
fixture a session started from.

If `fixture.mjs` exits with "no fixtures hook", the app has none. Offer
to generate them with `test-fixtures`; if the user declines, continue and
note that data-changing taps act on the app's real local data.

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
                                              # waits briefly for focus, retries once if the field's
                                              # rendered value doesn't change — see "retried" in the log
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
xcrun simctl io booted screenshot .rnmh/app-driver/runs/$(cat .rnmh/app-driver/runs/.active)/shots/1.png
```

  Screenshots are slow (~450 ms) and costly in context. Use them for
  visual checks, not for navigation.

## Safety rules
- `act.mjs` exits with code 2 and "may change app data" when the label,
  icon name or enclosing group matches the policy (save, delete, trash,
  edit, log, end…). **Stop and ask the user.** Re-run with `--confirm`
  only after they explicitly agree to that specific action. One approval
  covers one action.
- The policy is a label heuristic and can miss things. Generic labels
  like "Done", "OK", "Apply", "Next" or "Continue" are deliberately not
  on the word list, because just as many only close a sheet or keyboard.
  Inside a form, editor or picker, treat them as data-changing and ask
  first, even if the command wouldn't refuse. The same goes for anything
  else that obviously creates, edits or deletes data (rating picker,
  persisting toggle).
- Per-project policy: `.rnmh/app-driver-policy.json` in the project root
  (same shape as `scripts/policy.default.json`) replaces the default.
  `confirmGroups` is what catches generic labels: any element inside a
  listed component needs `--confirm`. Create it with `init-policy.mjs`
  (see "First session in a project"); edit it by hand any time.
- If a button turned out to change data without being caught, suggest
  adding its enclosing group to the project policy, so the gap closes for
  the next run too.
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
| type retried and the field is still empty | Focus never actually landed (a modal, an overlapping view, a disabled field) | Screenshot to check what's actually focused; don't keep retrying the same command |

If the same action fails twice, stop and report instead of retrying
variations.

## Reporting
When done, report:
- the path taken, e.g. `Home → TabBar/history → History/4 → AttackDetail`;
- what you observed at each checkpoint (quote the relevant screen lines);
- warnings: `screen did not change`, `offscreen`, duplicate ids,
  icon-only buttons without an accessibility label;
- anything you used `--direct` or `--confirm` for.

Each session's actions are logged under
`.rnmh/app-driver/runs/<id>/actions.log` (human-readable) and
`actions.jsonl` (structured — what `save-case.mjs` reads). Point the user
to the run folder for longer sessions, rather than a single ever-growing
file.

If the flow you just verified is worth checking again later — not a
one-off bug repro — offer to save it as a regression case:
`node $D/save-case.mjs <name>`. See "Saving and replaying test cases"
below.

## Saving and replaying test cases

A run is exploratory by default — actions.jsonl records it, but nothing
is kept long-term. When a walked flow is worth checking again after
future changes (not a one-off bug repro), turn it into a saved case:

```bash
node $D/save-case.mjs <case-name>              # from the run just finished
node $D/save-case.mjs <case-name> --fixture <name>   # start every replay from that fixture
node $D/save-case.mjs <case-name> --run <id>   # from an older run (see runs/ folder names)
```

This writes `.rnmh/app-driver/cases/<case-name>.json` — the ordered
steps (command, target, any flags) plus the route observed after each
one, so a later run can tell "got somewhere different" apart from "got
nowhere."

A fixture loaded with `fixture.mjs` before the run's first action is
recorded automatically; `--fixture` sets or overrides it. `run-case`
loads it before anything else, and its PASS/FAIL line names it, so a
failure says which state it started from. Prefer a fixture over
`--setup-run` whenever the app has one: it's faster and doesn't depend on
the screens under test.

Replay it with:

```bash
node $D/run-case.mjs <case-name>
```

Each step re-runs through `act.mjs` itself (same safety policy, same
offscreen/duplicate/no-frame checks), so nothing about replay is
special-cased or less safe than doing it live. It stops at the first
step that fails or lands on an unexpected route — a case doesn't
"mostly pass." A case that included a `--confirm`ed step needs
`run-case.mjs <name> --confirm-all` to replay that step; think about
whether that's still safe on the app's current data before doing that,
same as you would live.

Exit code is 0 on a full pass, 1 on any failure — meant to be pluggable
into `ci-cd-pipeline`'s test gate later, not just read by a person.

### State setup, when a case needs to start somewhere specific

Most on-device flakiness comes from a case assuming a starting state that
wasn't actually there — the previous flow left something in a different
place, or app data drifted. Give a case its own setup instead of just
hoping the app happens to be in the right state:

```bash
node $D/save-case.mjs <name> --setup-run <run-id>   # replay another run's actions first
node $D/save-case.mjs <name> --deep-link "myapp://home"  # open a deep link first
# both together: --setup-run <id> --deep-link "myapp://..."
```

`--setup-run` points at an earlier run (walk the app to a known screen,
tap a debug-menu reset button, whatever gets you there) and replays its
actions before the case's own steps, unchecked against expected routes —
getting there is what matters, not the exact path. `--deep-link` opens a
URL via `xcrun simctl openurl` first, for apps that can jump straight into
a state without navigating through the UI. A setup failure aborts the
whole case — nothing after it can be trusted to start from the right
place.

There's deliberately no direct-storage reset option (clearing AsyncStorage
or a database file directly). That would need per-project knowledge of
the storage engine and schema, breaking the "only act through what the
app's own interface exposes" rule everything else in this skill follows.
If a project needs a hard reset, expose it as something tappable (a
debug-menu button, a deep link) and drive that instead.

Cases are project state (like `.rnmh/app-driver-policy.json`), not part
of this skill — they live in the project's `.rnmh/`, travel with it, and
are the user's call whether to commit them.

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
