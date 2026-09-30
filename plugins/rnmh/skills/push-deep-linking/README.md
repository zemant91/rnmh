# push-deep-linking — how it works

## What it does

Sets up or reviews push notifications and deep/universal/app links for a
bare RN app — platform registration differences, token lifecycle,
foreground/background/killed-state handling, custom-scheme vs.
verified-domain linking, and routing a notification tap or an incoming
link to the right screen. This is the "wire it up correctly" side;
`security-review`'s WebViews-and-deep-links section is the "harden what's
already wired" side — complementary, not overlapping.

## How it works — the flow

```
0. Detect what's already set up — push SDK (Firebase Messaging, Notifee,
   OneSignal), deep-link mechanism (React Navigation's `linking` config
   vs. manual Linking listener), scheme vs. verified domain
        │
        ▼
PUSH SETUP
  Platform registration → iOS explicit permission + APNs/FCM token
                           bridging (two different tokens, check both);
                           Android notification channels (API 26+,
                           must exist before posting, immutable once
                           created)
  Token lifecycle       → listen for REFRESH not just initial token;
                           invalidate server-side on logout
  App-state handling    → foreground (no auto-display — app must show
                           it), background/killed (handler registered
                           at entry point, NEVER inside a component)

DEEP LINK SETUP
  Scheme vs. verified domain → custom scheme is quick but not exclusive
                                and can't open from outside without a
                                chooser; Universal/App Links need a
                                correctly-served, reachable verification
                                file (apple-app-site-association /
                                assetlinks.json) — a broken one silently
                                falls back to the plain web page
  Routing               → BOTH cold-start (launched by the link) AND
                           live-event (already running) — a link that
                           "only works when the app was already open"
                           means only one of these is wired
  Validation            → deep-link params are untrusted input
                           (security-review has the hardening checklist)

PUSH → DEEP LINK
  A notification tap routes through the SAME mapping a plain link uses —
  handled across all three states (foreground/background/killed)
        │
        ▼
Report: what's configured, what's missing per platform, what's a
product decision (permission-prompt timing) vs. a technical gap
```

## The classic symptom this skill is built to catch

"Works when the app is already open but not from a killed/background
state" — almost always means the background message handler was
registered inside a component (which doesn't exist while the app isn't
running) instead of at the app's entry point, or that only the live
`Linking` listener was wired and not the initial-URL check for cold
starts.

## When to reach for it

- Setting up push or deep/universal links for the first time.
- Wiring a notification tap to actual navigation.
- Debugging exactly that "doesn't work from killed state" symptom.

## Worked example

**Input:**
> "Notifications open the right workout screen when the app's already
> open, but tapping one from a fully closed app just opens to Home."

**What the skill does:**

1. **Detect setup:** finds `@react-native-firebase/messaging` for push,
   React Navigation's `linking` config already mapping `workout/:id` to
   the detail screen.
2. **Diagnose against the checklist:** this is exactly the
   "killed-state" symptom named above. Checks where the background
   message handler is registered — finds it inside a `useEffect` in the
   root navigation component. That's the bug: it never runs while the
   app isn't already alive to mount that component.
3. **Push → deep link integration:** confirms there's no separate
   "was the app launched by a notification" check at startup — the app
   only ever checks the live tap listener, which doesn't fire for a
   killed-state launch.
4. **Fix:** moves the background handler registration to the app's entry
   point (`index.js`, before any component renders), and adds the
   startup check for `getInitialNotification()` (FCM's killed-state API),
   routing its payload through the *same* `workout/:id` mapping the live
   listener and the plain deep-link config already use — not a
   duplicated routing path.
5. **Verify all three states:** foreground (shows an in-app banner,
   confirmed still works), background (tap routes correctly, confirmed),
   killed (tap now routes correctly too — the actual fix).
6. **Report:** "Root cause: background handler was registered inside a
   component, so it never ran for a killed-state launch. Moved it to the
   entry point and added the killed-state initial-notification check,
   routed through the existing `workout/:id` mapping. All three app
   states now verified. No change needed to the plain deep-link (non-push)
   handling — that was already correct."

**Output:** a notification tap that now works identically from all three
app states, using one shared routing path instead of two divergent ones.
