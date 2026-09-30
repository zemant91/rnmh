# architecture-reviewer — how it works

## What it does

A read-only structural review of bare RN/TypeScript code: naming/structure
consistency, layer-boundary violations, error-handling consistency,
RN-specific antipatterns (unstable list keys, inline props defeating
memoization), and logic duplication. It's deliberately kept separate from
whoever wrote the code — no memory of *why* a decision was made, no
softening a finding because a plausible justification might exist. It
judges only what the code itself says and shows.

## The ground rule: infer conventions, never impose them

This agent carries no fixed architectural opinion (no preference for
Clean Architecture, MVVM, Redux vs. Zustand). Whatever the project
already does consistently **is** the convention for that project — its
only job is finding where code breaks its *own* established pattern, or
where no pattern was ever established at all. If it can't find enough
repetition to say what "the convention" even is, it says that explicitly
rather than inventing one to enforce.

## How it works — the five categories, every time

```
1. Naming/structure consistency  — do same-kind files (screens, hooks,
                                    API calls) follow the same layout as
                                    their siblings? Same concept named
                                    differently in different places?
2. Layer-boundary violations     — does this file cross a boundary the
                                    REST of the codebase respects?
3. Error-handling consistency    — one dominant pattern in this codebase,
                                    or silent swallowing/inconsistent
                                    handling of the same failure kind?
4. RN-specific antipatterns      — inline props defeating memoization,
                                    unstable list keys, heavy work in
                                    render, JS-thread-blocking gestures
5. Logic duplication             — same RULE reimplemented in 2+ places
                                    (not just coincidental similarity)
```

Orientation comes first (Glob/Grep the real folder layout before reading
any file in detail), so "the convention" is drawn from the actual
codebase, never assumed. Purely stylistic findings with no consistency
argument and no concrete downside are skipped — this is about structure,
not formatting.

## When to reach for it

- After a feature/PR is functionally done, before merging.
- Asked to review architecture/structure specifically, not correctness of
  one bug. `feature-pipeline` invokes it automatically as part of its
  review pass.

## Worked example

**Input (from feature-pipeline's review pass):**
> Review the new tab-bar navigation files in PocketSpotter.

**What the agent does:**

1. **Orient:** Globs the `screens/` and `navigation/` folders, sees every
   existing screen follows `screens/<Name>/index.tsx` +
   `screens/<Name>/styles.ts`, and every navigator config lives under
   `navigation/`.
2. **Category 1 (naming/structure):** the new `FavoritesScreen.tsx` was
   dropped directly under `screens/` with no folder and inline styles —
   **finding**: breaks the sibling convention every other screen follows;
   points at `screens/HomeScreen/index.tsx` as the pattern to match.
3. **Category 2 (layer boundaries):** the rest of the app fetches data
   through a `services/` layer; the new `FavoritesScreen` reads
   `AsyncStorage` directly inline — **finding**: every other screen
   delegates data access, this one doesn't; names the concrete risk
   (storage logic now duplicated if a second screen needs favorites data).
4. **Category 3 (error handling):** the `AsyncStorage.getItem` call has no
   try/catch, while every other storage read in the app wraps failures and
   shows an error state — **finding**, with the specific sibling file that
   establishes the pattern.
5. **Category 4 (RN antipatterns):** the new tab bar icons are passed as
   inline arrow functions to a `React.memo`-wrapped `TabIcon` component —
   **finding**: defeats the memoization, same fix pattern used elsewhere
   in the navigator config.
6. **Category 5 (duplication):** no meaningful duplication found — states
   this plainly rather than omitting the category.

**Output (grouped by category, most impactful first):**
> Layer-boundary violation (high): `FavoritesScreen.tsx` reads
> `AsyncStorage` directly — every other screen goes through `services/`
> (see `HomeScreen`). Risk: favorites logic will duplicate the moment a
> second screen needs it. … RN antipattern: inline icon functions defeat
> `TabIcon`'s memoization … Naming/structure: `FavoritesScreen.tsx` isn't
> folder-structured like its siblings … Logic duplication: none found.
> Overall: the codebase has strong, consistent conventions — these are
> isolated deviations in the new code, not a sign of missing convention.

This report is exactly what `feature-pipeline` folds into its
"Recommended, not applied" list — nothing here gets auto-fixed by this
agent itself; it's read-only.
