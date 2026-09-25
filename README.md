# React Native Harness

Personal AI harness for React Native development, packaged as a real
**Claude Code plugin** (`rnmh`) — a growing collection of skills and
subagents tailored to bare React Native + TypeScript work. Built for
personal use first; parts of it may later become a shared product for
other RN developers.

Once installed, everything here is invoked with the `rnmh:` prefix (e.g.
`/rnmh:design-to-code`) in **any** project opened with Claude Code — no
per-project setup.

## Skills

Skills are triggered automatically when a request matches their
description, or explicitly as a slash command: `/rnmh:<skill-name>`.
Explicit is more reliable while a skill is still new/untested. None of
these skills write or change files unless noted.

| Skill | Invoke as | Use when | Produces | Changes files? |
|---|---|---|---|---|
| `design-to-code` | `/rnmh:design-to-code` | Given a UI reference (Dribbble/Mobbin link, screenshot, Figma frame) to break down or build from | Grid/palette/typography breakdown, honest critique, anti-slop check, state coverage, move→RN-technology mapping | No (code only if separately asked) |
| `refactoring` | `/rnmh:refactoring` | Cleaning up existing code, extracting logic, responding to review feedback | Named-technique refactoring (Fowler catalog) applied in small, confirmed steps | Yes, incrementally, with confirmation at structural steps |
| `project-bootstrap` | `/rnmh:project-bootstrap` | Starting a brand-new bare RN + TS project, or re-basing folder structure | A batch of setup questions, then a scaffolded project | Yes — creates the project skeleton |
| `rn-diagnostics` | `/rnmh:rn-diagnostics` | A crash, perf problem, bundler/Metro failure, native build/linking issue, or release-only/platform-only bug | Symptom classification, bucket-specific evidence gathered, confirmed root cause (or a named gap in evidence) | No (hands structural fixes to `refactoring`) |
| `release-checklist` | `/rnmh:release-checklist` | Before submitting to the App Store / Play Store, or cutting any production build | Three-way report: confirmed OK / blocker / gap, across versioning, signing, store compliance, rollout safety net | No |
| `security-review` | `/rnmh:security-review` | Reviewing an app handling sensitive data, or after adding a new SDK/WebView/deep link | Category-by-category findings: secret storage, logging, local encryption, transport, WebViews/deep links, screen/session exposure, third-party SDK exposure | No |
| `rn-upgrade` | `/rnmh:rn-upgrade` | Upgrading the RN version and/or native dependencies | A concrete upgrade sequence, applied one version/dependency at a time, verified on both platforms and build types | Yes — this is the point of the process |
| `testing` | `/rnmh:testing` | Writing or reviewing tests for a component, hook, or piece of logic, interactively | What's worth testing, RN-specific mocking guidance (native modules, navigation, async state, animations), tests written against observable behavior | Yes — adds/edits test files |
| `localization` | `/rnmh:localization` | Setting up i18n, adding a locale, extracting hardcoded strings, handling pluralization/formatting/RTL | Detected-setup-aware key extraction, CLDR-aware pluralization guidance, locale-formatting and RTL notes | Yes — adds/edits locale files and translation-call sites |

## Agents

