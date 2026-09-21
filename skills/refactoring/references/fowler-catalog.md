# Refactoring catalog reference

Shared reference for the `refactoring` skill and the `refactoring-agent`
subagent. Structure follows the 7-chapter classification used in Martin
Fowler's *Refactoring* (2nd edition, JavaScript examples): a first set of
general-purpose refactorings, then six chapters organized by the kind of
problem they address. Descriptions below are short, original summaries of
intent — for full step-by-step mechanics and worked examples, consult the
book directly; this file is a lookup table for picking the right named
technique, not a replacement for it.

Every refactoring here is behavior-preserving by definition: if the
observable behavior of the code changes, it isn't a refactoring, it's a
feature change or a bug fix, and the two should never be mixed into the same
step (see "Two hats" in both the skill and the agent).

## 1. A first set of refactorings (general-purpose, used constantly)
- **Extract Function** — pull a fragment of code out into its own named
  function when the name would explain what the fragment does better than
  the code itself does.
- **Inline Function** — fold a function's body back into its call site when
  the indirection no longer earns its keep.
- **Extract Variable** — name a sub-expression so the surrounding logic
  reads as intent rather than as an expression to decode.
- **Inline Variable** — remove a variable whose name adds nothing beyond
  the expression it holds.
- **Change Function Declaration** — rename a function and/or its
  parameters, or reshape its parameter list, to better express what it
  does and needs.
- **Encapsulate Variable** — route all access to shared/mutable data
  through a function instead of the raw variable, to control how it's
  read and changed.
- **Rename Variable** — replace a misleading or vague variable name with
  one that carries its actual meaning.
- **Introduce Parameter Object** — replace a recurring group of parameters
  that always travel together with a single object.
- **Combine Functions into Class** — group functions that operate on a
  shared bundle of data into a class built around that data.
- **Combine Functions into Transform** — group functions that derive
  values from a data structure into one place that produces an enriched
  copy of it.
- **Split Phase** — separate code that does two distinct things in
  sequence (e.g. parsing then computing) into two clearly divided steps.

## 2. Encapsulation
- **Encapsulate Record / Encapsulate Collection** — hide a raw record or
  collection behind an interface so callers can't reach in and mutate it
  in ways that bypass its invariants.
- **Replace Primitive with Object** — turn a primitive value that has
  started growing its own behavior or validation rules into a small
  object.
- **Replace Temp with Query** — turn a temporary variable holding a
  computed value into a function, so the computation is available wherever
  it's needed instead of just in the scope that computed it once.
- **Extract Class** — split a class/module doing the job of two into two,
  each with a single clear responsibility.
- **Inline Class** — merge a class that no longer earns its own existence
  back into the class that uses it.
- **Hide Delegate / Remove Middle Man** — find the right balance between
  hiding a collaborator behind a wrapper method and removing a wrapper
  that only forwards calls and adds no value.
- **Substitute Algorithm** — replace an implementation with a clearer one
  that produces the same result.

## 3. Moving features
- **Move Function / Move Field** — relocate a function or a piece of data
  to the module/class it's actually about, when it currently lives
  somewhere that only calls or holds it.
- **Move Statements into Function / Move Statements to Callers** — shift
  repeated setup/teardown code either into the function that needs it
  every time, or back out to callers when only some of them need it.
- **Replace Inline Code with Function Call** — replace code that
  duplicates what an existing function already does with a call to it.
- **Slide Statements** — reorder statements so related ones sit together,
  as a preparatory step before extracting them.
- **Split Loop** — separate a loop doing two unrelated things per
  iteration into two loops, each doing one.
- **Replace Loop with Pipeline** — express a loop that transforms a
  collection as a chain of collection operations (map/filter/reduce)
  instead.
- **Remove Dead Code** — delete code that can no longer be reached or
  used.

## 4. Organizing data
- **Split Variable** — give a variable that's reused for two unrelated
  purposes two separate names.
- **Rename Field** — rename a record/object field to reflect what it
  actually holds.
- **Replace Derived Variable with Query** — remove a variable that stores
  a value re-derivable from other data, and compute it on demand instead,
  to avoid the two going out of sync.
- **Change Reference to Value / Change Value to Reference** — decide, per
  piece of data, whether it should be a shared mutable reference or an
  independent immutable value, and convert it deliberately when the
  current choice causes bugs.

## 5. Simplifying conditional logic
- **Decompose Conditional** — extract the condition and each branch of a
  complex `if`/`else` into named functions.
- **Consolidate Conditional Expression** — combine a sequence of
  conditions that all lead to the same action into one.
- **Replace Nested Conditional with Guard Clauses** — turn deeply nested
  conditionals into early returns for the exceptional cases, leaving the
  main path unindented.
- **Replace Conditional with Polymorphism** — replace a conditional that
  branches on an object's type/kind with a method that varies by type.
- **Introduce Special Case** — replace repeated special-casing of a
  particular value (e.g. null/"unknown") with an object that encapsulates
  what should happen for that case.
- **Introduce Assertion** — make an assumption the code silently depends
  on explicit, so a violation fails loudly instead of producing a subtle
  bug.

