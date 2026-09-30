# project-bootstrap — how it works

## What it does

Scaffolds a brand-new bare React Native + TypeScript project (or
re-bases an existing one's folder layout), while fixing only two things
as a baseline and asking about everything else per-project instead of
assuming a "usual" answer. The idea is that a past project's choice
(e.g. Redux, or a `screens/`+`components/` split) isn't automatically
the right one for the next project — so it's asked fresh every time,
except where `docs/conventions.md` (this harness's running log of
naming/structure decisions) already settled it.

## The only two things it assumes

1. **TypeScript strict mode is always on** — no exceptions, no "relax it
   later."
2. **A folder-organization style, asked once per project** — by feature
   (each screen/feature owns its own folder) or by type (top-level
   `screens/`, `components/`, `hooks/`, …). Whichever gets answered, every
   file created afterward follows it consistently.

Everything else — package manager, navigation, state management,
data-fetching, lint baseline, test scaffolding — is asked, not assumed,
per project.

## How it works — the flow

```
1. State the two fixed pieces up front (strict TS; ask folder style)
2. Check docs/conventions.md for anything already decided
3. Ask the rest of the "everything else" list as ONE batch —
   skip whatever the conventions log already resolved
4. Restate the resulting plan, wait for a go-ahead
5. Scaffold: init bare RN, strict tsconfig, folder skeleton,
   install/wire up only what was explicitly answered
6. Report in three lists: what was set up / what came from the
   conventions log / what was deliberately left for later
```

## When to reach for it

- A brand-new pet project or client project, starting from nothing.
- Re-basing an existing project's folder structure to a chosen style
  without touching its other decisions (state, navigation, etc.).

## Worked example

**Input:**
> "New project — a habit tracker. Bootstrap it."

**What the skill does:**

1. States: "TypeScript strict mode will be on. Folder style — by feature
   or by type?" User answers "by feature."
2. Checks `docs/conventions.md` — say it already has an entry from a
   prior decision: "2026-08-30 — package manager: use pnpm across new
   projects unless stated otherwise." Applies that instead of asking.
3. Asks the remaining batch: navigation library now or later? state
   management? data-fetching approach? lint baseline? test scaffolding
   now? drop in a `CLAUDE.md` pointing at this harness? — all in one
   message, not one question at a time.
4. Say the answers come back: React Navigation now, no state library yet
   (local state is enough for now), skip data-fetching setup, use a
   specific ESLint config, skip test scaffolding for now, yes to the
   `CLAUDE.md` pointer. Restates: "Bootstrapping with pnpm (from the
   conventions log), by-feature folders, React Navigation, no state lib
   yet, no data layer yet, <config> for lint, no test scaffold yet, with
   a CLAUDE.md pointer — go ahead?"
5. On go-ahead: initializes the bare RN project with pnpm, sets
   `strict: true`, creates empty by-feature folder skeletons, installs
   and wires React Navigation and the chosen lint config, writes the
   `CLAUDE.md` pointer — nothing else.
6. **Reports** three lists: *Set up* — RN init, strict TS, folder
   skeleton, React Navigation, lint config, CLAUDE.md pointer. *From the
   conventions log* — pnpm as the package manager. *Left for later* — no
   state management, no data-fetching layer, no test scaffold.

**Output:** a minimal, correctly-structured project with nothing
silently decided — every choice is either explicitly answered, pulled
from a recorded past decision, or explicitly flagged as "not set up yet."
