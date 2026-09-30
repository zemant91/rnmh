# feature-flags-audit-agent — how it works

## What it does

An unattended sweep of the whole repository finding stale or orphaned
feature flags: a catalog entry nothing references anymore, a code
reference with no matching catalog entry (likely a typo or drift bug), or
a flag whose branches look fully decided. The rule that overrides
everything else: **this agent has no access to a flag provider's real
rollout state** — it can only see the repo. So it only ever removes a
catalog entry that has **zero** references anywhere; it never touches a
flag that's still live in code, however confident-looking the "this looks
decided" signal is.

## How it works — the one mechanical case

```
✓ A catalog entry with ZERO references anywhere in the whole repo
  (checked repo-wide, not just the scoped file/module), AND the catalog
  is a plain local list, not synced from an external provider's schema
  → remove the entry. Nothing depends on it either way.

✗ A flag still referenced in code, even if only one branch of its
  if/else ever seems to run → report as a candidate for a human to
  confirm, then hand to refactoring-agent — never collapsed here
✗ A code reference to a key MISSING from the catalog → reported as a
  likely typo/drift bug, key never guessed
✗ A catalog synced from/matched against an external provider's schema
  → never touched; deleting locally without deleting on the provider
  would desync the two
```

Because a flag catalog is shared infrastructure, this agent checks
references across the **whole repository**, not just the file/module
named in scope — a flag can be defined in one place and used anywhere.

## When to reach for it

- A broader flag-hygiene sweep than an interactive `feature-flags-remote-config`
  session.
- Periodically, or after a batch of features have had time to fully roll
  out, to catch flags nobody remembered to remove.

## Worked example

**Input:**
> Audit PocketSpotter's flag catalog for stale entries.

**What the agent does:**

1. **Orient:** reads `docs/conventions.md`-adjacent flag catalog file
   (a local typed const file, not synced to an external provider), then
   Greps the whole repo for every catalog key's usage.
2. **Zero-reference check:** finds `legacyOnboardingFlow` in the catalog
   with **no** code references anywhere in the repo — the feature it
   gated was fully removed in a past refactor, and the catalog entry was
   just never cleaned up. This is exactly the mechanical case.
3. **Live-but-suspicious check:** finds `aiCoachingEnabled` still
   referenced in two places, and both branches of its `if` look
   functionally similar (coaching UI shown either way, just styled
   slightly differently) — this LOOKS decided, but the agent has no way
   to confirm the actual rollout percentage from Firebase Remote Config's
   real state. **Does not touch it** — flags it as a recommendation for a
   human to confirm, pointing at `refactoring-agent` as the next step once
   confirmed.
4. **Drift check:** finds a code reference to `aICoachingEnabled`
   (different casing) in one file that doesn't match any catalog entry —
   flags this as a likely typo, since it's probably silently evaluating
   to an unintended default right now, without guessing which of the two
   spellings is correct.
5. **Apply + verify:** removes the `legacyOnboardingFlow` catalog entry,
   confirms the type-check still passes, commits: "Remove stale flag
   catalog entry: legacyOnboardingFlow (zero references)."
6. **Report:**
   - **Applied**: removed `legacyOnboardingFlow` from the catalog — zero
     references confirmed repo-wide, verified by type-check.
   - **Recommended, not applied**: `aiCoachingEnabled`'s branches look
     functionally similar — worth confirming the rollout is actually
     finished before collapsing (a `refactoring-agent` job once
     confirmed); a mismatched-casing reference (`aICoachingEnabled`)
     found with no catalog entry — likely a typo, currently evaluating to
     an unintended default.

**Output:** one genuinely dead entry cleaned up safely, and two real
findings surfaced without guessing at rollout state the agent simply
doesn't have access to.
