# analytics-crash-reporting — how it works

## What it does

Sets up or reviews analytics and crash-reporting instrumentation — SDK
setup, screen/event tracking coverage, making sure **both** JS-layer and
native crash paths reach the same reporter, source-map symbolication, a
consistent event taxonomy, and user-ID/consent handling. This is the
"capture it correctly in production" side — distinct from `rn-diagnostics`
(diagnosing one crash already in hand), `security-review` (scrubbing
sensitive fields out of what's sent), and `ci-cd-pipeline` (the CI-side
source-map upload step this skill's SDK config has to actually match).

## How it works — the flow

```
0. Detect the existing setup — crash reporter, analytics tool (or an
   event router like Segment fanning to several destinations), event
   naming convention, existing tracking wrapper — before adding anything
        │
        ▼
1. Structural decisions, asked not assumed: which tool(s) if none exist;
   shared tracking abstraction or direct SDK calls; anonymous vs.
   logged-in user ID and what resets on logout; consent/opt-out gating
        │
        ▼
2. Coverage check:
     Screen views      → one consistent approach (auto via nav listener,
                          OR manual per screen) — never half-and-half
     Key actions       → named, business-relevant events, not one
                          generic "button_tapped" for everything
     Errors & crashes  → BOTH JS-layer (ErrorBoundary/global handler)
                          AND native crashes reaching the SAME reporter
     Fatal vs. non-fatal → decide what's worth reporting at all
        │
        ▼
3. Source maps — confirm the SDK's release/version tag actually matches
   what CI uploaded; a mismatch breaks symbolication silently
        │
        ▼
4. Event schema — consistent naming, a documented event catalog,
   deliberate versioning when an event's shape changes
        │
        ▼
5. Report: what's instrumented, what's missing, what's a product
   decision (which events matter) vs. a technical gap
```

## What it actively guards against

Never sending PII as raw event properties (that's `security-review`'s
scope to catch, but this skill doesn't wire up a call that would need
catching). Never a generic undifferentiated event name for everything.
Never an `ErrorBoundary` that shows a fallback UI but never actually
reports what it caught — a common, easy-to-miss gap.

## When to reach for it

- Setting up analytics/crash reporting for the first time.
- Adding instrumentation for a new feature as it's built.
- Reviewing existing instrumentation for untracked screens/errors or
  over-collection.

## Worked example

**Input:**
> "We just added the Favorites feature — wire up tracking for it."

**What the skill does:**

1. **Detect setup:** finds the project already uses Sentry for crashes
   and Amplitude for analytics, called directly (no shared wrapper), with
   an existing `verb_noun` event-naming convention (`workout_started`,
   `workout_completed`).
2. **Structural check:** no new structural decision needed here — the
   existing direct-SDK-call pattern is followed rather than introducing
   an abstraction layer mid-feature.
3. **Coverage:**
   - **Screen view**: the app already auto-tracks screen views via a
     React Navigation listener — confirms the new Favorites screen is
     automatically covered by that, not silently missed because it needs
     manual wiring.
   - **Key actions**: names `workout_favorited` and `workout_unfavorited`
     as distinct events (not a single generic `favorite_toggled` with a
     boolean param buried in it) — matches the specificity of the
     existing convention.
   - **Errors**: the Favorites storage write can fail (disk full, storage
     corruption) — confirms this reaches Sentry as a **non-fatal** event
     (worth knowing frequency, not a crash), not silently swallowed by a
     try/catch with no report.
4. **Source maps:** unrelated to this feature — confirms existing
   symbolication still works by checking the last production release's
   crash stack was readable, not just assuming CI's upload step means
   it's fine.
5. **Event schema:** adds `workout_favorited`/`workout_unfavorited` to
   the project's event catalog file with their parameters.
6. **Report:** "Added `workout_favorited`/`workout_unfavorited` events
   (screen view auto-covered by the existing listener). Storage-write
   failure now reported as non-fatal to Sentry instead of silently
   swallowed. Event catalog updated. No new structural decision needed —
   followed the existing direct-SDK convention."

**Output:** the new feature has real, specifically-named event coverage
and its error path actually surfaces — not a silent gap sitting there
until someone notices favorites data disappearing with no signal why.
