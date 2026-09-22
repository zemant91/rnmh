---
name: "testing"
description: "Use when writing or reviewing tests for a bare React Native + TypeScript component, hook, or piece of logic — deciding what's actually worth testing, testing RN-specific concerns (native module mocks, navigation, async state, animations), and avoiding brittle or low-value tests. For an unattended pass adding tests across a module or PR, see the `test-coverage-agent` subagent instead."
---

# Testing (bare React Native + TypeScript)

## When to use
- Writing tests for code being actively worked on: a component, a hook, a
  piece of business logic.
- Reviewing existing tests and judging whether they're worth keeping (do
  they test behavior, or just implementation detail?).
- Following up on a finding from `architecture-reviewer` or
  `refactoring-agent` that named a gap in test coverage.

This skill is for interactive, in-conversation test writing — one exchange
at a time, with the user able to steer or stop at any point. For an
unattended sweep adding tests to untested logic across a larger area, see
the `test-coverage-agent` subagent instead.

## Check what's already there before writing anything

Detect the project's existing test setup rather than assuming one: look for
a test runner config (Jest is what the bare RN CLI template ships with by
default, but don't assume beyond that), and read existing test files for
their conventions — do they use React Native Testing Library, a custom
render wrapper, a particular mock setup for native modules? Follow the
existing convention rather than introducing a second style. If there is no
test setup at all yet, say so explicitly and ask before picking one — this
skill doesn't default to a specific testing library on the user's behalf.

## What's worth testing

Prioritize by value, not by coverage percentage:
- Pure logic and business rules (validation, calculations, data
  transforms) — highest value, cheapest to test reliably, no RN-specific
  setup needed.
- Custom hooks with real branching behavior (loading/error/success,
  conditional derived state).
- Components with conditional rendering, user interaction handling, or
  logic beyond pure presentation.

Skip, or say so explicitly, for:
- Purely presentational components with no logic (props in, JSX out) — a
  test here mostly re-describes the JSX and breaks on every visual change
  without catching real bugs.
- Third-party library internals — test the project's usage of them, not
  their own behavior.

## What NOT to do

- Don't default to snapshot tests as the primary technique — they're cheap
  to write but often just re-encode the current implementation and break on
  any unrelated change, which teaches a team to update snapshots reflexively
  instead of reading failures. Reserve a targeted snapshot for genuinely
  presentation-only output where any change is worth a human's attention.
- Don't test implementation details (internal state, private helper
  functions, exact call counts) when observable behavior — what's rendered,
  what's returned, what side effect fired — is what actually matters.
- Don't over-mock to the point the test no longer exercises the logic being
  tested — a test that mocks away everything a function does isn't testing
  that function.
- A test that cannot fail is not a test. If the failure mode it would catch
  can't be named, don't add it.

## RN-specific testing concerns

- **Native modules** (AsyncStorage, Camera, Permissions, biometrics, etc.):
  mock at the JS interface boundary rather than reimplementing native
  behavior — test that the code calls the module correctly and handles its
  resolved/rejected states, not that the module itself works.
- **Navigation**: wrap the component under test with a minimal test
  navigation container rather than the app's real navigator, and assert on
  navigation calls/params rather than requiring a full navigation tree to
  render.
- **Async state** (loading/error/success): use the test library's async
  utilities (e.g. `waitFor`/`findBy`-style queries) to wait for the real
  state transition, rather than an arbitrary sleep/timeout, which is both
  slow and flaky.
- **Animations** (Reanimated or similar): don't assert on animation timing
  or intermediate frames — assert on the resulting state or the callback
  that fires when the animation completes. Most RN test setups already mock
  the animation driver; confirm that's in place rather than fighting real
  animation timing in tests.
- **Platform-specific branches** (`Platform.OS` checks, `.ios.`/`.android.`
  files): test both platform branches explicitly rather than only the one
  the developer happens to be running on.

## Process

1. Confirm the test setup already in the project (framework, existing
   conventions) rather than assuming.
2. Decide what's actually worth testing in what's in scope, using the
   prioritization above — say plainly if nothing here clears the bar,
   rather than writing a filler test.
3. For each thing worth testing, cover the meaningful branches (success,
   error, edge/empty case), not just the happy path.
4. Write against observable behavior, following the project's existing test
   conventions.
5. Run the tests to confirm they pass. Where feasible, briefly confirm a
   test actually fails against the logic reverted or broken — a test that
   can't fail proves nothing.
6. Report what was tested, and name anything intentionally left untested
   and why (trivial, third-party internals, ambiguous intended behavior
   worth a separate discussion) — don't leave gaps unspoken.
