# rn-app-driver — how it works

## What it does

Lets Claude operate a running React Native app on the iOS simulator the
way a real user would — reading the screen, tapping real elements,
checking the result — instead of guessing from code alone. It reads the
screen as a compact tree of the app's actual React components (via
Hermes, a few milliseconds), and acts with real touch events (via AXe)
aimed at each element's real on-screen frame, so it never taps blind
coordinates.

This is what `feature-implementation`'s completion check, `feature-pipeline`'s
on-device verification step, and `rn-diagnostics`' bug-repro step actually
call to verify something on a real running app, rather than only
re-reading the code.

## How it works — the loop

```
look  → node screen.mjs         (prints the visible screen as a tree)
act   → node act.mjs press ...  (one real touch, waits for the UI to settle,
                                  prints the new screen automatically)
check → compare the printed screen against what was expected
        before deciding the next action
```

One action per command — nothing is chained blind across several taps on
screens not yet seen. A tree line looks like:

```
@HomeActions/log-attack Pressable "Log attack" icon:Plus [24,561,354,84]
```

`@id` is what you act on, the quoted text/icon is the label, `[x,y,w,h]`
is its real frame.

## The safety rule that matters

Before any action that looks like it changes app data (labels/icons/groups
matching "save," "delete," "edit," "log," "end," etc.), the underlying
script refuses and prints `may change app data... re-run with --confirm`.
That's a deliberate stop — the user has to explicitly agree to that
specific action before it's re-run with `--confirm`. (`feature-full-auto`
is the one deliberate exception that bypasses this automatically, and
logs every such action for the same reason it exists — to see what
bypassing it produces.)

## Saved, replayable cases

A one-off exploration is logged under `.rnmh/app-driver/runs/<id>/` and
forgotten. A flow worth checking again after future changes gets saved:

```
save-case.mjs <name>              → records the steps + expected routes
run-case.mjs  <name>               → replays them, stops at the first
                                     mismatch, exits 0 pass / 1 fail
```

A case can also declare **setup** — `--setup-run <id>` (replay another
run's actions first) or `--deep-link <url>` — so it doesn't have to
assume the app is already in the right starting state.

## When to reach for it

- Reproducing a bug step by step.
- Verifying a feature/fix actually works on a real screen, not just in
  the code.
- Exploring an unfamiliar flow before changing it.

Only works with a dev build in the iOS simulator (Metro reachable, `axe`
installed) — not release builds, not Android yet.

## Worked example

**Input:**
> "I just added the Favorites tab — check that starring a workout on Home
> actually shows it there."

**What the skill does:**

1. **Look:** `screen.mjs` prints the Home screen tree, showing
   `@WorkoutCard/1` with a star icon at `[24,120,354,80]`.
2. **Act:** `act.mjs press WorkoutCard/1-star` — a real tap on the star.
   The script waits for the UI to settle and reprints the screen: the
   star icon now shows filled.
3. **Check:** confirms the visual state changed as expected before moving
   on — doesn't assume it worked just because the tap didn't error.
4. **Act:** `act.mjs press TabBar/favorites` — taps the Favorites tab.
   Screen reprints, showing the starred workout now listed there.
5. **Check:** confirms the workout actually appears — this is the real
   verification `feature-implementation`'s completion checklist asked for.
6. Since this flow is worth checking again after future changes (not a
   one-off bug repro), offers: "Save this as a regression case? —
   `save-case.mjs favorite-workout-flow`."

**Report:**
> Path: Home → tap star on "Test Squat" → TabBar/favorites → History/1.
> Star toggled filled, workout appeared under Favorites as expected. No
> warnings. Saved as case `favorite-workout-flow`.

**Output:** a verified, on-device confirmation that the feature actually
works — not just that the code compiles — plus a saved case so the same
check can be re-run automatically after the next change.
