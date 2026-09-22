# Testing Trophy (Kent C. Dodds) — the model behind this skill's priorities

This skill's "what's worth testing" priorities follow the **Testing
Trophy**, a model popularized by Kent C. Dodds (creator of the Testing
Library family, including React Native Testing Library) as an alternative
to the older "testing pyramid." It reshapes where testing effort should
concentrate, and is the closest thing this skill has to a named source —
credited here the same way the `refactoring` skill credits Fowler's
catalog. The descriptions below are original summaries of the model's
ideas, not quotes from any specific article.

## The four layers, bottom to top

1. **Static analysis** — TypeScript, ESLint. Catches a meaningful class of
   bugs (type mismatches, unreachable code, unused variables) before a
   single test runs, for close to zero ongoing cost. This harness already
   gets this layer for free via `project-bootstrap`'s TypeScript
   strict-mode baseline — it isn't something this skill needs to add.
2. **Unit tests** — a single function or hook in isolation, no rendering,
   no I/O. The cheapest and fastest layer above static analysis; best
   suited to pure logic (validation, calculations, data transforms) where
   isolating the function loses nothing about what's being verified.
3. **Integration tests** — the layer this model deliberately weights
   heaviest, and the one most component/hook tests in this skill should
   land on. In RN terms: rendering a component (or a small feature made of
   several components/hooks together) through its real props and children,
   mocking only genuine I/O boundaries (native modules, network) rather
   than internal collaborators. This is what most React Native Testing
   Library tests actually are, even when loosely called "component tests"
   or "unit tests" elsewhere.
4. **End-to-end (E2E) tests** — the full app, on a device/simulator,
   through tools like Detox or Maestro. Highest confidence per test, but
   the slowest and most expensive to write and maintain — kept to a
   handful of critical user flows, not a target for broad coverage. Out of
   scope for this skill and `test-coverage-agent`, which work at the
   unit/integration layers; an E2E suite is a separate, deliberate setup
   decision for the user to make.

## The guiding principle

The model's core idea, in this skill's own words rather than a direct
quote: a test's value comes from how closely it resembles the way the
software is actually used. A test that renders a component the way a user
would see it and interacts with it the way a user would gives far more
confidence than one that reaches into internal state or mocks away
everything the component actually does. This is why the skill favors
integration-style component tests over deeply isolated unit tests for
anything with real behavior, and why it treats heavy internal mocking as a
smell rather than a convenience.

## What this means in practice

- Default a component/hook test to the **integration** layer: render it
  with its real children/props, mock only true external boundaries.
- Reserve **unit** tests for logic that's genuinely standalone (a pure
  function, a validator, a data transform) — isolating these loses nothing
  and keeps the test fast and simple.
- Don't chase E2E coverage from this skill — flag a finding that needs a
  full app flow verified as a candidate for a separate, deliberate E2E
  setup, not something to fake with a heavily mocked integration test.
- Static analysis is assumed already in place (TypeScript strict mode) —
  don't write a test for something a type error would already catch.
