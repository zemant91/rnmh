---
name: "analytics-crash-reporting"
description: "Use when setting up or reviewing analytics and crash-reporting instrumentation for a bare React Native + TypeScript app — SDK setup, screen/event tracking coverage, JS + native crash paths reaching the same reporter, source-map symbolication, event taxonomy, and user-ID/consent handling. For scrubbing sensitive fields out of what's tracked, see `security-review`; for the CI-side source-map upload/retention step, see `ci-cd-pipeline`; for manually diagnosing one crash already in hand, see `rn-diagnostics`. For an unattended pass finding untracked screens/errors across the codebase, see the `analytics-coverage-agent` subagent instead."
---

# Analytics and crash-reporting instrumentation (bare React Native + TypeScript)

## When to use
- Setting up analytics and/or crash reporting for the first time.
- Adding instrumentation for a new screen, flow, or feature as it's built.
- Reviewing existing instrumentation for gaps (untracked screens/errors) or
  over-collection.

This skill is about getting the always-on production instrumentation
wired up correctly. It's not the same as `rn-diagnostics`, which is for
manually diagnosing one specific crash already in hand — this is what
captures that crash automatically in the first place. It's also not the
same as `security-review`, which covers scrubbing sensitive fields out of
what gets sent — this is the setup/coverage side, that's the hardening
side. And it's not `ci-cd-pipeline`'s source-map upload/retention step —
this is making sure the crash reporter's SDK is actually configured to use
what gets uploaded.

## Check what's already there before assuming a setup

Detect rather than assume: which crash reporter (Sentry, Firebase
Crashlytics, Bugsnag) and analytics tool (Firebase Analytics, Amplitude,
Mixpanel) are already in use — or whether everything routes through an
event router (Segment, RudderStack) to multiple downstream destinations,
which changes where instrumentation code should actually point. Check for
an existing event-naming convention and any shared tracking
wrapper/abstraction before adding a new event or calling an SDK directly.

## Ask, don't assume — structural decisions

- Crash reporter and analytics tool, if none exists yet.
- Whether a shared tracking abstraction wraps the underlying SDK(s) —
  worth it if the destination might ever change or add a second one, since
  the migration cost compounds with the number of direct call sites — vs.
  calling the SDK directly everywhere. Detect/ask, don't assume either way.
- User identification: anonymous ID vs. logged-in user ID, and what
  happens to that ID on logout — it should actually reset/rotate so
  post-logout events aren't attributed to the previous user.
- Consent/opt-out handling: whether tracking is gated on user consent
  (GDPR/ATT-style), and what an opt-out actually disables — some SDKs
  keep collecting anonymous data unless explicitly configured not to.

## Instrumentation coverage

- **Screen views**: tracked automatically (a React Navigation
  state-change listener is the common integration point) or manually per
  screen — pick one approach and apply it consistently; half-automatic,
  half-manual coverage is how gaps happen unnoticed.
- **Key actions/funnels**: name actual business-relevant events, not a
  single undifferentiated `button_tapped` for everything — an event
  taxonomy that can't distinguish one tap from another is close to
  useless for the analysis it's meant to support.
- **Errors and crashes — both paths**: JS-layer errors (a global handler,
  `ErrorBoundary` integration) and native crashes both need to reach the
  same crash reporter — verify both are actually wired, not just one. A
  common gap: an `ErrorBoundary` that catches and displays a fallback UI
  but never reports what it caught.
- **Fatal vs. non-fatal**: decide what's worth reporting as a non-fatal
  event (a caught API failure worth knowing the frequency of) versus
  what's just expected, handled behavior not worth tracking at all —
  reporting every expected error as if it were a crash trains everyone to
  ignore the alerts.

## Source maps and symbolication

Confirm the crash reporter's SDK is actually configured to match uploaded
source maps/dSYMs to this exact build/version. An unsymbolicated stack
trace in production is a common outcome even when the CI upload step
exists (`ci-cd-pipeline`'s concern) — the SDK-side release/version tagging
not matching what was uploaded breaks symbolication silently, with no
obvious error at build time.

## Event schema and taxonomy

- Use a consistent naming convention (e.g. `verb_noun`, not a mix of
  styles) and keep a documented/typed event catalog — the same idea as the
  flag catalog in `feature-flags-remote-config`, so the actual set of
  events in use is visible in one place, not only discoverable by
  grepping SDK calls.
- Version events deliberately: renaming an event or changing its
  parameters breaks historical comparability in dashboards/funnels — when
  changing an existing event, decide explicitly whether to rename it
  (breaking continuity, sometimes the right call) or extend it
  backward-compatibly.

## What NOT to do

- Don't send PII (name, email, exact location, health/financial data) as
  raw event properties — see `security-review` for what counts as
  sensitive here; hash or pseudonymize an identifier if user-level
  analysis genuinely needs one.
- Don't track every interaction with an undifferentiated generic name.
- Don't call the analytics/crash SDK directly from dozens of call sites
  with no shared wrapper if a destination change or addition is plausible
  later.
- Don't let an opted-out user still generate identifiable events — verify
  what the SDK's opt-out call actually disables.
- Don't report every caught error as a crash — that trains the team to
  ignore alerts.

## Process

1. Detect the existing analytics/crash-reporting setup (SDKs, any tracking
   abstraction, event-naming convention) before adding anything; if none
   exists, ask which tool(s) and whether an abstraction layer is wanted.
2. Confirm both JS-layer and native crash paths reach the same reporter,
   and that source-map/dSYM symbolication is actually working for the
   current build, not just configured in CI.
3. For each new event: name it per the existing (or newly agreed)
   convention, confirm it carries no sensitive fields, and add it to the
   event catalog if one exists.
4. Confirm user-ID/consent handling: what resets on logout, what an
   opt-out actually disables.
5. Report what's instrumented, what's missing (an untracked screen/flow,
   a silently-swallowed error path), and anything flagged as a product
   decision (which events matter, fatal vs. ignored-by-design) rather than
   a technical gap.
