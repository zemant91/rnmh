---
name: "localization"
description: "Use when setting up or maintaining translations for a bare React Native + TypeScript app — wiring up an i18n library, adding a locale, extracting hardcoded user-facing strings into translation keys, handling pluralization, and locale-specific date/number/currency formatting and RTL layout. For an unattended pass finding hardcoded/untranslated strings across a module or PR, see the `localization-coverage-agent` subagent instead."
---

# Localization / i18n (bare React Native + TypeScript)

## When to use
- Setting up i18n for the first time in a project.
- Adding a new locale to a project that already has i18n wired up.
- Reviewing a new screen/component for hardcoded strings before merging.
- Handling pluralization or locale-specific date/number/currency formatting.
- Adding RTL support for a locale that needs it.

This skill is for interactive, in-conversation work — one exchange at a
time. For an unattended sweep across a larger area, see the
`localization-coverage-agent` subagent instead.

## Check what's already there before assuming a setup

Detect the project's existing i18n setup rather than assuming one: grep for
an i18n library already in use (e.g. i18next/react-i18next, react-intl,
LinguiJS — there are several viable ones, none is assumed here), locale
file locations, and the key-naming convention already in use (nested
namespaces vs. flat dotted keys). Follow the existing convention rather
than introducing a second style.

If there is no i18n setup at all yet, say so explicitly and ask which
library before wiring one up — this skill doesn't default to one on the
user's behalf, the same stance `project-bootstrap` takes on navigation/state
libraries. Note for device locale/RTL detection specifically: bare RN has
no access to Expo's `expo-localization` — that needs a native-capable
alternative such as `react-native-localize`, not an Expo-only package.

## What counts as a hardcoded string worth extracting

- User-facing text: labels, buttons, alerts, error/empty-state messages,
  screen titles, placeholder text — and **accessibility labels/hints**,
  which are easy to miss since they're not visually rendered.
- Not in scope: log/debug output, internal error codes, code comments,
  analytics event names, configuration keys.
- Ambiguous, confirm rather than assume: brand/product names (usually kept
  as-is across locales, not translated by default); strings mixing static
  text with dynamic values — these need the library's interpolation syntax
  in one template key, not string concatenation, since word order and
  where a value falls in a sentence both vary by language.

## Pluralization — don't hardcode a 2-form (English) assumption

Languages don't all have the same plural categories English does (one/
other) — Russian and other Slavic languages have one/few/many/other with
different number ranges per category; some languages have only one form.
This is the CLDR plural-rules model that most i18n libraries implement
under the hood. Whatever library is already in the project, use its
pluralization mechanism (e.g. i18next's count-based key suffixes, ICU
MessageFormat `plural` syntax) rather than building `count === 1 ? x : y`
logic by hand per string — that only ever covers the English case and
silently breaks for every locale with a different plural system.

## Locale-specific formatting

Use `Intl` (`Intl.DateTimeFormat`, `Intl.NumberFormat`) or the project's
existing formatting library rather than hand-building date/number/currency
strings — digit grouping, decimal separator, date field order, and currency
symbol placement all vary by locale and aren't safe to assume from one
locale's format.

RN-specific gotcha: `Intl` support on Hermes has historically been
incomplete depending on the RN/Hermes version (some builds shipped without
full locale data unless a build flag or polyfill was added). Verify actual
`Intl` behavior in this project before relying on it — don't assume full
support just because the API exists — and flag a polyfill
(e.g. `@formatjs/intl-*` polyfills) as the fix if it's missing rather than
falling back to manual formatting.

## RTL support

- Use RN's `I18nManager` (`isRTL`, `forceRTL`) and logical style properties
  (`start`/`end`) instead of hardcoded `left`/`right` — logical properties
  flip automatically, manual mirroring has to be redone at every call site
  and drifts out of sync.
- Forcing RTL via `I18nManager.forceRTL` typically requires an app
  reload/restart to take effect — it isn't a live runtime toggle; don't
  design a UI flow that assumes otherwise.
- Icons/images that encode direction (arrows, chevrons, "forward" affordances)
  need explicit mirroring — logical properties don't flip image content.
- Test an RTL locale explicitly rather than only visually inspecting an LTR
  layout and assuming it will mirror correctly.

## What NOT to do

- Don't concatenate translated fragments across languages — interpolate
  into one full template string instead, since word order isn't fixed
  across languages.
- Don't build ad hoc singular/plural branching per string.
- Don't assume every asset needs a locale variant — text baked into an
  image usually does, most icons don't.
- Don't silently pick an i18n library when none exists yet — ask first.
- Don't manually mirror `left`/`right` styles where a logical property
  would already flip automatically.

## Process

1. Detect the existing i18n setup (library, locale file location, key
   convention) — if none exists, ask before choosing one.
2. Confirm what's in scope: which screen/component/PR.
3. Identify every user-facing string in scope, including accessibility
   labels, and classify each as a new key or reuse of an existing one.
4. For each new key: name it per the existing convention, add the
   default-locale value, and handle other locales per however this project
   already tracks missing translations (placeholder marker vs. left absent)
   — don't invent that convention if one already exists, and ask if none
   does.
5. Route pluralization and interpolation through the library's own
   mechanism, never ad hoc string logic.
6. If RTL is in scope, confirm any layout touched uses logical properties,
   not hardcoded left/right.
7. Report: keys added, which locales got real translations vs. are left
   pending, and anything flagged as ambiguous (brand name, mixed dynamic
   content, unclear key placement) for the user to confirm.