## 6. Refactoring APIs
- **Separate Query from Modifier** — split a function that both returns a
  value and changes state into two functions, one pure, one a command.
- **Parameterize Function** — merge near-identical functions that differ
  only by an internal literal value into one that takes that value as a
  parameter.
- **Remove Flag Argument** — replace a boolean/enum parameter that
  selects between two different behaviors with two separate, clearly
  named functions.
- **Preserve Whole Object** — pass an object itself instead of pulling
  several values out of it just to pass them individually.
- **Replace Parameter with Query / Replace Query with Parameter** —
  decide, per parameter, whether the callee should derive a value itself
  or receive it precomputed from the caller, and move the responsibility
  when the current split creates awkward coupling.
- **Remove Setting Method** — remove a setter for a field that should be
  fixed after construction.
- **Replace Constructor with Factory Function** — use a plain function to
  build an instance when construction needs logic a constructor can't
  cleanly express.
- **Replace Function with Command / Replace Command with Function** —
  convert a function into a full command object when it needs to carry
  extra state, undo behavior, or lifecycle around a single operation — or
  back, when that machinery is no longer needed.

## 7. Dealing with inheritance
- **Pull Up Method / Pull Up Field / Pull Up Constructor Body** — move a
  member duplicated across subclasses up into their shared superclass.
- **Push Down Method / Push Down Field** — move a member that's only
  relevant to some subclasses down out of the superclass.
- **Replace Type Code with Subclasses** — replace a field that encodes a
  type/kind with actual subclasses, so type-specific behavior lives with
  the type instead of in conditionals.
- **Remove Subclass** — collapse a subclass that no longer differs
  meaningfully from its parent.
- **Extract Superclass** — factor out behavior shared by sibling classes
  into a common superclass.
- **Collapse Hierarchy** — merge a superclass and subclass that have
  drifted too close together to justify staying separate.
- **Replace Subclass with Delegate / Replace Superclass with Delegate** —
  prefer composition over inheritance when the "is-a" relationship no
  longer holds cleanly, delegating to a separate object instead.

## Code smells → likely refactorings

A quick lookup from symptom to the refactorings from this catalog most
likely to address it. Not exclusive — several smells often co-occur and
point at the same fix.

| Smell | Typically addressed with |
|---|---|
| Mysterious Name | Rename Variable, Change Function Declaration, Rename Field |
| Duplicated Code | Extract Function, Pull Up Method, Substitute Algorithm |
| Long Function | Extract Function, Replace Conditional with Polymorphism, Decompose Conditional, Split Phase |
| Long Parameter List | Introduce Parameter Object, Preserve Whole Object, Replace Parameter with Query |
| Global Data | Encapsulate Variable |
| Mutable Data | Encapsulate Variable, Split Variable, Separate Query from Modifier, Change Reference to Value |
| Divergent Change | Split Phase, Move Function, Extract Class |
| Shotgun Surgery | Move Function, Move Field, Inline Class, Combine Functions into Class |
| Feature Envy | Move Function, Extract Function |
| Data Clumps | Introduce Parameter Object, Preserve Whole Object, Extract Class |
| Primitive Obsession | Replace Primitive with Object, Introduce Special Case, Replace Type Code with Subclasses |
| Repeated Switches | Replace Conditional with Polymorphism |
| Loops | Replace Loop with Pipeline |
| Lazy Element | Inline Function, Inline Class, Collapse Hierarchy |
| Speculative Generality | Collapse Hierarchy, Inline Function, Inline Class, Remove Dead Code |
| Temporary Field | Extract Class, Introduce Special Case |
| Message Chains | Hide Delegate |
| Middle Man | Remove Middle Man, Inline Function |
| Insider Trading | Move Function, Move Field, Hide Delegate, Replace Subclass with Delegate |
| Large Class | Extract Class, Extract Superclass, Replace Type Code with Subclasses |
| Alternative Classes with Different Interfaces | Change Function Declaration, Move Function |
| Data Class | Move Function, Encapsulate Record, Split Phase |
| Refused Bequest | Push Down Method, Push Down Field, Replace Subclass with Delegate |
| Comments | Extract Function, Introduce Assertion, Rename Variable |

## RN/TypeScript-flavored notes

Where these smells tend to show up in a bare React Native + TypeScript
codebase specifically:
- **Long Function / Divergent Change** — screen components that fetch,
  transform, and render in one body; a change to any of the three forces
  touching the whole file.
- **Data Clumps / Primitive Obsession** — coordinates, money amounts, or
  IDs passed around as loose `number`/`string` pairs instead of a typed
  value/object.
- **Shotgun Surgery** — adding one field to an API response DTO requires
  editing the fetch call, a mapper, a screen, and a type in four unrelated
  files.
- **Feature Envy** — a component reaching into another component's or a
  store's internal state/fields instead of asking it for what it needs.
- **Repeated Switches** — the same `switch (screenType)` / `if (platform
  === 'ios')` branching duplicated across several files instead of
  expressed once.
- **Message Chains** — `props.route.params.item.details.address.city`
  style chains through navigation params or nested API responses.
