# Backlog

Ideas worth doing but not designed or scheduled yet — as opposed to
`harness-verification.md` (checks against real usage) or the README's
Roadmap (what's already built). An entry here moves to the roadmap once
it's actually been designed and built, not before.

## rn-app-driver: storage-level seeding for saved cases

Cases can already declare setup (`--setup-run`, `--deep-link`), but both
still reach the starting state through the app. Most on-device flakiness
in the first feature-pipeline run came from getting the app into the
exact state and data a check needs.

- Default to seeding the app's local storage before launch, so the app
  starts in the case's state without depending on the screens under test.
- Keep the debug-only deep link for state that lives on a server, so the
  seed goes through the same API the app uses.
- Each case names its fixture, so a failure says which state it started
  from.
- Source: LinkedIn feedback on blog post #2.

## feature-pipeline: persist the report between runs

Each run's consolidated report currently ends in the chat, so the next
run rediscovers the same issues.

- Write the report (open recommendations, what was applied) to a file
  under `.rnmh/` in the project; the next run reads it first.
- Pairs with the planned iterate-on-own-recommendations loop, which
  conflicts with the current "never re-runs its own review pass" rule.
  Revisit that rule as part of this.
