# localization — how it works

## What it does

Sets up or maintains translations for a bare RN + TypeScript app — wiring
an i18n library, adding a locale, extracting hardcoded user-facing
strings into translation keys, handling pluralization correctly across
languages (not just English's one/other), and locale-specific
date/number/currency formatting and RTL layout. Interactive,
one-exchange-at-a-time. For an unattended sweep finding hardcoded strings
across a whole module/PR, see `localization-coverage-agent` instead.

## How it works — the flow

```
1. Detect the existing i18n setup (library, locale-file location,
   key-naming convention) — follow it. None exists? Ask before
   picking one; never default silently.
        │
        ▼
2. Confirm scope (which screen/component/PR)
        │
        ▼
3. Identify every user-facing string in scope — INCLUDING
   accessibility labels (easy to miss, not visually rendered).
   Out of scope: logs, internal error codes, analytics event names.
        │
        ▼
4. For each new string: name the key per convention, add the
   default-locale value, route it through the project's own
   "missing translation" convention — don't invent one
        │
        ▼
5. Pluralization & interpolation → ALWAYS through the library's own
   mechanism (CLDR plural categories), never hand-built count===1
   branching — that only covers English's two-form system
        │
        ▼
6. RTL in scope? → logical start/end properties, not hardcoded
   left/right; mirror direction-encoding icons explicitly
        │
        ▼
7. Report: keys added, which locales got real translations vs. are
   pending, anything ambiguous flagged (brand name? mixed dynamic text?)
```

## The recurring trap this skill exists to catch

English's plural system (one/other) is not universal — Russian-family
languages have one/few/many/other with different number ranges, some
languages have only one form. A `count === 1 ? "item" : "items"` ternary
silently breaks for every locale that doesn't match English's rule. The
fix is always to route through whatever CLDR-aware mechanism the already-
installed i18n library provides, never to hand-roll the branching.

## When to reach for it

- Setting up i18n for the first time, or adding a new locale.
- Reviewing a new screen for hardcoded strings before merge.
- Handling plurals or locale-specific formatting.
- Adding RTL support.

## Worked example

**Input:**
> "Add a Russian locale to PocketSpotter, and there's a new 'X reps left'
> counter on the workout screen that needs to be translatable."

**What the skill does:**

1. **Detect setup:** finds the project already uses `i18next` with
   nested-namespace keys under `locales/en/workout.json`. Follows that
   structure rather than introducing flat dotted keys.
2. **Scope:** the workout screen's new rep counter, plus checks for other
   hardcoded strings on that screen while it's in scope.
3. **Identify strings:** finds `"X reps left"`, a "Start" button label,
   and — easy to miss — the counter's `accessibilityLabel`, which is
   currently hardcoded English text separate from the visible label.
4. **New keys:** adds `workout.repsLeft`, `workout.start` under the
   existing namespace convention, with English defaults.
5. **Pluralization:** "X reps left" needs to handle English's one/other
   AND Russian's one/few/many/other for the same count — uses i18next's
   count-based key suffixes (`repsLeft_one`, `repsLeft_few`,
   `repsLeft_many`, `repsLeft_other`) rather than a single template with
   manual branching, so both languages' real plural rules are respected.
6. **RTL:** not in scope — Russian isn't an RTL language, so this section
   is skipped and noted as not applicable.
7. **Report:** "Added `workout.repsLeft` (4 plural forms) and
   `workout.start` to the `workout` namespace, including the previously-
   hardcoded accessibility label. English values filled in; Russian
   values still pending — flagging per this project's existing convention
   (a `TODO_TRANSLATE` marker) rather than leaving the key silently
   English-only."

**Output:** a new locale wired up the way the project already does i18n,
with plural forms that will actually display correctly in Russian instead
of just working for the English case that was easiest to test.
