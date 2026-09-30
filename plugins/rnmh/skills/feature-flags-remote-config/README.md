# feature-flags-remote-config — how it works

## What it does

Sets up or reviews feature flags and remote config for a bare RN app —
decoupling deploy from release, gradual rollout, kill switches, or values
that need to change without an app-store review cycle. Centers on the
part that goes wrong most often in practice: a flag lives forever after
the rollout decision is actually made, silently doubling the code paths
anyone has to reason about.

## How it works — the flow

```
0. Detect the existing setup — third-party service (LaunchDarkly,
   Firebase Remote Config), in-house endpoint, or static config —
   and any existing flag catalog/naming convention
        │
        ▼
1. Structural decisions, if nothing exists yet: where values come from;
   fetch/refresh strategy (start-only, polling, push); targeting needs
   NOW (global on/off vs. percentage vs. segment) — don't pre-build
   general targeting infra nobody asked for yet
        │
        ▼
2. Every new flag gets, up front:
     - a typed, safe default (what happens before the fetch resolves,
       or if it never does)
     - a NAMED REMOVAL PLAN — or an explicit "this is a permanent
       kill switch," never left unstated by default
        │
        ▼
3. Fetch timing — explicit decision on first-launch behavior
   (block briefly vs. render with defaults) AND offline cold start
   (no cache, no network) — not an afterthought
        │
        ▼
4. A/B test wanted, not just a flag? → separate exposure-event
   mechanism, wired into the existing analytics pipeline
        │
        ▼
5. Security check: never gate a REAL security control behind a
   client-visible flag alone — it's still client-controlled even
   when server-driven
        │
        ▼
6. Report: flags added + their defaults/removal plans, plus any
   EXISTING flag noticed that looks stale — flagged, not silently fixed
```

## The failure mode this skill is built around

A flag has three real states: partial rollout, fully decided, or
reverted. The common failure is never revisiting a flag once it's fully
decided — the `if (flag) {...} else {...}` branch just stays. That's why
every new flag gets a removal plan stated at creation time, not as a
cleanup task for later that never happens. (The unattended sweep for
already-stale flags across a codebase is `feature-flags-audit-agent`.)

## When to reach for it

- Shipping something behind a flag (dark launch, gradual rollout, kill
  switch, A/B test).
- Needing a value that can change without an app-store review cycle.
- Reviewing an existing flag inventory for staleness.

## Worked example

**Input:**
> "Put the new AI-coaching feature behind a flag — we want to roll it out
> to 10% of users first."

**What the skill does:**

1. **Detect setup:** finds PocketSpotter already uses Firebase Remote
   Config for one existing flag, with no formal catalog file yet — just
   one string key checked in two places.
2. **Structural decision:** since a catalog doesn't exist, proposes
   adding one now (a typed const file) rather than adding a third
   scattered string literal — asks for a go-ahead rather than assuming.
3. **New flag:** names it `aiCoachingEnabled` per Remote Config's
   existing casing convention, types it as boolean, sets the default to
   `false` (conservative — no coaching UI if the fetch hasn't resolved
   yet). States the removal plan up front: "remove once the 10% rollout
   is either promoted to 100% or reverted — not a permanent switch."
4. **Fetch timing:** since Firebase Remote Config is already fetched once
   at app start elsewhere, follows that pattern rather than introducing a
   second fetch strategy — confirms the offline-cold-start case (no
   cache yet, no network) falls back to the `false` default, not a crash.
5. **Targeting:** confirms Firebase Remote Config's percentage-rollout
   support covers the "10% of users" ask directly — no need for a
   heavier in-house targeting layer.
6. **Security check:** confirms the AI-coaching feature has no security
   implications — this step is a no-op here, but still checked
   explicitly rather than skipped.
7. **Report:** "Added `aiCoachingEnabled` (boolean, default `false`,
   10% Firebase rollout) to a new flag catalog file. Removal plan: revert
   or promote to 100% within the next few releases, then delete the flag
   and its branch. Also noticed the existing `newOnboardingFlow` flag has
   been at 100% for what looks like several releases — flagging it as a
   staleness candidate, not removing it without confirming."

**Output:** a new flag with a stated lifecycle from day one, plus an
honest flag-up of an old one that's likely overdue for cleanup — instead
of silently adding to the pile.
