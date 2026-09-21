# Conventions log

A running record of naming/structure decisions made along the way, across
the projects this harness works on — not an upfront architecture document,
and not copied from any single project's own docs. An entry exists here
only once a real decision was actually made — never a speculative
"best practice" added ahead of time. The point of this file is to carry the
decision so nobody has to remember or re-decide it: not the user, and not
whichever skill/agent is writing code in a given project next.

## How this file is used

- Code-writing skills/agents in this harness (starting with
  `project-bootstrap`) read this file before generating new code in any
  project, and follow whatever already applies here instead of re-deciding
  or silently drifting.
- `cross-project-consistency`, when it finds two projects solving the same
  kind of problem differently (its "divergent solutions" category), asks
  the user to decide once, then appends the resolution here as a new entry
  — so the next project, or the next session, doesn't have to ask again.
- Any skill/agent in this harness can append a new entry the moment a
  decision naturally comes up in conversation, in any project. This file
  is meant to grow continuously in small additions, not be filled in one
  sitting.
- Nothing here is permanent by default — if a past decision stops making
  sense, say so explicitly and update or remove the entry, with a note on
  why it changed, rather than leaving stale and contradicted guidance in
  place.

## Format for an entry

One line per decision: dated, naming the concept, stating the decision,
and (optionally) which project raised it.

```
YYYY-MM-DD — <concept>: <decision>. (raised in: <project>)
```

Keep entries scoped to naming/structure/convention-level decisions — not
full architectural write-ups (those don't belong in this harness at all,
per the user's preference to make those calls himself, case by case).

## Decisions

_(none recorded yet — the first entry gets added here the next time a
naming/structure decision actually comes up, whether through
`cross-project-consistency` or directly in conversation)_
