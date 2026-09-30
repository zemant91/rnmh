# refactoring — how it works

## What it does

Cleans up, restructures, or simplifies existing, working React
Native/TypeScript code — interactively, one exchange at a time — using
the named-technique catalog from Martin Fowler's *Refactoring* (2nd ed.),
kept in `references/fowler-catalog.md` in this skill's own folder. For an
unattended pass over a larger area, see `refactoring-agent` instead; both
read the same catalog.

## The one rule that matters: two hats

Refactoring and behavior change never happen in the same step:

- **Refactoring hat** — behavior must be identical before and after. No
  new features, no bug fixes, no "while I'm in here."
- **Feature/fix hat** — changing behavior on purpose.

If a real bug turns up mid-refactor, the refactor stops, the bug is named,
and it's fixed as a clearly separate step afterward — never folded into
the same edit. Asked for both at once ("refactor this and fix the bug"),
the refactor happens first (so the fix lands on cleaner code), then the
hat-switch is called out explicitly before the fix.

## How it works — the flow

```
1. Identify the smell(s)      — named from the Fowler vocabulary
                                 (Long Function, Feature Envy, ...),
                                 not "this could be cleaner"
        │
        ▼
2. Pick the technique(s)      — via the catalog's smell→refactoring
                                 table; smallest technique that removes
                                 the smell, unless a bigger reshape
                                 was asked for
        │
        ▼
3. Sequence as small,         — several small mechanical edits that
   safe steps                   each leave the code working, stated
                                 before being made
        │
        ▼
4. Verify behavior unchanged  — run existing tests, or say plainly
   after each step               there's no safety net and ask how
                                 to proceed
        │
        ▼
5. Stop and ask before a      — Move Function/Field across files,
   boundary-crossing move       Replace Conditional with Polymorphism,
                                 anything touching inheritance
        │
        ▼
6. Name the technique used when done — traceable back to the catalog
```

## When to reach for it

- Existing code needs cleaning up without changing what it does.
- Someone pointed at a specific smell (by name or description).
- Following up on a finding `architecture-reviewer` or
  `refactoring-agent` already named.

## Worked example

**Input:**
> "This `WorkoutCard` component has a huge conditional rendering block for
> five different card states — can you clean it up?"

**What the skill does:**

1. **Identify the smell:** names it explicitly — this is a **Long
   Function** (the render logic) combined with a **Switch/type-code
   conditional** driving five visually distinct branches — not just
   "messy."
2. **Pick the technique:** the catalog's table points at **Extract
   Function** for pulling each branch into its own named sub-component,
   and — since it's a component tree, not a class hierarchy — notes that
   a discriminated union with a single `switch` (React-idiomatic) is a
   better fit here than Fowler's classic **Replace Conditional with
   Polymorphism** via a class hierarchy, and says so explicitly.
3. **Sequence:** proposes three small steps — extract each of the five
   branches into its own component first (behavior identical, just
   moved), then collapse the parent's conditional into a single
   discriminated-union `switch` over those components, then (if a shared
   pattern emerges) extract a common wrapper. States this sequence before
   touching anything.
4. **Verify:** the project has existing snapshot tests for `WorkoutCard`
   — runs them after each of the three steps to confirm nothing visually
   changed. (Also notes, separately from this refactor, that these
   snapshot tests are exactly the low-value kind `testing` warns against
   — but that's out of scope for this refactor, so it's only mentioned,
   not acted on.)
5. **Boundary check:** none of the three steps move code across files or
   touch a public API, so no extra stop-and-ask is needed here.
6. **Names the techniques used:** "Applied Extract Function five times
   (one per card state), then replaced the branching conditional with a
   discriminated-union switch over the extracted components."

**Output:** the same rendered UI, byte-for-byte, now structured as five
named, individually readable pieces instead of one large conditional —
with the exact catalog techniques named so the change is traceable, not
just "cleaned up."
