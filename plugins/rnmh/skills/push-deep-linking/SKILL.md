---
name: "push-deep-linking"
description: "Use when setting up or reviewing push notifications and deep/universal/app links for a bare React Native + TypeScript app — platform registration differences, token lifecycle, foreground/background/killed-state handling, custom-scheme vs. verified-domain linking, and routing a notification tap or an incoming link to the right screen. For validating deep-link parameters as untrusted input, see `security-review`'s WebViews-and-deep-links section instead — this skill covers wiring it up correctly, not hardening it. For an unattended pass checking routing/handler completeness across a module or PR, see the `push-deep-linking-agent` subagent instead."
---

# Push notifications and deep linking (bare React Native + TypeScript)

## When to use
- Setting up push notifications for the first time: registration,
  permission request, token lifecycle, foreground/background/killed
  handling.
- Setting up deep links, universal links (iOS), or app links (Android):
  scheme/domain configuration and routing incoming links to a screen.
- Wiring a notification tap to actual in-app navigation.
- Debugging a "works when the app is already open but not from a
  killed/background state" symptom — a classic pitfall specific to this
  area.

This skill covers getting push and deep linking wired up correctly. For
whether incoming deep-link/notification parameters are safe to act on,
that's `security-review`'s WebViews-and-deep-links section — the two are
complementary, not overlapping.

## Check what's already there before assuming a setup

- Push library: detect what's installed rather than assuming one —
  `@react-native-firebase/messaging` (FCM, bridges to APNs on iOS) is a
  common bare-RN choice, Notifee is common for local/rich notification
  display, OneSignal is a common all-in-one alternative. Bare RN has no
  access to `expo-notifications`.
- Deep-link mechanism: React Navigation's built-in `linking` config (if
  React Navigation is already in the project) absorbs a lot of routing
  boilerplate — check for it before reaching for a manual `Linking`
  listener setup.
- Whether the project has universal/app links configured at all, or only a
  custom URL scheme (`myapp://`) — these have very different setup and
  trust characteristics (see below), don't assume one implies the other.

## Push notification setup

### Platform registration differences
- **iOS**: needs an explicit runtime permission request; the APNs device
  token and the FCM token are two different things bridged by the FCM
  SDK — when debugging a token issue on iOS, check both, not just one.
- **Android**: notification channels are required from API 26+. A channel
  must exist before a notification posts to it, and importance/sound/
  vibration are tied to the channel, not the individual notification —
  recreating a channel with the same ID does not update its settings once
  created.

### Token lifecycle
- Listen for token refresh, not just the initial token — tokens rotate.
- Send the current token to the backend on first registration and on every
  refresh. On logout, actually invalidate/remove the server-side
  association, not just clear local app state.

### Foreground / background / killed-state handling
- Foreground: a push arriving while the app is open doesn't auto-display
  like a background one does — the app has to explicitly show an in-app
  banner/alert if that's wanted; verify what actually happens today.
- Background/killed: the background message handler has to be registered
  at the app's entry point, outside any component — registering it inside
  a component, or too late in the app's lifecycle, misses messages that
  arrive while the app isn't running.
- Data-only vs. notification+data payloads behave differently, especially
  on Android in the background — confirm which payload shape the backend
  actually sends and that the handling code matches it.

### Permission-prompt timing
- iOS shows its permission dialog once; a decline can only be reversed by
  the user manually going into system settings, not by re-prompting. A
  contextual ask (explain the value first, then prompt) is worth weighing
  against prompting with no context at first launch — this is a product
  decision to surface, not something to decide silently.

## Deep linking setup

### Custom URL scheme vs. Universal/App Links
- **Custom scheme** (`myapp://path`): quick to set up, but not
  exclusive — another app can register the same scheme, and a plain web
  link outside the app can't open it directly (a chooser prompt at best,
  nothing at worst, depending on context).
- **Universal Links (iOS) / App Links (Android)**: open an `https://` link
  directly into the app with no chooser, but require domain-level
  verification — iOS needs an `apple-app-site-association` file served
  over HTTPS from the domain root or `.well-known/` with no redirect;
  Android needs `assetlinks.json` under `.well-known/` plus the app's
  signing-certificate fingerprint declared in the manifest's intent
  filter. Both files must actually be reachable and correctly formatted —
  a broken or unreachable one silently falls back to opening the plain web
  page, which looks like "deep linking doesn't work" but is actually a
  domain-verification failure worth checking first.

### Routing incoming links to the right screen
- Cold start (the app was launched by the link) and already-running (the
  link arrives as a live event) need separate handling — check both the
  initial-URL API and the live `Linking` event listener, not just one. A
  link that only works while the app was already open is the signature of
  handling just one of these.
- If React Navigation's `linking` config is in use, confirm the
  path-to-screen mapping actually covers every intended link, including
  through nested navigators.
- Validate and sanitize any parameter pulled from an incoming link before
  using it (as a route param, in a query, to prefill a form) — deep-link
  input can be crafted by anyone, not just produced by the app's own share
  flow (see `security-review` for the hardening checklist itself).

## Push → deep link integration

- A notification tap should route through the same mapping a plain deep
  link uses, not a duplicated one, so a link and a notification pointing
  at the same destination behave identically.
- Handle the tap from all three app states: foreground, background, and
  killed. Killed-state handling typically needs a separate
  "was the app launched by a notification" check at startup, distinct from
  the live tap listener used for background/foreground.

## What NOT to do

- Don't rely on a custom URL scheme alone for anything that needs to open
  without a chooser prompt from outside the app (email, SMS, web share) —
  that needs Universal/App Links.
- Don't register the background message handler inside a component — it
  must be registered at the app's entry point to reliably catch messages
  while the app isn't running.
- Don't act on deep-link or notification-payload parameters without
  validating them first — treat them as untrusted input.
- Don't assume the iOS APNs token and the FCM token are interchangeable,
  or that one succeeding implies the other did.
- Don't prompt for notification permission with no context at first
  launch if it can be avoided — there's only one native prompt attempt
  before it requires a manual settings change.

## Process

1. Detect what's already set up (push library, deep-link mechanism,
   existing scheme or verified domain) before adding anything.
2. For push: confirm platform-specific registration (Android channels,
   iOS permission + APNs/FCM bridging), token lifecycle (refresh, backend
   sync, logout invalidation), and foreground/background/killed display
   behavior.
3. For deep links: confirm the scheme/domain-verification setup matches
   what the product actually needs, and that both cold-start and live-
   event routing are handled.
4. Wire notification-tap handling through the same routing logic as plain
   deep links, across all three app states.
5. Validate and sanitize incoming parameters before acting on them.
6. Report what's configured, what's missing per platform, and anything
   flagged as a product decision (chooser-prompt tolerance,
   permission-prompt timing) rather than a technical gap.
