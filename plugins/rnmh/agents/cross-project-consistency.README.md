# cross-project-consistency — how it works

## What it does

Compares two or more of the user's bare RN/TypeScript projects against
each other for duplicated components/logic and naming/convention drift —
not one project's internal consistency (that's `architecture-reviewer`'s
job), but consistency *between* projects that are otherwise independent.
Takes the same fresh-eyes stance as this harness's other review agents:
no assumption about why either project made a given choice.

## The ground rule: only two things count as "already settled"

1. **A shared local/workspace package**, if the compared projects
   actually depend on one — for whatever that package provides.
2. **`docs/conventions.md`** in this harness repo, for anything it
   already has an entry for.

Everything else — no shared package, nothing in the conventions log —
never gets a manufactured "reference project" to defer to. A divergence
gets a recommendation only when there's concrete evidence one
implementation is more correct/complete (named explicitly); otherwise
it's reported as an **open question for the user to decide**, never a
default pick with no stated reason.

## How it works — four comparison categories

```
1. Duplicated components/utilities  — near-identical logic rebuilt
                                       independently; note if copies
                                       have already drifted (one fixed
                                       a bug the other lacks)
2. Naming/convention drift          — same kind of thing named/
                                       structured differently across
                                       projects, with nothing about
                                       their domains explaining why
3. Shared-package drift             — (only if a shared package exists)
                                       who's behind its version, who
                                       has a local override, who
                                       correctly delegates
4. Divergent solutions              — two different approaches to the
                                       same kind of need — flagged as a
                                       DECISION to make, not an error
```

Never flagged: differences that reflect genuinely different domains
(a medical app's stricter validation vs. a game's looser one), a single
project's own internal issue (redirected to `architecture-reviewer`
instead), or purely stylistic differences with no real cost.

## What happens once the user decides

When the user resolves an open question from a report (a naming/structure
call under categories 2 or 4), this agent appends it to
`docs/conventions.md` **right away, in the same session** — that's what
makes the decision stick, so `project-bootstrap` and the next project (or
the next session) read it and don't have to ask again.

## When to reach for it

- Working across the user's parallel app portfolio, looking for
  duplication or drift worth consolidating.
- Not for reviewing one project alone.

## Worked example

**Input:**
> Compare PocketSpotter and the fitness-tracker-app for duplication.

**What the agent does:**

1. **Orient:** checks both projects' `package.json` — no shared local
   package between them. Reads `docs/conventions.md` — finds an existing
   entry: "2026-08-30 — package manager: use pnpm across new projects."
2. **Category 1 (duplication):** finds both projects independently
   implement a very similar `useDebouncedValue` hook — near-identical
   logic, but PocketSpotter's version handles a cleanup-on-unmount edge
   case the fitness-tracker's doesn't. **Finding**: names both files,
   notes the drift (one fixed a bug the other lacks), and — since there's
   no shared package between them — reports this as a genuine extraction
   *candidate*, not a violation of something that doesn't exist yet.
3. **Category 2 (naming drift):** PocketSpotter calls its API layer
   `services/`, fitness-tracker-app calls the same kind of thing `api/` —
   nothing about either app's domain explains the difference. **Finding**:
   reported as drift with no evidence either name is "more correct" — an
   open question for the user, not a recommendation to rename one.
4. **Category 3 (shared-package drift):** skipped — no shared package
   exists between these two projects, so this category is stated as "not
   applicable" rather than silently omitted.
5. **Category 4 (divergent solutions):** PocketSpotter uses Zustand for
   its local workout-session state; fitness-tracker-app uses plain
   Context for its equivalent nutrition-log-session state. **Finding**:
   flagged as a genuine open decision (both are reasonable for
   screen-local state), not an error either way.
6. **Report, by category, with the overall read:** "Portfolio is mostly
   consistent; the `useDebouncedValue` duplication (with real drift) and
   the `services/` vs `api/` naming split are worth a deliberate decision
   — no shared package exists yet, so consolidating either would mean
   creating one, which is itself worth deciding rather than assuming."
7. Say the user responds: "let's standardize on `services/` going
   forward." The agent immediately appends to `docs/conventions.md`:
   "2026-09-30 — API-layer folder naming: use `services/`, not `api/`.
   (raised in: PocketSpotter vs. fitness-tracker-app comparison)" — so
   `project-bootstrap` and any future comparison picks this up without
   asking again.

**Output:** two named, evidence-backed findings and one genuine open
decision — with the user's actual answer immediately captured so it never
has to be re-litigated.
