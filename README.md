# rn-mobile-harness

Personal AI harness for React Native development — a growing collection of
Claude Code skills and subagents tailored to bare React Native + TypeScript
work. Built for personal use first; parts of it may later become a shared
product for other RN developers.

## Layout

```
skills/                 Reusable, manually-invoked skills (Skill tool / slash commands)
  design-to-code/         Turn a design reference (Dribbble/Mobbin link, screenshot,
                          Figma frame) into a bare RN implementation plan + anti-slop
                          do/don't rules.
  refactoring/            Interactive refactoring using the named-technique catalog
                          from Fowler's Refactoring (2nd ed.).
    references/             Shared catalog (7 chapters + code smells -> technique
                          mapping) used by both the skill and the refactoring agent.
  project-bootstrap/      Scaffold a new bare RN + TS project — fixes only TS strict
                          mode + a chosen folder-organization style; everything else
                          is asked per-project, checking docs/conventions.md first.
  rn-diagnostics/         Classify an RN bug (native crash / JS crash / perf /
                          bundler-Metro / native build-linking, + dev-vs-release and
                          platform-only modifiers) before gathering evidence.
  release-checklist/      Pre-release checklist for App Store/Play Store: versioning,
                          signing, store compliance, rollout/rollback safety net.
  security-review/        Sensitive-data handling on-device and in transit: secret
                          storage, logging, local encryption, transport, WebViews.
  rn-upgrade/             Safe process for upgrading RN version and native
                          dependencies — pre-checks, ordering, verification.
agents/                 Subagent definitions (Agent tool) — specialized roles that
                          run with their own prompt and a fresh, unbiased view of
                          the code (no memory of how it was written).
  architecture-reviewer.md     Reviews RN code for structural/architectural
                          issues across five categories (see the agent file).
  refactoring-agent.md         Unattended refactoring pass over a file/module/PR,
                          same Fowler catalog, with a two-hats/safety protocol.
  cross-project-consistency.md Compares 2+ of the user's RN projects for duplicated
                          components/logic and naming/convention drift; reads and
                          writes docs/conventions.md rather than picking a project
                          as an arbitrary "reference".
scripts/
  sync.sh                 Copies skills/* and agents/* into ~/.claude — run after
                          any change (see below).
docs/
  conventions.md          Running log of naming/structure decisions made along the
                          way across projects — read by project-bootstrap, read and
                          appended to by cross-project-consistency.
```

## How this is wired into Claude Code

This repo is the source of truth. `~/.claude` (where Claude Code looks for
skills/agents) can't be symlinked or granted folder access directly — macOS
treats it as a protected, credential-holding location — so content is
**copied** in instead, via one script:

```bash
chmod +x scripts/sync.sh   # once
./scripts/sync.sh
```

Run it once initially, then again after every edit under `skills/` or
`agents/` in this repo. It only touches the destination paths that match
this repo's own skill folders / agent files — it never removes anything
else already living in `~/.claude/skills` or `~/.claude/agents`.

Because this is a copy, not a link: edit files **here** in the repo (so
changes are tracked in git), then run the sync script — never edit the
copy inside `~/.claude` directly, or the change will be lost/overwritten
on the next sync and won't be in version control.

## Roadmap

Done:
1. `design-to-code` skill — reference analysis -> bare RN UI implementation.
2. `architecture-reviewer` subagent — structural/architecture code review,
   functional categories only, no prescribed patterns.
3. `refactoring` skill + `refactoring-agent` — Fowler catalog-based refactoring,
   interactive and unattended.
4. `scripts/sync.sh` — one-command copy into `~/.claude`.
5. `project-bootstrap` skill — new-project scaffolding on a minimal, asked-not-assumed
   baseline.
6. `cross-project-consistency` agent + `docs/conventions.md` — cross-project
   duplication/drift detection, with a conventions log instead of an arbitrary
   "reference project."
7. `rn-diagnostics` skill — RN-specific bug classification and evidence-gathering.
8. `release-checklist` skill — App Store/Play Store release checklist.
9. `security-review` skill — sensitive-data handling audit.
10. `rn-upgrade` skill — safe RN version / native dependency upgrade process.

Planned next:
11. Testing support — generation + maintenance of tests for components/logic.
12. Eventually: package selected pieces as a product for other RN developers.
