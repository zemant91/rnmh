---
name: "refactoring"
description: "Use when refactoring existing React Native/TypeScript code interactively — cleaning up a component, extracting shared logic, simplifying conditionals, or responding to review feedback about code structure — using the named-technique catalog from Martin Fowler's Refactoring (2nd ed.)."
---

# Refactoring (Fowler catalog, bare React Native + TypeScript)

## When to use
- The user wants existing, working code cleaned up, restructured, or made
  easier to change, without changing what it does.
- The user points at a code smell (by name or by description) and wants it
  addressed.
- Following up on findings from `architecture-reviewer` or `refactoring-agent`
  that named specific issues to fix.

This skill is for interactive, in-conversation refactoring — proposing and
applying named techniques, one exchange at a time, with the user able to
steer or stop at any point. For an unattended pass over a larger area of the
codebase, see the `refactoring-agent` subagent instead; both use the same
catalog in `references/fowler-catalog.md` in this skill's folder — read it
before naming techniques.

## The one rule that matters: two hats

Refactoring and behavior change are two different activities and must never
happen in the same step. Before touching code, be explicit about which hat
is on:
- **Refactoring hat**: the code's behavior must be identical before and
  after. No new features, no bug fixes, no "while I'm in here" changes.
- **Feature/fix hat**: changing behavior. If a bug or missing feature turns
  up while refactoring, name it, stop the refactor, and either fix it as a
  clearly separate step or note it for later — don't blend it into the same
  edit.

If the user asks for both ("refactor this and also fix the bug"), do the
refactor first (so the fix lands on cleaner code), call out the hat-switch
explicitly, then fix the bug as a distinct, separately described step.

## Process

1. **Identify the smell(s).** Name what's actually wrong using the
   vocabulary in `references/fowler-catalog.md`'s smell list (Long Function,
   Feature Envy, Primitive Obsession, etc.) rather than a vague "this could
   be cleaner." If the user pointed at a specific spot, confirm the smell
   before picking a fix; if asked to find smells first, look for the RN/TS
   patterns called out at the end of the catalog file.
2. **Pick the technique(s).** Use the smell → refactoring table in the
   catalog to select the specific named refactoring(s) that address it.
   Prefer the smallest technique that removes the smell over a larger
   restructuring, unless the user asked for a bigger reshape.
3. **Sequence as small, safe steps.** Break the chosen refactoring into the
   smallest steps that each leave the code in a working state — this
   usually means several small mechanical edits rather than one large
   rewrite, especially for anything touching shared code. State the
   sequence before making it, so the user can stop or redirect early.
4. **Verify behavior is unchanged after each step**, in whatever way the
   project supports: run the existing test suite if there is one, or, if
   not, say plainly that there's no automated safety net for this change
   and ask whether to proceed anyway, add characterization tests first, or
   verify manually.
5. **Stop and ask before a technique that reshapes public API or crosses
   module boundaries** (Move Function/Field between files, Replace
   Conditional with Polymorphism turning a function into a class hierarchy,
   anything in "Dealing with Inheritance") — these ripple further than a
   local edit and are worth a deliberate go-ahead.
6. **Name the technique used when done**, so the change is traceable back
   to the catalog (e.g. "Extract Function on the validation block, then
   Replace Nested Conditional with Guard Clauses on the caller") rather than
   just describing the resulting diff.

## Notes specific to this codebase style

- Bare React Native + TypeScript, no Expo — a suggested extraction or move
  should not introduce an Expo-only dependency.
- Check the project's own `rn-tools` UI kit (if present) before extracting a
  new shared component — the extraction target may already exist.
- When applying **Introduce Parameter Object** or **Replace Primitive with
  Object**, give the new type a real TypeScript type/interface, not `any` or
  a loosely-typed object literal.
- When applying **Replace Conditional with Polymorphism** in a component
  tree, weigh it against React's own idioms (component composition,
  discriminated unions with a `switch` in one place) — polymorphism via
  class hierarchies is not always the RN-idiomatic answer to a type-based
  conditional; say so if a discriminated union would be simpler here.
