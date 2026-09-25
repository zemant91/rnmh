---
name: "feature-flags-remote-config"
description: "Use when introducing feature flags or remote config for a bare React Native + TypeScript app — decoupling deploy from release, gradual rollout, kill switches, or values that need to change without an app-store review cycle. Covers flag lifecycle/staleness, safe defaults, fetch timing and offline/cold-start behavior, and where flags stop being a security boundary. For an unattended pass finding stale/orphaned flags across the codebase, see the `feature-flags-audit-agent` subagent instead."
---

# Feature flags and remote config (bare React Native + TypeScript)

## When to use
- Shipping code behind a flag to decouple deploy from release (dark
  launch, gradual rollout, A/B test, kill switch for a risky feature).
- Needing values that can change without an app-store review cycle
  (thresholds, endpoint URLs, copy, on/off toggles).
- Reviewing an existing flag inventory for staleness — a flag whose
  rollout was fully decided long ago but is still branching in the code.

## Check what's already there before assuming a setup

Detect the existing setup rather than assuming one: a third-party service
(LaunchDarkly, Unleash, Firebase Remote Config), an in-house backend-driven
config endpoint, or a simple static per-environment config object — several
are viable, none is assumed here. Bare RN has no Expo-specific shortcut for
this. Check for an existing flag-key naming convention and whether a
central "catalog" (a typed enum/const file listing every flag) already
exists before introducing a new flag with a new pattern.

## Ask, don't assume — structural decisions

- Where flag values come from, if nothing exists yet — a third-party
  service, an in-house endpoint, or static per-environment config each
  couple every future flag definition to that choice.
- Fetch/refresh strategy: once at app start, periodic polling, or
  push-triggered — this decides how quickly a change reaches users and
  what the app does with no cached value yet.
- Targeting needs right now: a simple global on/off vs. percentage
  rollout vs. per-user/segment targeting — these need meaningfully
  different SDK/backend support. Ask what's actually needed now rather
  than building general targeting infrastructure pre-emptively.
- Naming convention and catalog location for flag keys, if none exists —
  a single typed file the whole codebase can check is the common pattern,
  versus flag-key string literals scattered around with no visible
  inventory.

## Flag lifecycle — the most common real-world failure

A flag has three phases: partial rollout, fully decided (on or off for
good), or reverted. The most common failure in practice is leaving the
flag and its `if (flag) {...} else {...}` branch in the code indefinitely
after the decision is made — every leftover flag doubles the number of
code paths that in theory still need testing, and eventually nobody
remembers which branch is the real one. Every flag added should have a
named removal plan, unless it's a genuinely permanent operational kill
switch (a different, smaller category, and worth calling out as such
explicitly rather than by default). Keep the current state of each flag
visible — a catalog file or the provider's own dashboard — rather than
only discoverable by grepping the code.

## Type safety and default values

- Every flag needs an explicit, safe default for when the remote value
  hasn't loaded yet or the fetch fails (no network, first cold start) —
  decide per flag whether "off"/conservative behavior is the right
  default; don't let an unfetched flag's "not yet loaded" state
  accidentally evaluate as truthy or falsy by accident of how the SDK
  represents it.
- Type the flag value (boolean, enum, a typed config object) rather than
  passing raw untyped JSON through the app — a typo in a remote key or
  value shouldn't silently produce `undefined` deep in a component with
  no type error to catch it.

## Fetch timing and offline/cold-start behavior

- Decide explicitly what the very first launch does before any remote
  fetch resolves: blocking the UI until it resolves adds startup latency
  (weigh against `performance-audit`'s startup-time guidance, and timebox
  it if used) versus rendering with defaults immediately and applying the
  fetched config from the next session onward — the more common approach,
  but it means the very first session on a device can run different
  config than later ones, a real and often-forgotten inconsistency.
- Handle an offline cold start (no cached value, no network) with the same
  safe defaults explicitly, not as an afterthought or a crash path.

## A/B testing vs. a simple flag

If the actual goal is experimentation (measuring a metric difference
between variants), that's heavier than a simple on/off flag — confirm
which is wanted. Experiment assignment (consistent bucketing per user,
tying exposure to an analytics event) is a separate mechanism layered on
top of a flag, not the same thing; if an experiment is wanted, its
exposure event needs to reach whatever analytics pipeline the project
already has so the result is actually measurable.

## Where a flag stops being a security boundary

A remote-config value is external input the same way a deep link is —
validate its shape before using it; a malformed or unexpectedly-typed
value shouldn't crash the app. More importantly: never gate an actual
security control (an auth requirement, an enforcement that genuinely must
hold) behind a flag alone — from the client's point of view a flag is
still a client-controlled value even when server-driven, so anything that
must not be bypassable needs server-side enforcement too, not a hidden
client-side flag.

## What NOT to do

- Don't leave a "temporary" rollout flag in the code indefinitely — every
  flag needs a removal plan or an explicit reason it's a permanent kill
  switch.
- Don't gate a real security control behind a flag alone.
- Don't fetch remote config synchronously with no timeout, blocking first
  render indefinitely if the endpoint is unreachable.
- Don't scatter flag-key string literals across the codebase — centralize
  them so the actual set of flags in use is visible in one place.

## Process

1. Detect the existing flag/remote-config setup (library, catalog, naming
   convention) before adding anything; if none exists, ask the structural
   questions above before building one.
2. For each new flag: name it per the existing convention, give it a
   typed, safe default, and state its removal plan (or that it's a
   permanent kill switch) up front.
3. Decide and implement fetch/refresh and offline/cold-start behavior
   consistent with what's already established (or newly decided) for this
   project.
4. If experimentation rather than a simple flag is wanted, wire the
   exposure event into the project's existing analytics pipeline rather
   than inventing a separate tracking mechanism.
5. Never gate a real security control behind a client-visible flag alone.
6. Report: flags added and their defaults/removal plans, and any existing
   flags noticed that look stale (fully decided long ago but still
   branching in code) as a finding, not a silent fix.
