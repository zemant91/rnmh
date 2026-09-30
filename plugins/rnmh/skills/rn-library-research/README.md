# rn-library-research — how it works

## What it does

Checks a third-party package's *current* state — not what a model
remembers about it — before it's adopted, when it's already installed and
needs a vulnerability check, or when it's a suspected performance
bottleneck. Memory trails the ecosystem; this skill checks the npm
registry, the GitHub repo's real activity, and a security advisory source
directly, on demand.

## How it works

```
1. Confirm scope — one of three modes:
     Standalone adoption decision → all categories
     Invoked by security-review   → Known vulnerabilities only
     Invoked by performance-audit → Alternatives & performance only
        │
        ▼
2. Check each in-scope category against a LIVE source, not memory:
     Maintenance & health      → npm registry + GitHub activity
     New Architecture compat   → library's own docs/issues
     Native footprint          → install docs + reported linking issues
     Bundle size                → actual package + dependency tree size
     License                    → package metadata
     Known vulnerabilities      → advisory database
     Alternatives/performance   → real benchmarks/comparisons, not vibes
        │
        ▼
3. Report per category, each claim traced to what was actually checked;
   explicitly flag anywhere a live check wasn't possible instead of
   filling the gap from memory
        │
        ▼
4. For an adoption decision: end with a clear recommendation, not a flat
   list with no conclusion
```

## What it deliberately doesn't do

Doesn't state a maintenance/version/vulnerability claim from memory — a
remembered impression about a library is explicitly not treated as a
finding. Doesn't recommend switching an already-working library on
reputation alone — needs a concrete, current reason (a real CVE, confirmed
abandonment, a measured performance gap).

## When to reach for it

- Before adding any new package to the project.
- `security-review` calls it to check installed packages for known
  vulnerabilities.
- `performance-audit` calls it to compare a suspected-bottleneck library
  against real alternatives.

## Worked example

**Input:**
> "PocketSpotter needs on-device pose estimation for rep counting via the
> camera — is `react-native-vision-camera` plus a pose-detection frame
> processor a reasonable choice, or is there something better
> maintained?"

**What the skill does:**

1. **Scope:** standalone adoption decision — full vetting.
2. **Maintenance & health:** checks the npm registry and GitHub repo —
   confirms recent releases, an active maintainer response pattern on
   recent issues, and that it's backed by an org rather than a single
   maintainer.
3. **New Architecture compatibility:** checks the library's own docs —
   confirms it states explicit support for Fabric/TurboModules from a
   named recent version, and notes the project needs to be on at least
   that version.
4. **Native footprint:** confirms it ships native iOS/Android code (camera
   frame processing requires this), checks recent issues for
   autolinking/pod-install complaints — finds a handful tied to an older
   version, none recent.
5. **Bundle size:** native code doesn't count toward JS bundle size the
   way a pure-JS library would — flags this as a non-concern here.
6. **License:** MIT — no concern for a commercial app.
7. **Known vulnerabilities:** checks an advisory database — none found
   against the current version.
8. **Alternatives:** names one real alternative also used for camera
   frame processing in RN, notes it has a smaller community and less
   frequent releases by comparison — not a reason to prefer it here.

**Report:**
> Recommendation: adopt `react-native-vision-camera` — actively
> maintained, confirmed New Architecture support from a recent version, no
> known vulnerabilities, native footprint is normal for a camera library.
> Note: requires the project already be on that RN New Architecture
> version — confirm before adopting.

**Output:** an adoption decision backed by what was actually checked
against current sources, not by which library "sounds" more popular.
