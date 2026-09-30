# analytics-coverage-agent — how it works

## What it does

An unattended pass finding screens and error paths with **no**
analytics/crash-reporting coverage, and wiring them up — but only by
copying the project's own already-established tracking pattern, never by
inventing a new one. That's the one rule that overrides everything else
here: this agent never sets up an SDK, never names a new kind of event,
never decides what's worth tracking as a product matter — that's the
interactive `analytics-crash-reporting` skill's job.

## How it works — the safety protocol

```
1. Boundary — only the file(s)/module/PR diff specified
        │
        ▼
2. CONFIRM an existing convention exists before touching anything —
   find at least one other screen/catch-block already wired, use its
   EXACT call shape as the template. No convention to copy? → report
   the gap, don't guess at one
        │
        ▼
3. Purely additive — adding a tracking call must not alter what the
   surrounding code otherwise does (no rewrapping a catch block's logic)
        │
        ▼
4. Verify with a type-check/build after every change; revert on failure
        │
        ▼
5. One commit per file/module
        │
        ▼
6. Stop and only RECOMMEND when: no existing convention to copy for
   this kind of gap, the event might carry sensitive data (flagged
   toward security-review instead), or a catch block is deliberately
   silent (a comment, or an unmistakably intentional no-op)
```

## What counts as "mechanical" (applied directly) vs. everything else

Applied directly: a screen missing the exact same screen-tracking call
every sibling screen already has; a `catch` block missing the exact same
crash-report call every equivalent catch block elsewhere already makes.
Everything else — new event names, new SDKs, fatal-vs-ignore judgment
calls, anything possibly sensitive, consent/opt-out handling — stays in
the recommendations section.

## When to reach for it

- A broader coverage sweep than an interactive session.
- `feature-pipeline`'s review pass invokes it automatically when the
  checkpoint flagged new analytics events in scope.

## Worked example

**Input (from feature-pipeline's review pass):**
> Check analytics coverage on the new Favorites feature.

**What the agent does:**

1. **Confirm convention:** finds every other screen in the app calls
   `trackScreen(routeName)` inside a `useFocusEffect` — an established,
   repeated pattern.
2. **Check the new screen:** `FavoritesScreen` has no such call — this is
   exactly the mechanical case. Applies the same `trackScreen('Favorites')`
   call, matching the route name convention sibling screens use, not an
   invented label.
3. **Check the catch block:** the Favorites AsyncStorage read has a
   try/catch that only does `console.warn(error)` — checks whether
   equivalent catches elsewhere call the crash reporter. They do
   (`Sentry.captureException(error)`). Applies the same call, passing the
   actual caught error — purely additive, doesn't touch the existing
   `console.warn` or change control flow.
4. **New event check:** notices the star-toggle action itself
   (`workout_favorited`) isn't tracked at all — but there's no existing
   "toggle" event of this shape anywhere else in the app to copy from.
   **Stops and recommends** rather than inventing a new event name and
   call shape — that's a product decision for the interactive skill.
5. **Verify + commit:** type-check passes after both additive changes;
   one commit: "Add analytics: Favorites screen view + storage-error
   reporting."
6. **Report:**
   - **Applied**: `trackScreen('Favorites')` on mount (matches every
     sibling screen's convention); `Sentry.captureException` in the
     storage-error catch (matches existing catch-block convention).
   - **Recommended, not applied**: the `workout_favorited`/`unfavorited`
     action itself isn't tracked — no existing "toggle" event shape in
     the codebase to copy, so naming and structuring it is a product
     decision for `analytics-crash-reporting` to make interactively.

**Output:** two screens' worth of gaps closed using exactly the patterns
already in place, and one genuinely new decision correctly left alone
instead of guessed at.
