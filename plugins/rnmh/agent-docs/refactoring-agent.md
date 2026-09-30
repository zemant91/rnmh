# refactoring-agent — how it works

## What it does

An unattended refactoring pass over a bare RN/TypeScript file, module, or
PR — finds code smells from the Fowler catalog, applies the matching
named techniques in small, individually-verified, individually-committed
steps, and reports what changed. Same catalog as the interactive
`refactoring` skill; this is the "run it as a sweep, not a back-and-forth"
mode.

## The one rule that overrides everything else: two hats

Behavior must be **identical** before and after every change this agent
makes. No fixing a bug noticed along the way, no adding missing
functionality — those go in the report as findings, never as edits.

## How it works — the safety protocol

```
1. Boundary — only the file(s)/module the caller specified
        │
        ▼
2. Safety net check — is there an existing test suite for this code?
     YES → run it for a baseline, run it again after EVERY technique,
           revert immediately on failure (never "fix the test" instead)
     NO  → only the smallest, most mechanical techniques allowed
           (Rename, Extract Variable, Remove Dead Code) — anything
           riskier goes to "Recommended," not applied
        │
        ▼
3. ONE technique at a time, ONE commit per technique — named in the
   commit message, so history stays independently reviewable/revertible
        │
        ▼
4. Hard stop before anything structural — inheritance-related
   techniques, Replace Conditional with Polymorphism, any cross-file
   Move — these need explicit permission, always reported instead
```

## How it works — the process

```
Read the Fowler catalog → orient in scope (siblings, callers) →
name each smell by its catalog term → pick the matching technique(s) →
rank by mechanical safety and unblocking order → apply what the safety
protocol allows, recommend the rest
```

## When to reach for it

- A broader refactoring sweep than an interactive session — a whole
  module or PR, not one exchange at a time.
- `feature-pipeline`'s automated review pass invokes it as a real
  subagent call on every run.

## Worked example

**Input (from feature-pipeline's review pass):**
> Refactoring pass on the new `FavoritesScreen.tsx` and its storage logic.

**What the agent does:**

1. **Reads the catalog**, then orients: Globs the file plus its caller
   (the tab navigator) and sibling screens.
2. **Safety net check:** finds no existing tests for `FavoritesScreen` —
   this caps what it's allowed to apply directly to the smallest
   mechanical techniques only.
3. **Identify smells:** names two — a **Long Function** (the component
   does data-loading, transformation, and rendering all inline in one
   50-line function) and **Duplicated Code** (the AsyncStorage
   read/write logic is near-identical to a pattern already extracted as
   a hook elsewhere in the app, `useAsyncStorageState`).
4. **Pick techniques:** Extract Function for the Long Function (purely
   mechanical, no behavior change, safe with no tests) — allowed to
   apply directly. Replacing the inline storage logic with the existing
   `useAsyncStorageState` hook is a cross-file dependency change with no
   test coverage to verify behavior is preserved — **stops and
   recommends** instead of applying it.
5. **Apply:** runs Extract Function, pulling the render logic into its
   own named function within the same file. Since there's no test suite,
   verifies with a type-check only, then commits: "Refactor: Extract
   Function — FavoritesScreen render logic."
6. **Report:**
   - **Applied**: Extract Function on `FavoritesScreen`'s render logic —
     verified by type-check only (no test suite exists for this file).
   - **Recommended, not applied**: replace the inline AsyncStorage
     read/write with the existing `useAsyncStorageState` hook (Duplicated
     Code) — not applied because there's no test coverage to confirm
     behavior stays identical after the swap, and it crosses into
     depending on a shared hook; a human should verify then apply it.

**Output:** one small, safely-verified, individually-committed cleanup —
and one clearly-named, higher-risk recommendation left for a human to
decide on, rather than guessed at.
