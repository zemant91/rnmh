# test-coverage-agent — how it works

## What it does

An unattended pass adding tests for untested logic and components in a
bare RN/TypeScript file, module, or PR — same priorities as the
interactive `testing` skill (the Testing Trophy model), but run as a
sweep rather than a back-and-forth. The one rule that overrides
everything else: **a test that can't fail isn't coverage**.

## How it works — the safety protocol

```
1. Boundary — only the file(s)/module/PR diff specified
        │
        ▼
2. Inventory existing tests first — don't duplicate coverage that
   already exists
        │
        ▼
3. Only test where correct behavior is UNAMBIGUOUS from the code,
   its types, and adjacent tests. A genuinely unclear edge case never
   gets a guessed-at passing test — it's reported as a gap instead
        │
        ▼
4. Verify every test TWO ways before it counts as done:
     (a) passes against the current code
     (b) FAILS when the logic it targets is deliberately broken/reverted
   A test passing both with and without the real logic is treated as
   if it doesn't exist — fixed or dropped, never counted
        │
        ▼
5. One commit per file/module tested
        │
        ▼
6. Stop and only RECOMMEND when: the mocking setup needed is itself
   unclear (no existing example to follow), or writing the test would
   require DECIDING correct behavior rather than confirming it
```

## What it actively refuses to do

Never inflates a coverage number with a trivial pass-through test. Never
weakens, skips, or deletes an existing test to make a new one pass. Never
defaults to snapshot tests.

## When to reach for it

- A broader test-coverage sweep than an interactive session.
- `feature-pipeline`'s review pass invokes it automatically, partly to
  catch anything the pipeline's own Test step left a gap in.

## Worked example

**Input (from feature-pipeline's review pass):**
> Check test coverage on the new Favorites feature.

**What the agent does:**

1. **Inventory:** finds a test already exists for the star-toggle
   component's happy path, but nothing for the AsyncStorage
   persistence logic or the empty-Favorites-list state.
2. **Unambiguous check:** the persistence logic's expected behavior is
   clear from its types and usage (store an array of workout IDs, read
   it back) — safe to test directly. The empty-state UI's exact copy
   ("No favorites yet" vs. something else) isn't specified anywhere in
   the code or design notes — **too ambiguous to test directly**, flagged
   as a gap instead of guessed at.
3. **Write + verify (two ways):** writes a unit test for the persistence
   logic — confirms it passes against the current code, then briefly
   comments out the actual storage write to confirm the test **fails**
   as expected, then restores the code. Only now counts it as real
   coverage.
4. **Commit:** one commit, "Add tests: Favorites AsyncStorage persistence
   logic."
5. **Report:**
   - **Applied**: unit test for the favorites-persistence read/write
     logic — verified it fails against a deliberately broken version
     before counting it as coverage.
   - **Recommended, not applied**: the empty-Favorites-list state has no
     test — the exact expected copy/behavior isn't specified anywhere in
     the code, so writing an assertion would mean guessing the intended
     behavior rather than confirming it; needs a product decision first.

**Output:** one test that would actually catch a real regression, plus an
honest flag on the one gap that genuinely needed a human call instead of
a guess dressed up as coverage.
