---
name: "security-review"
description: "Use when reviewing a bare React Native app for sensitive-data handling — secret/token storage, log leakage, transport security, local storage encryption, WebView/deep-link exposure. Not a general code-security audit; specific to how mobile apps leak or mishandle data on-device and in transit."
---

# Security review (bare React Native, sensitive data on-device and in transit)

## When to use
- Reviewing an app that handles anything sensitive — auth tokens, health
  data, financial data, personal information — before it's trusted with
  real user data, or periodically as it grows.
- After adding a new third-party SDK, a WebView, or deep-link handling —
  each of these is a common place sensitive-data handling quietly breaks.

Not a general secure-coding audit (injection, auth-flow logic, backend
security) — this is the layer specific to what an RN app does *on the
device* and *in transit* with sensitive data.

## What to check

### Secret/token storage
- Auth tokens, refresh tokens, and any credential live in Keychain
  (iOS)/Keystore (Android) — via a library that actually uses those (e.g.
  `react-native-keychain`), not in `AsyncStorage`, which is unencrypted
  plain storage on both platforms despite looking like a safe place to put
  things.
- No API keys, secrets, or credentials hardcoded in JS source — they end
  up readable in the bundled JS regardless of Hermes bytecode compilation,
  which is not encryption and doesn't protect string literals meaningfully
  from someone who wants them.
- Refresh-token lifecycle is deliberate: expiry, rotation, and what
  happens on logout (tokens actually cleared from secure storage, not just
  app state).

### Logging
- No tokens, passwords, full card numbers, or other sensitive fields in
  `console.log`/native logs, especially in a release build — device logs
  are more accessible than source code to anyone with physical/ADB access,
  and are the more likely leak vector in practice.
- Crash reporting/analytics payloads scrubbed of sensitive fields before
  they leave the device — check what a crash reporter actually captures
  by default (some capture recent console output or the last screen's
  state) rather than assuming it's safe because "it's just for crashes."
- Verbose/debug logging is actually disabled in release builds, not just
  intended to be — verify the release build, don't take the dev config's
  word for it.

### Local storage & encryption
- Any local database/cache holding sensitive data at rest is encrypted
  (e.g. SQLCipher for SQLite, MMKV's built-in encryption) rather than
  plain — check this per storage mechanism actually used, since a project
  can have several (AsyncStorage, a SQL/NoSQL DB, a cache library) with
  different defaults.
- Sensitive data isn't duplicated into an unencrypted cache "for
  performance" (an image cache, a search-history cache) without the same
  scrutiny as the primary store.
- Clipboard: sensitive values (OTPs, tokens, card numbers) aren't left on
  the system clipboard longer than necessary, and ideally aren't
  auto-copied at all without explicit user action.

### Transport security
- All network calls use HTTPS; iOS App Transport Security isn't
  blanket-disabled to work around one endpoint (a common shortcut that
  quietly weakens every other request the app makes).
- Certificate pinning in place for high-sensitivity apps (banking,
  health), and — if it is — a defined process for what happens when a
  pinned certificate rotates, so pinning doesn't itself become an outage
  risk.
- Sensitive data isn't passed as a URL query parameter (ends up in logs,
  proxies, browser/webview history) when it could be a request body or
  header instead.

### WebViews and deep links
- Any WebView loading remote content restricts allowed origins/navigation
  rather than allowing arbitrary URLs, and has JS bridge exposure (if any)
  scoped to what's actually needed — an unrestricted JS bridge to a
  WebView that can navigate anywhere is a direct route for injected
  content to reach native functionality.
- Deep link / universal link handlers validate and sanitize incoming data
  before acting on it (navigating, prefilling a form, making a request) —
  treat deep link parameters as untrusted input, since they can be
  constructed by anyone, not just the app's own share flow.

### Screen/session exposure
- Highly sensitive screens (balances, personal health data) are
  blurred/hidden in the OS app switcher snapshot for apps where that
  matters, and screenshots/screen recording are blocked where the
  sensitivity of the content warrants it.
- Session/auto-lock behavior matches the app's sensitivity level (does the
  app require re-auth after backgrounding for N minutes where that's
  warranted, or does a stolen unlocked phone equal a stolen open session
  indefinitely).

### Third-party SDK data exposure
- Cross-check what each included native SDK/dependency actually collects
  or transmits against what the app's privacy disclosures (from the
  `release-checklist` skill's store-compliance section) claim — a
  forgotten analytics or ad SDK collecting more than expected is a common
  gap between "what we said" and "what actually happens."

## What NOT to do

- Don't recommend jailbreak/root detection or advanced anti-tampering by
  default — these have real UX and false-positive costs and are worth it
  only for apps where the threat model actually calls for them (this is a
  judgment call to surface explicitly, not decide silently either way).
- Don't treat Hermes bytecode compilation, ProGuard/R8 obfuscation, or
  code minification as security measures — they raise the effort to
  reverse-engineer, they do not make a hardcoded secret or an unencrypted
  local database safe.

## Process

1. Identify what's actually sensitive in this app (auth tokens always
   count; beyond that it depends on the app — health data, financial
   data, PII) before checking anything, so the review is scoped to real
   risk rather than a generic pass.
2. Work through the categories above against that scope, checking actual
   behavior (read the storage/logging/networking code) rather than
   inferring from library choices alone — a project can have the right
   library installed and still misuse it.
3. Report by category: what's handled correctly, what's a concrete
   finding (with the specific file/mechanism and the specific risk if
   exploited), and what's a judgment call worth flagging but not
   necessarily wrong (e.g. no root detection — is that acceptable for
   this app's threat model?) — keep these three separate, don't collapse
   a deliberate trade-off into the same bucket as an oversight.
