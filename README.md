# rn-mobile-harness

Personal AI harness for React Native development — a growing collection of
Claude Code skills and subagents tailored to bare React Native + TypeScript
work. Built for personal use first; parts of it may later become a shared
product for other RN developers.

Everything here lives under `~/.claude/` once synced (see below), so it's
available in **any** project opened with Claude Code — no per-project setup.

## Skills

Skills are triggered automatically when a request matches their
description, or explicitly by name (e.g. "use rn-diagnostics on this
crash"). Explicit is more reliable while a skill is still new/untested.
None of these skills write or change files unless noted.

| Skill | Use when | Produces | Changes files? |
|---|---|---|---|
| `design-to-code` | Given a UI reference (Dribbble/Mobbin link, screenshot, Figma frame) to break down or build from | Grid/palette/typography breakdown, honest critique, anti-slop check, state coverage, move→RN-technology mapping | No (code only if separately asked) |
| `refactoring` | Cleaning up existing code, extracting logic, responding to review feedback | Named-technique refactoring (Fowler catalog) applied in small, confirmed steps | Yes, incrementally, with confirmation at structural steps |
| `project-bootstrap` | Starting a brand-new bare RN + TS project, or re-basing folder structure | A batch of setup questions, then a scaffolded project | Yes — creates the project skeleton |
| `rn-diagnostics` | A crash, perf problem, bundler/Metro failure, native build/linking issue, or release-only/platform-only bug | Symptom classification, bucket-specific evidence gathered, confirmed root cause (or a named gap in evidence) | No (hands structural fixes to `refactoring`) |
| `release-checklist` | Before submitting to the App Store / Play Store, or cutting any production build | Three-way report: confirmed OK / blocker / gap, across versioning, signing, store compliance, rollout safety net | No |
| `security-review` | Reviewing an app handling sensitive data, or after adding a new SDK/WebView/deep link | Category-by-category findings: secret storage, logging, local encryption, transport, WebViews/deep links, screen/session exposure, third-party SDK exposure | No |
| `rn-upgrade` | Upgrading the RN version and/or native dependencies | A concrete upgrade sequence, applied one version/dependency at a time, verified on both platforms and build types | Yes — this is the point of the process |

## Agents

Agents run as a separate subagent process with a fresh context — no memory
of how the code under review was written. Triggered the same two ways as
skills (automatic match, or explicit: "run architecture-reviewer on
src/screens/"). Use these when the value is specifically in an unbiased
second look, not for routine same-context work.

| Agent | Use when | Produces | Changes files? |
|---|---|---|---|
| `architecture-reviewer` | After a feature/PR is functionally done, before merging | Findings across 5 categories: naming/structure consistency, layer-boundary violations, error-handling consistency, RN-specific antipatterns, logic duplication — grouped, most impactful first | No |
| `refactoring-agent` | An unattended refactoring pass over a file/module/PR, broader than an interactive back-and-forth | Two-part report: **Applied** (with verification) and **Recommended, not applied** (with the reason it stopped) | Yes for safe/mechanical techniques (one commit per technique); no for anything structural — reported as a recommendation instead |
| `cross-project-consistency` | Comparing 2+ of the user's parallel RN projects, not reviewing one project alone | Findings across 4 categories: duplicated components/utilities, naming/convention drift, shared-package drift, divergent solutions — evidence-based, never an arbitrary "reference project" | Only `docs/conventions.md`, once the user resolves an open question |

## Shared reference

- `docs/conventions.md` — a running log of naming/structure decisions made
  along the way across projects, so nobody has to remember or re-decide
  them. `project-bootstrap` reads it before asking its own questions;
  `cross-project-consistency` reads it as settled ground truth and appends
  new entries once the user resolves a divergence.
- `skills/refactoring/references/fowler-catalog.md` — the named-technique
  catalog (7 chapters + code smells → technique mapping) shared by
  `refactoring` and `refactoring-agent`.

## Layout

```
skills/
  design-to-code/SKILL.md
  refactoring/SKILL.md
  refactoring/references/fowler-catalog.md
  project-bootstrap/SKILL.md
  rn-diagnostics/SKILL.md
  release-checklist/SKILL.md
  security-review/SKILL.md
  rn-upgrade/SKILL.md
agents/
  architecture-reviewer.md
  refactoring-agent.md
  cross-project-consistency.md
scripts/
  sync.sh
docs/
  conventions.md
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
