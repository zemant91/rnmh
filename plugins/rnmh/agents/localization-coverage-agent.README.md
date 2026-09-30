# localization-coverage-agent — how it works

## What it does

An unattended pass finding hardcoded user-facing strings that bypass a
project's existing i18n setup, and wiring them in. The rule that
overrides everything else: this agent only wires strings into an i18n
setup that **already exists** — if a project has no i18n wired up at all,
that absence itself is the finding, reported and stopped on, never fixed
by installing and choosing a library (that's a project-level decision for
the interactive `localization` skill).

## How it works — the safety protocol

```
1. Boundary — only the file(s)/module/PR diff specified
        │
        ▼
2. CONFIRM an i18n setup already exists (library, locale file,
   key convention) — none? → stop, recommend only
        │
        ▼
3. Only extract where the correct key name/placement is UNAMBIGUOUS
   from the existing convention — genuinely unclear naming? → recommend,
   don't guess
        │
        ▼
4. Verify every extraction — confirm the default-locale RENDERED
   OUTPUT is unchanged (trace the key back to the same text in the
   default-locale file) — same rigor test-coverage-agent applies to
   "does this test actually catch a failure," applied here to
   "does this extraction actually change nothing visible"
        │
        ▼
5. NEVER invent a translation for a non-default locale — add the
   real text to the default locale only; handle other locales per
   whatever the project's OWN missing-translation convention already
   is (never invented here, and never fake-filled with copied English
   text, which would hide the gap instead of surfacing it)
        │
        ▼
6. One commit per file/module
        │
        ▼
7. Stop and only RECOMMEND when: key naming is ambiguous, a string
   needs interpolation with unclear syntax, it's unclear whether
   something is even user-facing, or fixing it needs an RTL/layout
   change rather than a string swap
```

## When to reach for it

- A broader i18n-coverage sweep than an interactive session — a whole
  module or PR at once.
- `feature-pipeline`'s review pass invokes the matching instrumentation
  agent when the checkpoint flagged localization as in scope.

## Worked example

**Input:**
> Check the new Favorites screen for hardcoded strings.

**What the agent does:**

1. **Confirm setup exists:** finds `i18next` already wired up, with
   nested-namespace keys under `locales/en/<screen>.json` — a real,
   established convention to copy.
2. **Scan for candidates:** finds three: the screen title `"Favorites"`,
   the empty-state message `"No favorites yet — tap the star on a
   workout to save it here"`, and — easy to miss — the star button's
   `accessibilityLabel`, currently hardcoded as `"Add to favorites"`.
3. **Unambiguous check:** all three map cleanly onto the existing
   `favorites` namespace convention (screens get their own namespace file)
   — no genuinely ambiguous naming here.
4. **Extract:** replaces each with a translation-key call
   (`t('favorites.title')`, `t('favorites.emptyState')`,
   `t('favorites.starButtonLabel')`), adds each key with its English text
   to `locales/en/favorites.json` — a new file, matching the existing
   per-screen namespace pattern.
5. **Verify:** confirms the rendered English output is byte-for-byte
   unchanged by tracing each key back to the exact original text now
   living in the locale file.
6. **Other locales:** the project already has a `locales/ru/` folder with
   a `TODO_TRANSLATE` marker convention for pending keys — adds the three
   new keys there with that marker, rather than inventing a different
   convention or (worse) copying the English text in as if translated.
7. **Commit:** "Localize: extract Favorites screen strings (title, empty
   state, accessibility label)."
8. **Report:**
   - **Applied**: three strings extracted into the `favorites` namespace,
     including the accessibility label that's easy to miss since it's
     not visually rendered. English output confirmed unchanged. Russian
     entries added with the project's existing `TODO_TRANSLATE` marker.
   - **Recommended, not applied**: none this pass — every candidate found
     mapped cleanly onto the existing convention.

**Output:** three strings now properly localizable, with the missing
Russian translations honestly marked as pending rather than silently
left in English or faked.
