# performance-audit-agent — how it works

## What it does

An unattended performance-audit pass over a bare RN/TypeScript file,
module, or PR — but with a deliberately narrow "apply directly" set.
The rule that overrides everything else: **don't optimize without
evidence**. Most performance fixes need a profiler trace or a bundle-size
number to actually justify them, and this agent has no way to gather
those unattended — so it only fixes things that are correct and
beneficial *by inspection alone*, and reports everything else as a
measurement-needed recommendation.

## How it works — the mechanical set (the only things applied directly)

```
✓ FlatList/SectionList/FlashList missing keyExtractor, where the item
  type already has a genuinely stable unique field (never fabricated)
✓ An EXISTING getItemLayout whose math is demonstrably wrong for an
  already-fixed row height (fixing a bug in an existing optimization —
  never adding getItemLayout for a variable-height row)
✓ A useEffect with an unambiguous cleanup pairing already used
  elsewhere in the codebase (setInterval/clearInterval,
  addEventListener/removeEventListener) that's missing its cleanup
✓ A duplicate dependency version the project's OWN existing
  bundle-analysis tooling already flagged (never runs new analysis itself)

✗ React.memo/useMemo/useCallback — needs profiler evidence this agent
  can't produce unattended
✗ windowSize/maxToRenderPerBatch tuning — needs data-volume context
✗ Resizing/replacing images, swapping libraries — needs a human decision
✗ Hermes/New Architecture config — a project-wide toggle, not a file fix
```

Every applied fix is verified with a type-check/test run, reverted
immediately on failure, and committed one-per-file so the change history
stays reviewable.

## When to reach for it

- A broader unattended sweep than the interactive `performance-audit`
  skill.
- `feature-pipeline`'s review pass invokes it automatically on every run.

## Worked example

**Input (from feature-pipeline's review pass):**
> Performance pass on the new Favorites list.

**What the agent does:**

1. **Orient:** Globs/Greps the new `FavoritesScreen.tsx` and its list
   rendering.
2. **Mechanical check — keyExtractor:** the new `FlatList` uses array
   index as its key, and the favorited-workout data has a stable `id`
   field already used as a key elsewhere in the app. This is exactly the
   mechanical case — **applies** the fix, swapping index for `item.id`.
3. **Mechanical check — getItemLayout:** no `getItemLayout` exists on
   this list at all — since adding one from scratch isn't in the
   mechanical set (it needs a measurement judgment about whether rows are
   genuinely fixed-height), this is **not** applied — noted as a
   recommendation only if row height actually looks fixed.
4. **Mechanical check — cleanup:** the screen's `useFocusEffect`
   subscribes to a storage-change listener with `.subscribe()` but never
   calls `.remove()` on unmount — the codebase already uses this exact
   subscribe/remove pairing on three other screens. This matches the
   mechanical set exactly — **applies** the missing `.remove()` cleanup.
5. **Non-mechanical finding:** notices the row component re-renders on
   every list scroll due to an inline `onPress` — this needs a profiler
   trace to actually confirm the cost, which this agent can't produce
   unattended. **Not applied** — goes to recommendations.
6. **Verify + commit:** type-check passes after both mechanical fixes;
   one commit: "Perf: fix keyExtractor + add missing subscription
   cleanup on FavoritesScreen."
7. **Report:**
   - **Applied**: stable `id`-based `keyExtractor` (was array index);
     added missing `.remove()` cleanup on the storage-change subscription
     — both verified by type-check.
   - **Recommended, not applied**: row component re-renders on scroll due
     to an inline `onPress` — needs a profiler trace to confirm actual
     cost before memoizing; no `getItemLayout` — worth adding only if
     row height is confirmed genuinely fixed.

**Output:** two safe, evidence-free-by-nature fixes applied, and one
plausible-looking optimization correctly left as "needs a measurement"
instead of guessed at.