Agents run as a separate subagent process with a fresh context — no memory
of how the code under review was written. Ask for them by name (e.g. "run
`rnmh:architecture-reviewer` on this PR"). Use these when the value is
specifically in an unbiased second look, not for routine same-context
work.

| Agent | Ask for | Use when | Produces | Changes files? |
|---|---|---|---|---|
| `architecture-reviewer` | `rnmh:architecture-reviewer` | After a feature/PR is functionally done, before merging | Findings across 5 categories: naming/structure consistency, layer-boundary violations, error-handling consistency, RN-specific antipatterns, logic duplication — grouped, most impactful first | No |
| `refactoring-agent` | `rnmh:refactoring-agent` | An unattended refactoring pass over a file/module/PR, broader than an interactive back-and-forth | Two-part report: **Applied** (with verification) and **Recommended, not applied** (with the reason it stopped) | Yes for safe/mechanical techniques (one commit per technique); no for anything structural — reported as a recommendation instead |
| `cross-project-consistency` | `rnmh:cross-project-consistency` | Comparing 2+ of the user's parallel RN projects, not reviewing one project alone | Findings across 4 categories: duplicated components/utilities, naming/convention drift, shared-package drift, divergent solutions — evidence-based, never an arbitrary "reference project" | Only `docs/conventions.md`, once the user resolves an open question |
| `test-coverage-agent` | `rnmh:test-coverage-agent` | An unattended pass adding tests to untested logic across a file/module/PR, broader than an interactive session | Two-part report: **Applied** (each test verified to actually fail on broken logic, not just pass) and **Recommended, not applied** (gaps needing a human decision) | Yes for unambiguous cases (one commit per file/module); no when intended behavior is unclear — reported as a recommendation instead |
| `localization-coverage-agent` | `rnmh:localization-coverage-agent` | An unattended pass finding hardcoded/untranslated strings across a file/module/PR, broader than an interactive session | Two-part report: **Applied** (each extraction verified not to change default-locale rendering) and **Recommended, not applied** (gaps needing a human decision) | Yes for unambiguous cases (one commit per file/module); no when no i18n setup exists yet or key placement is unclear — reported as a recommendation instead |

## Shared reference

- `docs/conventions.md` (repo root, outside the plugin folder) — a running
  log of naming/structure decisions made along the way across projects, so
  nobody has to remember or re-decide them. `project-bootstrap` reads it
  before asking its own questions; `cross-project-consistency` reads it as
  settled ground truth and appends new entries once the user resolves a
  divergence.
- `plugins/rnmh/skills/refactoring/references/fowler-catalog.md` — the
  named-technique catalog (7 chapters + code smells → technique mapping)
  shared by `refactoring` and `refactoring-agent`.
- `plugins/rnmh/skills/testing/SKILL.md` and
  `plugins/rnmh/skills/testing/references/testing-trophy.md` — the Testing
  Trophy model (Kent C. Dodds) behind what's worth testing at which layer,
  plus RN-specific mocking guidance, shared by `testing` and
  `test-coverage-agent`.

## Layout

```
.claude-plugin/
  marketplace.json          Marketplace manifest — lets this repo be added
                             as a local plugin source (see Installation).
plugins/
  rnmh/                      The actual plugin — this is what gets installed.
    .claude-plugin/
      plugin.json            Plugin manifest (name: "rnmh").
    skills/
      design-to-code/SKILL.md
      refactoring/SKILL.md
      refactoring/references/fowler-catalog.md
      project-bootstrap/SKILL.md
      rn-diagnostics/SKILL.md
      release-checklist/SKILL.md
      security-review/SKILL.md
      rn-upgrade/SKILL.md
      testing/SKILL.md
      testing/references/testing-trophy.md
      localization/SKILL.md
    agents/
      architecture-reviewer.md
      refactoring-agent.md
      cross-project-consistency.md
      test-coverage-agent.md
      localization-coverage-agent.md
docs/
  conventions.md             Cross-project decisions log (not part of the
                             plugin itself — read by path, see above).
```

## Installation

There are two different ways to install this, depending on which Claude
surface is being used — they are not interchangeable, so use whichever
matches what's actually open.

### From the Claude Code CLI (terminal)

```bash
# 1. Clone or already have this repo locally, e.g.:
#    ~/Documents/Harness/rn-mobile-harness

# 2. Register this repo as a plugin marketplace:
/plugin marketplace add ~/Documents/Harness/rn-mobile-harness

# 3. Install the plugin from it:
/plugin install rnmh@rn-mobile-harness
```

No build step, no copying into `~/.claude`. Claude Code reads the plugin
directly from this repo's `plugins/rnmh/` folder.

**After editing a skill or agent file**, reload so Claude Code picks up the
change:

```
/reload-plugins
```

### From the Claude desktop app's Plugins panel

The desktop app's Plugins screen (Settings → Plugins → "+ Add") installs
from an uploaded `.zip` archive rather than a filesystem path — the
marketplace-add flow above doesn't apply there. To install this way:

1. Zip the plugin folder itself (not the whole repo) so `.claude-plugin/plugin.json`
   ends up inside the archive's top-level `rnmh/` folder:
   ```bash
   cd ~/Documents/Harness/rn-mobile-harness/plugins
   zip -r rnmh-plugin.zip rnmh -x "*.DS_Store"
   ```
2. In the Plugins panel, choose "+ Add" → "Upload local plugin" and drop
   `rnmh-plugin.zip` (or browse to it).
3. It should then show up under "Yours", and skills become invokable as
   `/rnmh:<name>`.

This upload is a **snapshot**, not a live link to the repo — after editing
any skill/agent file, re-zip and re-upload to update the installed plugin.
There's no reload command for this path the way `/reload-plugins` works in
the CLI.

## Forking this for your own use

This harness encodes one person's specific choices (bare RN over Expo, a
particular refactoring catalog, specific review categories) — forking and
adjusting rather than using it as-is is expected. To run your own fork
locally:

