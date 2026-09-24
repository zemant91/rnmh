---
name: "project-bootstrap"
description: "Use when starting a brand-new bare React Native + TypeScript project, or re-basing an existing one's folder structure. Fixes only TypeScript strict mode and a chosen folder-organization style as a baseline; everything else (navigation, state, data layer, lint config, package manager) is asked per-project rather than assumed."
---

# Project bootstrap (bare React Native + TypeScript)

## When to use
- Starting a new app in the MVP pipeline (a new pet project, a new client
  project) from scratch.
- Re-basing an existing project's folder layout to the chosen organization
  style without touching its other decisions.

## Fixed baseline — the only two things this skill assumes

1. **TypeScript strict mode is always on.** `"strict": true` in
   `tsconfig.json`, no exceptions, no "turn it on later." If the project
   somehow needs a specific strict sub-flag relaxed, that's a deliberate,
   explicit, one-line decision to surface and confirm — never a silent
   default.
2. **Folder organization style — asked once, then applied consistently.**
   Exactly one question, asked at the start of every new project (there is
   no default to fall back on):
   - **By feature** — each feature/screen owns a folder holding its
     component(s), local hooks, and styles together.
   - **By type** — top-level folders by kind (`screens/`, `components/`,
     `hooks/`, `services/`, …), with features spread across them.
   Once answered for a given project, every subsequent file this skill (or
   any other work in that project) creates follows that answer — don't
   re-ask per file or silently drift to the other style partway through.

Nothing else is fixed. Bare React Native (no Expo) is the constant across
this user's projects, but library and tooling choices beyond that are not
assumed by this skill even though they recur often — ask each time per the
list below, since a past choice for one project is not automatically the
choice for the next one.

## Everything else — ask, don't assume

Before scaffolding anything beyond the two fixed items above, ask (as one
batched set of questions, not one at a time):
- Package manager: npm / yarn / pnpm / bun.
- Navigation library, if any is wanted at scaffold time (e.g. React
  Navigation) — or skip and add later.
- State management approach, if any is wanted now, and which one.
- Data-fetching/caching approach, if any is wanted now.
- Lint/format baseline to start from (a specific community config, or a
  minimal custom one) — don't silently pick one.
- Testing setup — whether to wire up a bare test runner now (the harness's
  own `testing` skill covers writing tests once code exists, but doesn't
  itself install one), or skip test scaffolding for now.
- Whether to drop in a project-level pointer to this harness (e.g. a short
  `CLAUDE.md` noting which harness skills/agents apply here) so Claude Code
  in this new repo picks up `design-to-code`, `architecture-reviewer`,
  `refactoring`, etc. automatically.

Anything left unanswered is left out of the scaffold rather than defaulted
— report it as "not set up" rather than guessing.

## Check the conventions log first

Before asking the "everything else" list, read `docs/conventions.md` at
the root of the `rn-mobile-harness` repo this plugin was installed from
(two levels up from this skill's own folder: `plugins/rnmh/skills/...` ->
repo root -> `docs/conventions.md`). It's a running log of naming/structure
decisions already made across the user's projects. For anything it already
covers, apply it directly instead of asking again — only ask about what
the log doesn't yet address. If the log resolves something that would
otherwise be part of the "everything else" batch, say so explicitly
("using X per the conventions log") rather than silently complying, so the
user can see it's not being newly decided here.

This skill only reads the log, it doesn't write to it — new cross-project
decisions get recorded by `cross-project-consistency` (or directly in
conversation) once the user actually makes a call, not invented here.

## Process

1. State the two fixed pieces up front (strict TS is on; ask the folder
   style question) before anything else.
2. Check `docs/conventions.md` for anything already decided that applies
   here.
3. Ask the remainder of the "everything else" list — whatever the
   conventions log didn't already resolve — as one batch. Wait for answers
   before generating files — don't scaffold speculatively and revise
   after.
4. Restate the resulting setup as a short plan before creating anything —
   package manager, navigation/state/data choices (from answers or the
   conventions log), lint baseline, folder style — and wait for a
   go-ahead. This is a conversational checkpoint, not a saved document: it
   catches a misread answer before files exist, not a formal sign-off
   step. Skip the wait only if the user's own message already confirmed
   everything needed (e.g. they gave every answer and said "go").
5. Scaffold:
   - Initialize bare RN + TypeScript (community CLI, no Expo).
   - Set `strict: true` in `tsconfig.json`.
   - Create the folder skeleton matching the chosen organization style —
     empty/minimal, not pre-populated with example screens the user didn't
     ask for.
   - Install and wire up only what was explicitly answered for or resolved
     by the conventions log (e.g. don't install a navigation library "just
     in case" if the user said skip).
6. Report clearly, in three lists: what was set up, what came from the
   conventions log rather than being asked fresh, and what was
   deliberately left for the user to add later (anything skipped in step
   3) — so nothing silently looks "decided" that wasn't.

## Notes
- Never install Expo-only packages or suggest Expo-specific APIs.
- If the user points at an existing project of theirs to match instead of
  answering from scratch, diff this project's setup against that one and
  confirm the differences explicitly rather than copying it silently.
