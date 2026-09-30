---
name: "rn-library-research"
description: "Use before adding a new third-party package to a bare React Native + TypeScript project, when checking installed packages for known vulnerabilities, or when comparing libraries by real-world performance rather than reputation — checks current maintenance status, New Architecture compatibility, native-code/autolinking risk, bundle-size impact, license, and known CVEs against live sources instead of relying on training data, which goes stale as the RN ecosystem moves. Invoked directly for a library-adoption decision, or invoked by `security-review` (known-vulnerabilities angle) and `performance-audit` (alternatives-comparison angle) for their narrower needs."
---

# RN library research (bare React Native + TypeScript)

## When to use
- Before adding any new third-party package to the project — is this a
  reasonable choice, or does it have a known problem this session's
  training data wouldn't reflect?
- Checking an already-installed package for known vulnerabilities
  (invoked by `security-review`'s third-party-dependency check).
- Comparing a library against alternatives by real, current benchmark/
  discussion evidence rather than reputation (invoked by
  `performance-audit` when a list/image/state library is a suspected
  bottleneck).

## The core discipline: check current state, don't recall it

A model's sense of a package's maintenance status, its latest version,
whether it's abandoned, or a CVE disclosed against it is frozen at
training time — and the npm ecosystem moves faster than that. "I recall
this library being well-maintained" is not a finding; it's a guess
dressed as one. Every claim this skill produces should trace to something
checked *now*: the npm registry page, the GitHub repo's actual recent
activity, a security advisory database, the library's own changelog —
not memory. If a live check isn't possible for a specific source, say so
explicitly rather than filling the gap with a remembered impression. The
same discipline applies to any library-swap suggestion made elsewhere in
this harness — `performance-audit` invokes this skill rather than naming
a "faster" alternative from reputation alone.

## Research categories

### Maintenance & health
- Last published version and its date — is there a release in the last
  ~6–12 months, or does the changelog trail off?
- Open issues/PRs ratio and whether maintainers are actually responding,
  not just whether issues exist (every popular library has open issues).
- Single maintainer vs. an org/team — a bus-factor-of-one package is a
  real risk for anything load-bearing.
- Weekly download count as a rough popularity signal only — a high
  download count with a stale changelog still means an abandoned package.

### New Architecture (Fabric/TurboModules) compatibility
- Confirmed working under the New Architecture, or does it still assume
  the legacy bridge? This is one of the most common reasons a
  seemingly-healthy RN library breaks in a bare RN project on a current
  RN version.
- If the project hasn't enabled the New Architecture yet, note this as a
  forward-looking risk rather than a blocker — but say so explicitly
  rather than silently skipping the check.

### Native footprint & autolinking
- Does it ship native iOS/Android code (pod install, Gradle
  dependencies), or is it pure JS? Pure-JS packages avoid a whole class of
  linking/version-mismatch problems.
- Known autolinking issues, required manual linking steps, or
  platform-specific setup gotchas reported by other users — check the
  library's own troubleshooting docs and open issues for recurring
  install-time complaints, not just the happy-path install instructions.

### Bundle size impact
- Actual package size (and its own dependency tree) against what the
  project would use from it — a large library pulled in for one small
  function is a candidate for a lighter alternative or a scoped import,
  not an automatic disqualifier.

### License
- License type compatible with the project's own distribution model
  (MIT/Apache/BSD are typically unproblematic; a copyleft license such as
  GPL/AGPL on a dependency needs a deliberate decision for a closed-source
  commercial app, not a silent pass).

### Known vulnerabilities (CVE / security advisories)
- Check the package against a current advisory source (e.g. GitHub
  Security Advisories, the npm advisory database) — not just "no CVE
  comes to mind."
- A disclosed-and-patched vulnerability in an old version is a different
  finding from one with no fix released yet — say which, and which
  installed version is actually affected.

### Alternatives & performance comparison
- Name 2–3 real alternatives actually used in bare RN projects for the
  same job, not a hypothetical "you could also roll your own."
- Where performance is the question, cite actual benchmark data or
  documented real-world comparisons (e.g. a maintainer's own benchmark, a
  widely-referenced comparison writeup) rather than reputation — "X is
  known to be faster" needs a source, not a vibe.

## Scope depends on who's asking

- **Standalone / library-adoption decision**: run all categories above.
- **Invoked by `security-review`**: scope to Known vulnerabilities only,
  for the specific installed packages under review — don't re-run a full
  adoption-style vetting on a package that's already shipped and staying.
- **Invoked by `performance-audit`**: scope to Alternatives & performance
  comparison only, for the specific library already suspected as a
  bottleneck — the other categories aren't what triggered the call.

## What NOT to do
- Don't state a maintenance status, version, or vulnerability claim
  without having actually checked a current source for it in this
  session — a remembered impression is not a finding.
- Don't recommend switching a foundational library away from an
  already-working choice on reputation alone — name the concrete,
  current evidence (a real CVE, a confirmed abandonment, a measured
  performance gap) or don't recommend the switch.
- Don't treat a high download or star count as a substitute for checking
  actual recent maintenance activity.

## Process
1. Confirm scope: full adoption vetting, a targeted CVE check, or a
   targeted performance/alternative comparison — driven by what's being
   asked or which skill invoked this one.
2. Check the relevant categories against live sources, not memory —
   name the specific source checked for each claim.
3. Report findings by category, each backed by what was actually checked;
   note explicitly anywhere a live check wasn't possible instead of
   filling the gap with a guess.
4. For an adoption decision, end with a clear recommendation (adopt / use
   alternative X / needs the user's own judgment call on Y) rather than a
   flat list with no conclusion.
