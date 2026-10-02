---
name: "test-fixtures"
description: "Use when a bare React Native + TypeScript app needs named, disposable test states (fixtures) for on-device checks — analyzes where the app's state lives (client stores, local storage, server-state cache, session), proposes a fixture set for the user to approve, then generates a dev-only fixtures module that writes only through the app's own APIs and registers the runtime hook rn-app-driver loads by name. Also use to update fixtures after the app's data shape changes. Server data is never touched: fixtures seed the app's server-state cache and switch its network layer offline."
---

# Test fixtures (bare React Native + TypeScript)

A fixture is a named, known starting state — `empty`, `two-exercises`,
`workout-in-progress` — that a test loads before its first tap. Loading the
same fixture always gives the same state, so whatever a test saves or
deletes is thrown away by the next load. That is what makes on-device
checks repeatable and data-changing taps safe to replay.

This skill builds those fixtures for any project. `rn-app-driver` loads
them (`fixture.mjs load <name>`, `save-case --fixture <name>`).

## When to use
- `rn-app-driver` reports that the app has no fixtures hook.
- `feature-pipeline`'s checkpoint proposes fixtures because on-device
  verification is planned and the project has none.
- The app's data shape changed and existing fixtures fail to load or no
  longer match the screens (re-run this skill; it diffs, it doesn't
  start over).

## Hard rules
- **Dev-only.** The module is loaded behind `if (__DEV__)` and must never
  reach a release bundle.
- **Write only through the app's own API** — store actions/setters,
  repository/service functions, the server-state library's own cache API.
  Never write raw storage keys, never reach into a library's private
  internals. If the app has no way to write some piece of state, say so and
  ask rather than inventing one.
- **No external effects.** Fixtures never call the real backend. Server
  data is seeded into the app's server-state cache, and the network layer
  is switched offline through the library's own mechanism, so queries
  don't refetch and mutations are paused instead of sent. See
  `references/runtime-contract.md` for per-library recipes. A fixture that
  can't be built without the network is reported, not faked.
- **Deterministic.** Every fixture starts from a full reset of everything
  it covers, then sets exactly what it describes. No `Date.now()`, no random
  ids without a fixed seed — use fixed values the screens can be checked
  against.
- **The user approves the list before anything is written.**

## Process

### 1. Inventory the state
Run the scan from the project root:

```bash
node <this-skill>/scripts/scan-state.mjs
```

It reports the state-related libraries in `package.json` and where stores,
storage instances, server-state queries/mutations and session/auth handling
are defined. It's a starting point: read the files it points to and fill in
what it misses. Produce one table, one row per piece of state:

| State | Lives in | Written by (the app's own API) | Local or server |
|---|---|---|---|

Also note how the app decides it's signed in, and which screens read each
piece of state.

Check two things in every project, because they decide what the proposal
has to ask:
- **Reachability.** Can every store, storage wrapper and server-state
  client/cache be imported from outside the component tree? A client
  created inside a component file and never exported (a common
  `const queryClient = new QueryClient()` in `App.tsx`) can't be seeded.
  The smallest fix is exporting that existing instance — no logic change.
  List each such change; it goes into the proposal for approval.
- **Network bypass.** Which calls reach the backend *without* going
  through the server-state library — direct SDK/client calls, `fetch`,
  RPCs, auth calls (sign-in, sign-out, linking accounts)? The library's
  offline switch doesn't stop these. Note which screens/components
  trigger them.

### 2. Propose fixtures
From the screens and flows, propose a small set:
- `empty` — always. The first-launch / no-data state.
- One **typical** state per main flow (enough data that lists, detail
  screens and summaries all have something to show).
- **Edge cases** worth seeing on device: long names, many items (scrolling),
  zero/limit values, an in-progress state (e.g. a started workout).
- **Signed-in variants** only if screens behind auth need checking — a
  local session object plus a seeded profile in the cache, offline.

For each fixture list exactly what it sets, in plain words and values
("2 exercises: Squat 3×5 @ 60 kg, Bench 4×8 @ 40 kg; no logged sets").
Present the list together with what the inventory turned up:
- each **reachability change** needed (e.g. exporting an existing client),
  as an explicit yes/no;
- the **network-bypass** screens — what a tap there really does on the
  server (creates a user, sends an email, links an account) — with three
  ways to handle them:
  (a) **confirm each tap** — add their components to `rn-app-driver`'s
  `confirmGroups` (project policy via `init-policy.mjs --write`), so every
  tap there stops for the user's yes/no, and the report marks those
  screens as not isolated;
  (b) **block** — the fixtures module blocks that client's network calls
  while a fixture is active, so nothing can reach the server;
  (c) **full access** — the user allows those screens to talk to the real
  backend without asking each time. Recommend it only against a
  dev/staging backend, never production, and ask which backend the app
  points at before accepting it.
  Default to (a). (b) and (c) only on the user's explicit choice; record
  the choice in the report, and for (c) list in every report what was
  actually sent to the server during the session.

Wait for the user to approve, edit, or cut the list and to answer those
questions before writing anything.

### 3. Generate
- **Location:** follow the project's conventions (`CLAUDE.md`,
  `docs/conventions.md`, existing folder style). If nothing says where
  dev-only tooling goes, ask once.
- **Module shape:** implement the runtime contract from
  `references/runtime-contract.md` exactly — `globalThis.__rnmhFixtures`
  with `version`, `list()` and `load(name)`.
- **Registration:** one guarded import in the app's entry point, e.g.
  `if (__DEV__) { require('./src/dev/fixtures'); }`. Nothing else in app
  code changes except the reachability changes the user approved in
  step 2.
- **Network bypass:** apply the option chosen in step 2 — (a) write the
  approved groups into the project's driver policy, (b) the network block
  in the fixtures module, or (c) nothing in code, just a note in the
  project's driver policy file (`"networkBypass": "allowed"` plus the
  backend it was approved for) so later sessions know it was a deliberate
  choice and keep reporting what reached the server.
- **Checks:** run the project's own checks (type-check, lint, tests) and
  fix what the new module breaks.

### 4. Verify on device
With the app running in dev mode, for every fixture:

```bash
node <rn-app-driver>/scripts/fixture.mjs load <name>
```

then read the screens that depend on it (`screen.mjs`, navigate as needed)
and confirm the fixture's values actually show. A fixture that loads
without error but shows the wrong thing is a failed fixture. Report per
fixture: loaded ✓/✗, screens checked, what was seen.

### 5. Report
- The state inventory table.
- Fixtures created (name → what it sets → verified on which screens).
- Anything left out and why (no app API to write it, needs network, etc.).
- The exact entry-point change made.

## Updating existing fixtures
Re-run steps 1–2 against the current code and compare with the existing
module: fixtures that no longer type-check or load, state added since, and
state removed. Propose the changes as a diff for approval — don't silently
regenerate a module the user may have edited by hand.

## What this skill doesn't do
- No storage-level writes and no simulator data snapshots — everything goes
  through the app's own API.
- No real backend calls, no test accounts. If the user later wants
  server-side fixtures, that's a separate, explicit decision.
- Doesn't save or run cases — that's `rn-app-driver`.
