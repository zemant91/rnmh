# push-deep-linking-agent — how it works

## What it does

An unattended pass checking push-notification and deep-link handling for
completeness — cold-start vs. live-event routing, killed-state
notification-tap handling, a background handler stuck inside a
component. The rule that overrides everything else: this agent **only
wires up a routing function the codebase already has** to a missing entry
point. It never invents new routing logic, never creates a notification
channel or permission flow, and never touches native/hosted config files
(`Info.plist`, `AndroidManifest.xml`, `apple-app-site-association`,
`assetlinks.json`) — a mistake there can break signing or app launch
entirely, and this agent can't verify those are correct.

## How it works — the mechanical set (the only things applied directly)

```
✓ Cold-start gap: a live Linking listener exists and calls an
  identifiable routing function, but nothing checks the INITIAL URL
  at launch → wire the same function to the initial-URL check too
✓ Killed-state gap: a live notification-tap listener exists and calls
  an identifiable routing function, but nothing checks whether the app
  was LAUNCHED BY a notification at startup → wire the same function
  to that check too
✓ A background handler defined INSIDE a component, with NO dependency
  on that component's local state/props/hooks → move it, unchanged,
  to the app's entry file

✗ Any handler that closes over component-local state → moving it would
  change behavior, not just placement — reported instead
✗ A missing routing function entirely → this needs product/platform
  decisions the interactive skill handles
✗ Native/hosted config files → never touched, only reported
✗ Unvalidated deep-link/notification params → flagged toward
  security-review, never fixed here (this agent doesn't add validation)
```

## The symptom this agent is built to catch

Exactly the same one the `push-deep-linking` skill names: "works when the
app is already open, not from a killed/background state." That's almost
always one of the two missing-entry-point cases above — a live listener
exists, but the matching cold-start or killed-state check was never
wired to the same function.

## When to reach for it

- A broader completeness sweep than an interactive session.
- `feature-pipeline`'s review pass invokes it when the checkpoint flagged
  push/deep-link wiring as in scope.

## Worked example

**Input:**
> Check push/deep-link completeness on the new share-workout feature.

**What the agent does:**

1. **Orient:** Greps for `Linking` usage, notification listener
   registrations, the app's entry file, and the React Navigation
   `linking` config.
2. **Cold-start check:** finds a live `Linking.addEventListener('url', ...)`
   listener that calls `routeToWorkout(id)` — but no check of
   `Linking.getInitialURL()` at startup. This is exactly the mechanical
   cold-start gap. **Applies**: wires `getInitialURL()`'s result through
   the same `routeToWorkout` function at app launch.
3. **Killed-state check:** finds the live notification-tap listener also
   calls `routeToWorkout(id)`, but no `getInitialNotification()` check at
   startup. Same mechanical case. **Applies**: wires it through the same
   function.
4. **Handler-placement check:** finds the background message handler is
   already correctly registered at the entry point (not inside a
   component) — nothing to fix here, confirmed clean.
5. **Out-of-scope finding:** notices `routeToWorkout(id)` doesn't validate
   that `id` actually exists or belongs to the current user before
   navigating — this is a validation concern, not a wiring gap. **Not
   applied** — flagged toward `security-review` instead.
6. **Verify + commit:** type-check passes after both wiring fixes; one
   commit: "Wire cold-start and killed-state routing for shared-workout
   deep links, matching the existing live-event handler."
7. **Report:**
   - **Applied**: cold-start URL check and killed-state notification
     check both now route through the existing `routeToWorkout` function
     — previously only the live-event case was handled.
   - **Recommended, not applied**: `routeToWorkout`'s `id` parameter isn't
     validated before navigating — treat as untrusted input; see
     `security-review`.

**Output:** the deep link now works identically whether the app was
killed, backgrounded, or already open — using the exact routing logic
that already existed, just finally reached from every entry point.
