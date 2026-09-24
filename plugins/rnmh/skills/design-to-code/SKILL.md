---
name: "design-to-code"
description: "Use when analyzing a UI reference (Dribbble/Mobbin link, screenshot, photo, Figma frame) or building/reviewing mobile screens for bare React Native — breaks the reference into portable design decisions, flags generic/repetitive patterns, and keeps different apps visually distinct."
---

# Reference breakdown and non-generic mobile UI (bare React Native)

## When to use
- The user shared a reference (Dribbble/Mobbin/Behance link, screenshot, photo of a screen, Figma frame) and wants it broken down or something similar built.
- The user asks to make any screen "beautiful/non-standard" with no reference given — in that case, first suggest 1-2 directions/references instead of jumping straight into a default layout.
- Building or reviewing a UI component/flow in any bare RN project — use this alongside that project's own instructions, not instead of them.

## User context
- Bare React Native + TypeScript, no Expo (dislikes Expo's paid tiers/ecosystem) — never suggest Expo-only libraries (expo-blur, etc.) without explicit confirmation.
- Some projects have grown their own shared/UI-kit package — check whether
  this project has one and whether it already covers the need before
  reaching for a third-party design system (Tamagui/NativeWind), unless
  asked otherwise. Don't assume one exists or guess its name; verify in
  this project.
- Runs several mobile apps in parallel — it matters that they don't converge into one "house style"; each should feel like its own thing.

## Step 1 — Break down the reference
For each reference, pull out explicitly, in a compact block:
1. **Grid and spacing** — outer margins, card/container radius, where elements sit flush, where there's deliberate breathing room.
2. **Palette** — how many colors are actually in use (usually 2-3, rarely more), which is dominant/accent/neutral, monochrome vs. contrast.
3. **Typography** — weight contrast, letter-spacing, caps vs. not, where text is part of the composition rather than just a label.
4. **The signature move** — the one concrete detail that makes the screen feel bespoke: an unusual photo mask/crop, asymmetry, layer overlap, an unexpected way of conveying depth (blur/glass/noise), a non-default button or input shape. A strong reference usually has 1-2 such moves, not more — don't try to cram all of them into the build.
5. **Material/texture** — flat color vs. gradient vs. blur vs. noise vs. photo.
6. **Emotional brief** — 2-3 words for what the user should feel (calm, speed, luxury, playfulness) — this drives motion and timing, not just color.

Give an honest assessment of the reference, not just praise: if it's a generic lorem-ipsum concept with a basic layout, say so, and name exactly what makes it generic (the same card repeated on every screen with no variation, no states shown, clichés like flat fill + drop shadow on everything).

## Step 2 — Anti-slop checklist (default habits to catch and break)
Before proposing an implementation, check whether what's about to be suggested is just falling back on generic habits:
- [ ] Everything is a white/dark card with the same 12-16px border-radius and soft shadow on every screen, with no variation.
- [ ] The same accent color (usually blue/purple) on buttons regardless of the app's character.
- [ ] The card + shadow "widget" look applied identically to hero elements, list items, and modals alike.
- [ ] Icons — the same generic outline set (Feather/Ionicons default) with no consideration of the app's character.
- [ ] Motion limited to fade-in/slide-up, with no rotation/scale/spring bounce where the brand's emotion would call for it.
- [ ] Header + bottom tabs as the only navigation pattern considered, without weighing alternatives (segmented control, floating action, gesture-driven navigation).
- [ ] The same spacing scale (8/16/24) everywhere, with no large contrasting margins where extra air is part of the intended feel.
- [ ] Ignoring iOS/Android platform differences (native paddings, safe area, haptics, animation character).

If 3+ of these match what's about to be proposed, that's a signal to stop and deliberately pick a different move instead.

## Step 3 — Don't repeat the same move across projects
Several parallel RN apps are in play. Before proposing a "signature move" for a new screen:
- Check the conversation/project context for whether this same move (mask type, animation style, palette strategy) has already been used in another project.
- Prefer a different signature move (from Step 1) for different apps, rather than reusing the same trick (e.g. a circular photo mask) across every app just because it worked well once.
- If unclear, just ask: "there's already a similar move in another app — want something different here, or is the overlap fine?"

## Step 4 — Screen archetype and state coverage
Identify which archetype the screen belongs to (onboarding/welcome, auth, home/dashboard, list→detail, form/input, paywall/upgrade, settings/profile, empty state, search) — each archetype has known failure points worth checking for specifically.
A reference or a first-pass build that only shows the happy path is incomplete by default. Before calling a screen done, enumerate explicitly:
- Loading state
- Empty state (first-run, no data, no results)
- Error state (network failure, validation failure)
- Success/populated state
- Offline and permission-denied, where relevant (camera/location/notifications access)
Flag which of these the reference itself didn't show, and don't silently skip them when building — design them even if the reference didn't.

## Step 5 — Motion specification
Tie concrete Reanimated spring parameters to the emotional brief from Step 1, instead of picking timing arbitrarily:
- **Calm / luxury / trust** — high damping (20-30), moderate stiffness (90-120), longer duration (300-450ms), no overshoot.
- **Speed / energy** — lower damping (12-18), higher stiffness (150-220), short duration (150-250ms), slight overshoot acceptable.
- **Playful** — bouncy spring (damping 8-14, stiffness 120-180) with visible overshoot; consider staggered entrance for list items.
- **Professional / fintech / medical** — restrained, fixed-duration ease curves, avoid spring overshoot entirely — motion should feel precise, not fun.
State the chosen config explicitly when proposing an implementation, don't leave it as "add a nice animation."

## Step 6 — Accessibility minimums (non-negotiable regardless of reference)
A reference showing none of this is not an excuse to skip it in the build:
- Touch targets ≥ 44x44pt (iOS) / 48x48dp (Android), even when the reference draws them smaller.
- Text contrast ≥ 4.5:1 for body text, ≥ 3:1 for large text (WCAG AA).
- Support OS-level font scaling (Dynamic Type / Android font scale) — don't hardcode fixed pixel line-heights that clip at larger scale.
- Every interactive element gets an accessible label/role, not just a visual icon.
- Never rely on color alone to convey state (error/success) — pair it with an icon or text.

## Step 7 — Platform idioms (iOS vs Android)
Don't ship one identical UI on both platforms by default — name where they should diverge:
- Navigation gestures: iOS edge swipe-back vs Android back gesture/hardware back; sheet presentation style differs.
- System components: iOS action sheet vs Android bottom sheet/menu; switch and checkbox visual language differ.
- Haptics: iOS has a finer feedback vocabulary; use Android haptics more sparingly.
- Typography rendering: San Francisco vs Roboto/system font metrics differ at the same point size — verify rendered size on both, don't assume identical numbers look the same.
- Safe area / status bar handling: notch/Dynamic Island vs Android cutouts need separate handling.

## Step 8 — Translate into bare RN
When implementing, first lay out "move → how it's done in RN" explicitly, and only then write code:
- Mask/non-standard crop → `MaskedView` (`@react-native-masked-view/masked-view`), or borderRadius+overflow for simple shapes.
- Blur/glass → `@react-native-community/blur` (native, not Expo-only), or a Skia blur filter if Skia is already in the project.
- Gradients → `react-native-linear-gradient`.
- Letter-spacing/caps typography → native `letterSpacing`/`textTransform`, no extra library needed.
- Motion (spring, layout transitions, gesture-driven interactions) → Reanimated + Gesture Handler, not the Animated API — apply the spring config chosen in Step 5.
- Accessibility props (accessibilityLabel, accessibilityRole, accessible, minimum hit slop) — apply the minimums from Step 6 as part of the same pass, not as a later cleanup step.
- Components that already exist in the project's own shared/UI-kit package
  (if it has one) — check first, don't reinvent them.

## Step 8b — State the plan and wait before writing code
Before generating any implementation code, actively present the Step 8 mapping as a short plan rather than sliding straight into code: what's in scope for this pass (which screen(s)/component(s)/states from Step 4 are being built now), what's explicitly deferred or out of scope, and the move→technology choices from Step 8. Then wait for a go-ahead.

This is a conversational checkpoint, not a saved document — the point is to catch a scope mismatch (wrong screen, missing state, an unwanted library choice) before code exists, not to add process for its own sake. Skip the wait only when the user has already confirmed scope in the same message (e.g. "build exactly this, go ahead").

## Step 9 — Judging "fresh" vs "dated" — check live, don't rely on a fixed list
Don't keep a frozen list of "what's trendy" inside this skill — it goes stale within months and becomes exactly the kind of dated pattern this skill exists to catch. When the call between fresh and generic isn't obvious, or when asked what's currently well-regarded in a specific app category, do a quick web search or look at current shots on Mobbin/Dribbble in that category before asserting it from memory.

## Step 10 — Hand off instead of duplicating
Once an implementation is close to final, offer (don't force) a follow-up structured usability/hierarchy/consistency pass and a full accessibility audit beyond the minimums in Step 6, using whatever review capability is available in that context, rather than re-deriving that logic here.

## Output format when breaking down a reference
1. Breakdown (grid/palette/typography/signature move/material/emotion) — short, itemized.
2. Honest assessment of the reference (what's fresh, what's generic — verified live per Step 9 if the call isn't obvious).
3. Anti-slop check — which checklist items would have been a trap this time.
4. Archetype + state coverage — which states the reference shows and which are missing.
5. RN implementation plan — move→technology mapping (including motion config and accessibility props), presented as what's in/out of scope per Step 8b, with an explicit wait for confirmation before writing any code.
6. If several references come up in one session, explicitly note how they differ from each other and what shouldn't be combined into a single screen.
