---
name: "performance-audit"
description: "Use for a proactive review of a bare React Native + TypeScript app's performance — bundle size, startup time, re-render/render-cost hot paths, list virtualization, image and memory handling — as a periodic or pre-release audit, not for diagnosing an active complaint (for that, use `rn-diagnostics`'s Performance bucket first to find the root cause). For an unattended pass applying safe, well-defined fixes across a module or PR, see the `performance-audit-agent` subagent instead."
---

# Performance audit (bare React Native + TypeScript)

## When to use
- A periodic or pre-release audit of the app's performance profile, with no
  single active complaint driving it.
- Reviewing a PR for a performance regression before merge.
- After `rn-diagnostics` has confirmed a root cause in its Performance
  bucket and named a category of problem — this skill supplies the fix
  technique and the surrounding checklist for that category.

If there's an active, specific complaint (jank, dropped frames, slow
interaction) and the cause isn't known yet, start with `rn-diagnostics`
(its Performance bucket) to find the root cause first — this skill is for
the audit/technique-catalog side, not root-cause diagnosis from a live
symptom.

## The core discipline: measure before and after, don't guess

Every finding here should point at something concrete and checkable — a
bundle-size number, a profiler trace showing what re-rendered and why, an
actual frame drop — not "this looks like it could be slow." An
optimization applied without measurement can make things worse:
unnecessary `useMemo`/`useCallback`/`React.memo` add their own
comparison/memory cost and can obscure a component's logic for no measured
benefit. State what tool or measurement supports each finding, or name
that assumption explicitly if the project doesn't have the relevant
tooling set up yet.

## Check what's already there before assuming a setup

Detect rather than assume: which JS engine (Hermes is the default in
current bare RN and starts up faster than JSC — check it's actually in
use, not disabled), whether the New Architecture (Fabric + TurboModules)
is enabled (this changes which bridge-traffic advice even applies — the
JSON-serialized bridge that old-architecture advice targets doesn't exist
the same way under Fabric), whether a bundle analyzer is already wired up
(e.g. `react-native-bundle-visualizer`, `source-map-explorer`), and which
list-rendering library is in use (`FlatList`/`SectionList` vs.
`FlashList`). Don't recommend switching any of these without confirming
what's already decided and why.

## Audit categories

### Bundle size
- Run whatever bundle-analysis tooling the project already has; if none
  exists, name that as a gap and suggest adding one rather than estimating
  size by eye.
- Duplicate versions of the same dependency (partial upgrades, monorepo
  hoisting) inflate the bundle without adding anything — flag these by
  name.
- A heavy dependency pulled in for a small slice of its functionality
  (e.g. a large date/utility library imported wholesale) is worth naming
  as a candidate for a lighter alternative or a scoped import — but
  confirm the replacement covers the actual usage before proposing it,
  don't assume feature parity.

### Startup time (time-to-interactive)
- Confirm Hermes is enabled (bytecode precompilation, faster startup than
  JSC) unless there's a stated reason it's off.
- Heavy synchronous work on the startup path (large synchronous JSON
  parsing, eager initialization of every native module/service before the
  first screen) is a common hidden cost — check what's actually gating
  the first render, not just what "runs at startup" by convention.
- Confirm images/fonts needed for the first screen aren't blocking on a
  network fetch that could be deferred or prefetched earlier.

### Render performance
- Follow `rn-diagnostics`'s Performance-bucket root-cause checklist
  (unstable references reaching memoized children, heavy computation in
  render, animations not on the native/UI thread) for the underlying
  causes — this skill's job is confirming which of those actually shows up
  in a profiler trace for this app, and applying the fix once confirmed,
  not re-deriving the cause list.
- Don't recommend `React.memo`/`useMemo`/`useCallback` as a blanket
  default — apply it where a profiler trace shows an actual re-render this
  would prevent, and name that trace as the justification.
- Large or widely-consumed React Context providers cause every consumer to
  re-render on any value change — check whether a context in heavy use is
  doing more work than its consumers need, and whether splitting it would
  actually reduce re-renders for the specific case at hand.

### Lists
- Missing or unstable `keyExtractor` (array index on a list that reorders,
  filters, or inserts) — check first, it's a common, unambiguous, low-risk
  fix.
- `getItemLayout` is a real win only when row height is genuinely
  fixed/uniform; don't add it for variable-height rows — that produces
  wrong scroll behavior, not a performance gain.
- `windowSize`/`maxToRenderPerBatch`/`removeClippedSubviews` tuning
  depends on actual data volume and device targets — treat as something
  to try and measure, not a fixed number to apply everywhere.
- `FlashList` as a drop-in `FlatList` alternative is worth naming as an
  option for a list already confirmed to be a bottleneck — not as an
  automatic swap.

### Images and memory
- Images sized or served larger than their rendered dimensions cost decode
  time and memory for no visual benefit — check actual rendered size
  against asset size.
- Confirm a caching strategy exists for remote images (built-in `Image`
  caching behavior varies by platform and RN version; a library such as
  `react-native-fast-image` is a common addition, not assumed here) —
  check for repeated redundant fetches of the same image.
- Uncancelled subscriptions, timers, or event listeners left running after
  a component unmounts are a memory-leak pattern worth checking for
  explicitly (a `useEffect` with no cleanup for anything that returns one).

## What NOT to do
- Don't apply a memoization/optimization technique without a measurement
  (profiler trace, bundle-size number, frame timing) backing it — the
  "just in case" version has its own cost and makes the code harder to
  read for no confirmed benefit.
- Don't recommend switching a foundational choice (list library, state
  approach, image library) as a performance fix without confirming the
  current one is actually the bottleneck — a rewrite is a much bigger cost
  than a targeted fix.
- Don't guess at `windowSize`/list-tuning numbers without the data
  volume/device context that would justify a specific value.
- Don't treat a synthetic/dev-mode measurement as representative — profile
  a release-mode build for anything startup- or bundle-related, since dev
  mode has its own, very different, overhead.

## Process
1. Confirm the current setup (engine, architecture, existing tooling)
   rather than assuming one.
2. Work through the audit categories relevant to what's in scope (a whole
   app for a periodic audit, a single PR/diff for a regression review).
3. For each finding, name the concrete evidence behind it (a number, a
   trace, an unambiguous code pattern) — not just a suspicion.
4. Propose the fix per finding, ranked by confirmed impact vs. effort,
   rather than an exhaustive list with no prioritization.
5. Apply the fix only when it's both safe and already measurement-backed;
   otherwise hand it to the user as a recommendation with what would need
   measuring first.
6. Report what was checked, what was found, and what's clean — an audit
   with nothing to report is a valid outcome, don't manufacture findings.
