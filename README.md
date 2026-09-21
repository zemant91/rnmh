# rn-mobile-harness

Personal AI harness for React Native development — a growing collection of
Claude Code skills and subagents tailored to bare React Native + TypeScript
work. Built for personal use first; parts of it may later become a shared
product for other RN developers.

## Layout

```
skills/               Reusable, manually-invoked skills (Skill tool / slash commands)
  design-to-code/       Turn a design reference (Dribbble/Mobbin link, screenshot,
                        Figma frame) into a bare RN implementation plan + anti-slop
                        do/don't rules.
  refactoring/          Interactive refactoring using the named-technique catalog
                        from Fowler's Refactoring (2nd ed.).
    references/           Shared catalog (7 chapters + code smells -> technique
                        mapping) used by both the skill and the refactoring agent.
agents/               Subagent definitions (Agent tool) — specialized roles that
                        run with their own prompt and a fresh, unbiased view of
                        the code (no memory of how it was written).
  architecture-reviewer.md   Reviews RN code for structural/architectural
                        issues across five categories (see the agent file).
  refactoring-agent.md       Unattended refactoring pass over a file/module/PR,
                        same Fowler catalog, with a two-hats/safety protocol.
scripts/
  sync.sh               Copies skills/* and agents/* into ~/.claude — run after
                        any change (see below).
docs/                 Working notes, research, decisions about the harness itself.
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

In progress / planned, in order:
4. Sync script (this) — done.
5. Project bootstrap skill — scaffold a new bare RN + TS project on the
   user's own conventions.
6. Cross-project consistency agent — catches duplicated components/logic and
   drifted naming conventions across the user's parallel RN apps.
7. RN diagnostics/debugging skill — reproduce/isolate/diagnose flow specific
   to RN tooling (native crash symbolication, re-render/perf issues, bundle
   issues).
8. Release/build checklist skill — versioning, code signing, store
   compliance, rollback plan.
9. Security review skill — sensitive-data handling (secret/token storage,
   log leakage, certificate pinning, local storage encryption).
10. Dependency/RN upgrade skill — safe process for upgrading RN version and
    native dependencies.
11. Testing support — generation + maintenance of tests for components/logic.
12. Eventually: package selected pieces as a product for other RN developers.
