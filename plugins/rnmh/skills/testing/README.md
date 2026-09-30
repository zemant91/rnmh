# testing — how it works

## What it does

Writes or reviews tests for a bare RN + TypeScript component, hook, or
piece of logic — interactively, one exchange at a time. The core job is
deciding **what's actually worth testing and at what layer**, using the
Testing Trophy model rather than chasing a coverage percentage, and
avoiding the RN-specific ways tests go brittle (over-mocking native
modules, snapshotting everything, asserting on animation timing).

For an unattended pass adding tests across a whole module/PR without a
back-and-forth, see `test-coverage-agent` instead — same underlying
model, different mode.

## How it works — the flow

```
1. Detect the project's existing test setup (runner, RNTL vs. custom
   wrapper, native-module mock conventions) — follow it, don't
   introduce a second style. No setup at all? Say so and ask.
        │
        ▼
2. Decide what's worth testing, by Testing Trophy layer:
     Unit         → pure logic, no rendering, no I/O
     Integration  → hooks with branching, components with real
                    interaction — mock only genuine I/O boundaries
     E2E          → out of scope here; name it as a Detox/Maestro
                    candidate instead of forcing it into a mock-heavy test
   Skip (and say so): pure presentational components, third-party
   internals, anything the type system already makes unreachable.
        │
        ▼
3. Cover the meaningful branches — success, error, edge/empty —
   not just the happy path
        │
        ▼
4. Write against observable behavior, following existing conventions
        │
        ▼
5. Run it — and where feasible, confirm it actually FAILS against
   broken/reverted logic. A test that can't fail proves nothing.
        │
        ▼
6. Report what was tested and what was deliberately left untested, why
```

## What it actively avoids

- Snapshot tests as the default technique (they re-encode the current
  implementation and get rubber-stamped on failure).
- Testing implementation detail (internal state, private helpers) instead
  of observable behavior.
- Over-mocking to the point the test no longer exercises real logic.
- Sleeping/timeout-based waits for async state instead of the test
  library's own `waitFor`/`findBy` utilities.

## When to reach for it

- Writing tests for code being actively worked on.
- Reviewing whether existing tests are worth keeping.
- Following up on a coverage gap `architecture-reviewer` or
  `refactoring-agent` flagged.

## Worked example

**Input:**
> "Write tests for the new rest-timer duration picker — it reads/writes
> the duration to storage and clamps it between 10s and 300s."

**What the skill does:**

1. **Detect setup:** finds the project already uses Jest + React Native
   Testing Library, with native modules mocked in a shared `jest.setup.ts`
   — follows that convention rather than introducing a different mock
   style.
2. **Decide layer:** the clamping logic (10s–300s) is pure logic → **Unit**
   layer, tested standalone with no rendering. The picker component
   itself has real interaction (tap +/-, reads/writes storage) →
   **Integration** layer, rendered with real props, mocking only the
   storage module (a genuine I/O boundary).
3. **Branches:** for the unit test — value below 10 clamps to 10, above
   300 clamps to 300, a normal in-range value passes through unchanged.
   For the integration test — tapping "+" past 300 doesn't increment
   further, storage write is called with the clamped value, and a
   storage read failure shows the picker's error state (not just the
   happy "loads fine" path).
4. **Writes** against observable behavior: asserts the picker shows
   "300s" and storage was called with `300`, not that some internal
   `_rawValue` variable equals a number.
5. **Runs** the tests — confirms they pass, and specifically re-runs the
   clamp unit test against a deliberately un-clamped version of the logic
   to confirm it actually catches that break.
6. **Reports:** "Added a unit test for the clamp logic (3 cases) and an
   integration test for the picker (increment-at-max, storage write,
   storage-error state). Left untested: the picker's entrance animation —
   presentational only, no logic to verify."

**Output:** tests that would actually fail if the clamping or storage
wiring broke — not tests that just mirror today's implementation.
