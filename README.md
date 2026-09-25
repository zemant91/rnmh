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
| `feature-implementation` | `/rnmh:feature-implementation` | Building a full feature end to end — design through data/state, build, and tests | Orchestrates `design-to-code`/`testing`/instrumentation skills at the right points; adds requirements scoping, data/state integration, and a completion checklist | Yes — the whole feature, via the skills it orchestrates |
| `refactoring` | `/rnmh:refactoring` | Cleaning up existing code, extracting logic, responding to review feedback | Named-technique refactoring (Fowler catalog) applied in small, confirmed steps | Yes, incrementally, with confirmation at structural steps |
| `project-bootstrap` | `/rnmh:project-bootstrap` | Starting a brand-new bare RN + TS project, or re-basing folder structure | A batch of setup questions, then a scaffolded project | Yes — creates the project skeleton |
| `rn-diagnostics` | `/rnmh:rn-diagnostics` | A crash, perf problem, bundler/Metro failure, native build/linking issue, or release-only/platform-only bug | Symptom classification, bucket-specific evidence gathered, confirmed root cause (or a named gap in evidence) | No (hands structural fixes to `refactoring`) |
| `release-checklist` | `/rnmh:release-checklist` | Before submitting to the App Store / Play Store, or cutting any production build | Three-way report: confirmed OK / blocker / gap, across versioning, signing, store compliance, rollout safety net | No |
| `security-review` | `/rnmh:security-review` | Reviewing an app handling sensitive data, or after adding a new SDK/WebView/deep link | Category-by-category findings: secret storage, logging, local encryption, transport, WebViews/deep links, screen/session exposure, third-party SDK exposure | No |
| `rn-upgrade` | `/rnmh:rn-upgrade` | Upgrading the RN version and/or native dependencies | A concrete upgrade sequence, applied one version/dependency at a time, verified on both platforms and build types | Yes — this is the point of the process |
| `testing` | `/rnmh:testing` | Writing or reviewing tests for a component, hook, or piece of logic, interactively | What's worth testing, RN-specific mocking guidance (native modules, navigation, async state, animations), tests written against observable behavior | Yes — adds/edits test files |
| `localization` | `/rnmh:localization` | Setting up i18n, adding a locale, extracting hardcoded strings, handling pluralization/formatting/RTL | Detected-setup-aware key extraction, CLDR-aware pluralization guidance, locale-formatting and RTL notes | Yes — adds/edits locale files and translation-call sites |
| `performance-audit` | `/rnmh:performance-audit` | A periodic/pre-release performance review — bundle size, startup time, render cost, lists, images/memory | Measurement-backed findings per category, ranked by confirmed impact, with `rn-diagnostics` handling active-complaint root cause instead | Only where a fix is both safe and already measurement-backed |
| `push-deep-linking` | `/rnmh:push-deep-linking` | Setting up or reviewing push notifications and deep/universal/app links | Platform registration + token-lifecycle guidance, cold-start/killed-state routing checklist, custom-scheme vs. verified-domain tradeoffs | Yes — wires up handlers, notification and navigation setup |
| `ci-cd-pipeline` | `/rnmh:ci-cd-pipeline` | Setting up or reviewing a CI/CD pipeline (build/test gating, caching, signing, store delivery) | Detected-setup-aware pipeline plan (stages/triggers/secrets), restated and confirmed before any config is created | Yes — creates/edits pipeline config, after an explicit go-ahead |
| `feature-flags-remote-config` | `/rnmh:feature-flags-remote-config` | Introducing feature flags / remote config, or reviewing an existing flag inventory | Setup-aware flag additions with a named removal plan and safe default, offline/cold-start handling, and a security-boundary check | Yes — adds/edits flag definitions and usage |
| `analytics-crash-reporting` | `/rnmh:analytics-crash-reporting` | Setting up or reviewing analytics/crash-reporting instrumentation | Setup-aware instrumentation coverage (screens, errors on both JS + native paths), event taxonomy, symbolication check | Yes — adds/edits tracking and error-reporting calls |

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
| `performance-audit-agent` | `rnmh:performance-audit-agent` | An unattended pass applying narrow, measurement-independent performance fixes across a file/module/PR | Two-part report: **Applied** (a small mechanical set: keyExtractor, getItemLayout correctness, effect cleanup, already-flagged duplicate deps) and **Recommended, not applied** (everything needing a profiler/bundle measurement) | Yes for the narrow mechanical set only; no for anything needing measurement — reported as a recommendation instead |
| `push-deep-linking-agent` | `rnmh:push-deep-linking-agent` | An unattended pass checking push/deep-link handling for completeness across a file/module/PR | Two-part report: **Applied** (wiring an existing routing function to a missing cold-start/killed-state entry point, or relocating a closure-free background handler) and **Recommended, not applied** (everything needing a new decision or native/hosted config) | Yes for the narrow mechanical set only; no for new routing logic, channels, permissions, or native/hosted config — reported as a recommendation instead |
| `ci-cd-audit-agent` | `rnmh:ci-cd-audit-agent` | An unattended audit of an already-existing CI/CD pipeline config for gaps | Two-part report: **Applied** (turning on an already-available cache option, gating an ungated deploy job, removing a secret-printing log line) and **Recommended, not applied** (everything needing a new secret, access, or restructuring decision) | Yes for the narrow mechanical set only; no for new secrets, restructuring, or provider/Fastlane introduction — reported as a recommendation instead |
| `feature-flags-audit-agent` | `rnmh:feature-flags-audit-agent` | An unattended pass finding stale/orphaned feature flags across the whole codebase | Two-part report: **Applied** (removing a catalog entry with zero code references anywhere in the repo) and **Recommended, not applied** (a flag that looks decided but still has live references, or a code/catalog key mismatch) | Yes only for zero-reference catalog entries; no for anything with live references — reported as a recommendation instead |
| `analytics-coverage-agent` | `rnmh:analytics-coverage-agent` | An unattended pass finding untracked screens/error paths across a file/module/PR | Two-part report: **Applied** (wiring a missing screen/error-report call using the project's own existing tracking convention) and **Recommended, not applied** (gaps with no existing convention to copy, or possible sensitive data) | Yes only when copying an already-established convention; no for a new event/SDK/judgment call — reported as a recommendation instead |

## Shared reference

- `docs/conventions.md` (repo root, outside the plugin folder) — a running
  log of naming/structure decisions made along the way across projects, so
  nobody has to remember or re-decide them. `project-bootstrap` reads it
  before asking its own questions; `cross-project-consistency` reads it as
  settled ground truth and appends new entries once the user resolves a
  divergence.
- `docs/harness-verification.md` (repo root, outside the plugin folder) —
  the checklist and running log for actually dogfooding this harness
  against real projects (auto-trigger disambiguation between overlapping
  skills, content-quality checks, agent hit-rate) before adding anything
  new to it.
- `plugins/rnmh/skills/refactoring/references/fowler-catalog.md` — the
  named-technique catalog (7 chapters + code smells → technique mapping)
  shared by `refactoring` and `refactoring-agent`.
- `plugins/rnmh/skills/testing/SKILL.md` and
  `plugins/rnmh/skills/testing/references/testing-trophy.md` — the Testing
  Trophy model (Kent C. Dodds) behind what's worth testing at which layer,
  plus RN-specific mocking guidance, shared by `testing` and
  `test-coverage-agent`.

## Which skill/agent fits which project stage

The tables above list what each skill/agent does; this maps them to when
in a project's life they're actually worth reaching for. This isn't a new
skill, just a navigation aid over the existing set — several entries apply
at more than one stage, and none of this is a hard gate.

### Starting a new project (no code yet)
- `project-bootstrap` — the actual starting point: fixes strict TS and the
  folder-style choice, asks everything else rather than assuming it.
- `ci-cd-pipeline` — worth wiring up even minimally (lint/type-check
  gating) from the start; cheaper to set up before there's much to
  retrofit onto.
- `feature-flags-remote-config` — only if gradual rollout/kill-switch
  capability is a known day-one requirement; otherwise this is cheap to
  add later and not worth setting up speculatively.

### Early/active development (core screens and flows being built)
- `feature-implementation` — the default entry point for a full feature
  (not just its UI): scopes it, orchestrates `design-to-code` and
  `testing` in order, and adds the data/state/error-handling and
  completion-checklist pieces neither of those covers on its own.
- `design-to-code` — every time a new screen/flow is built from a
  reference, whether standalone or as `feature-implementation`'s Step 1.
- `refactoring` — continuously, as code accumulates and patterns repeat.
- `testing` — once a piece of logic/component has stabilized enough that
  testing it isn't wasted effort on something about to change shape.
- `rn-diagnostics` — whenever a crash/perf/build issue comes up that isn't
  a plain logic bug.
- `push-deep-linking` — once the navigation/auth flows it needs to hook
  into actually exist.
- `localization` — if multi-locale is a known requirement, wiring it in
  while screens are still being built is cheaper than retrofitting every
  hardcoded string later.
- `architecture-reviewer` — periodically, once there's enough structure to
  actually review (not on day one with three files).

### Codebase growing/stabilizing (more features, maybe more contributors)
- `architecture-reviewer`, and `cross-project-consistency` once there's
  more than one of your projects to compare — catching drift before it
  compounds.
- `refactoring-agent` / `test-coverage-agent` — unattended sweeps start
  making sense once there's enough code that a manual pass-by-pass isn't
  keeping up.
- `feature-flags-remote-config` — this is usually when it actually starts
  paying for itself, once there's enough surface area that decoupling
  deploy from release matters.
- `performance-audit` — once there's real usage/enough screens to profile;
  auditing an app with three screens and no users mostly measures noise.

### Pre-release (getting ready to ship or submit)
- `release-checklist` — every time, non-negotiable before a store
  submission.
- `security-review` — before the app is trusted with anything sensitive,
  and again before a major release if scope changed since the last pass.
- `ci-cd-pipeline` — usually when store-delivery automation and full
  gating actually get finished, if they weren't done from the start.
- `analytics-crash-reporting` — must be live and verified (source maps
  matching the exact build) before real users hit the release, not added
  after the first crash report comes back unsymbolicated.

### Post-release / production / maintenance
- `rn-diagnostics` — the main tool once real users start reporting real
  bugs.
- `analytics-coverage-agent` / `feature-flags-audit-agent` — periodic
  hygiene sweeps once there's an accumulated event/flag inventory worth
  cleaning up.
- `performance-audit` (and its agent) — periodic, now informed by real
  production data instead of guesses.
- `security-review` — periodic re-check, especially after adding a new
  SDK/WebView/deep link.
- `rn-upgrade` — whenever the RN version or native deps need to move
  forward; triggered by upstream releases, not by project stage.

### Stage-agnostic — triggered by the situation, not by project age
`refactoring`, `rn-diagnostics`, `design-to-code` (any time new UI is
built), and `security-review` (after adding any sensitive-data-adjacent
capability) apply whenever their trigger condition is met, regardless of
how old or new the project is.


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
      feature-implementation/SKILL.md
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
      performance-audit/SKILL.md
      push-deep-linking/SKILL.md
      ci-cd-pipeline/SKILL.md
      feature-flags-remote-config/SKILL.md
      analytics-crash-reporting/SKILL.md
    agents/
      architecture-reviewer.md
      refactoring-agent.md
      cross-project-consistency.md
      test-coverage-agent.md
      localization-coverage-agent.md
      performance-audit-agent.md
      push-deep-linking-agent.md
      ci-cd-audit-agent.md
      feature-flags-audit-agent.md
      analytics-coverage-agent.md
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
13. `performance-audit` skill + `performance-audit-agent` — bundle size,
    startup time, render cost, lists, and image/memory audit categories,
    complementing `rn-diagnostics`'s reactive Performance bucket; the
    unattended agent only applies a narrow, measurement-independent
    mechanical fix set and recommends everything else.
14. `push-deep-linking` skill + `push-deep-linking-agent` — push
    notification and universal/app-link setup, cold-start/killed-state
    routing, and token lifecycle, cross-referencing `security-review` for
    deep-link parameter validation; the unattended agent only wires
    existing routing functions to missing entry points and never touches
    native/hosted config.
15. `ci-cd-pipeline` skill + `ci-cd-audit-agent` — CI/CD setup and audit
    (caching, gating, signing/secrets, artifact/source-map retention,
    store delivery), automating what `release-checklist` covers manually;
    the unattended agent only audits an already-existing pipeline config
    and applies a narrow, already-anchored fix set, never creating a new
    secret or restructuring the pipeline itself.
16. `feature-flags-remote-config` skill + `feature-flags-audit-agent` —
    flag lifecycle/staleness, safe defaults, offline/cold-start handling,
    and where a flag stops being a security boundary; the unattended agent
    only removes a catalog entry with zero code references anywhere in the
    repo and never collapses a flag that still has live references, since
    it has no access to the flag's real rollout state.
17. `analytics-crash-reporting` skill + `analytics-coverage-agent` —
    instrumentation coverage (screens, JS + native error paths), event
    taxonomy, and symbolication setup, cross-referencing `security-review`
    (sensitive-field scrubbing), `ci-cd-pipeline` (source-map upload), and
    `rn-diagnostics` (manual single-crash diagnosis); the unattended agent
    only copies the project's own already-established tracking convention
    to a missing screen/error path, never inventing a new event or SDK
    call shape.
18. `feature-implementation` skill — orchestrates `design-to-code` and
    `testing` (and the instrumentation skills where relevant) into one
    end-to-end feature workflow, filling the gaps between them:
    requirements scoping before a design exists, RN-specific data/state
    integration, and a completion checklist crossing UI, logic, data, and
    tests. Skill-only, no agent — this is judgment-heavy creative work
    from end to end, not a narrow, mechanically-verifiable task.

Planned next:
19. Eventually: publish for other RN developers (the marketplace piece is
    already in place; this would mean hosting it somewhere installable by
    others, and generalizing away from this one person's specific choices).