1. Fork/clone the repo to your own machine, anywhere you like.
2. Edit `plugins/rnmh/.claude-plugin/plugin.json` — at minimum, change
   `name` if you want a different invocation prefix than `rnmh:` (renaming
   the `plugins/<name>/` folder to match keeps things consistent, though
   only the manifest's `name` field actually determines the prefix).
3. Edit whichever skills/agents don't fit your stack or preferences — see
   each `SKILL.md`/agent file's own content; there's no central config,
   each file is self-contained.
4. Install your fork with whichever method above matches your Claude
   surface (CLI marketplace-add, or desktop-app zip upload).
5. While actively iterating on a fork in the CLI,
   `claude --plugin-dir /path/to/your-fork/plugins/<your-plugin-name>`
   loads the plugin for a single session without installing it — useful
   for quick trial-and-error before committing to the marketplace-install
   workflow above.

Three files are worth reading before adjusting anything else, since other
pieces reference them: `docs/conventions.md` (the cross-project decisions
log format), `plugins/rnmh/skills/refactoring/references/fowler-catalog.md`
(the refactoring vocabulary the refactoring skill/agent rely on), and
`plugins/rnmh/skills/testing/SKILL.md` (the testing priorities the testing
skill/agent rely on).

## Roadmap

Done:
1. `design-to-code` skill — reference analysis -> bare RN UI implementation.
2. `architecture-reviewer` subagent — structural/architecture code review,
   functional categories only, no prescribed patterns.
3. `refactoring` skill + `refactoring-agent` — Fowler catalog-based refactoring,
   interactive and unattended.
4. `project-bootstrap` skill — new-project scaffolding on a minimal, asked-not-assumed
   baseline.
5. `cross-project-consistency` agent + `docs/conventions.md` — cross-project
   duplication/drift detection, with a conventions log instead of an arbitrary
   "reference project."
6. `rn-diagnostics` skill — RN-specific bug classification and evidence-gathering.
7. `release-checklist` skill — App Store/Play Store release checklist.
8. `security-review` skill — sensitive-data handling audit.
9. `rn-upgrade` skill — safe RN version / native dependency upgrade process.
10. Packaged as a real Claude Code plugin (`rnmh`), installable via a local
    marketplace (CLI) or a zip upload (desktop app) — replaces the earlier
    manual `sync.sh` copy-into-`~/.claude` approach.
11. `testing` skill + `test-coverage-agent` — interactive and unattended test
    writing for bare RN + TypeScript, with every added test verified to
    actually fail on broken logic before counting as coverage.
12. `localization` skill + `localization-coverage-agent` — i18n setup,
    string extraction, pluralization/formatting/RTL guidance, interactive
    and unattended, both refusing to invent an i18n library or a
    non-default-locale translation on their own.

Planned next:
13. Eventually: publish for other RN developers (the marketplace piece is
    already in place; this would mean hosting it somewhere installable by
    others, and generalizing away from this one person's specific choices).
