# security-review — how it works

## What it does

Reviews a bare RN app for how it handles sensitive data **on-device and
in transit** — not a general code-security audit (injection, auth-flow
logic, backend security are out of scope). Specific to the ways a mobile
app leaks or mishandles data: secrets in plain storage, sensitive fields
in logs, unencrypted local databases, an over-permissive WebView, a deep
link trusted without validation.

## How it works — the categories

```
1. Identify what's actually sensitive here first — auth tokens always
   count; beyond that depends on the app (health/financial/PII)
        │
        ▼
2. Work through each category against real code, not library choice alone:
     Secret/token storage    → Keychain/Keystore, not AsyncStorage;
                                no hardcoded keys in JS source
     Logging                 → no tokens/PII in console/crash payloads,
                                verbose logging actually off in release
     Local storage/encryption→ SQLCipher/MMKV encryption where data
                                is sensitive at rest; clipboard hygiene
     Transport security      → HTTPS everywhere, no blanket-disabled
                                ATS, no sensitive data in URL query params
     WebViews & deep links   → restricted origins/JS bridge scope;
                                deep-link params treated as untrusted input
     Screen/session exposure → app-switcher snapshot blur, re-auth timing
     Third-party SDKs        → what they actually collect vs. what the
                                privacy disclosures claim
        │
        ▼
3. Report in three SEPARATE buckets: handled correctly / concrete finding
   (with file + exploit risk) / judgment call worth flagging (not
   necessarily wrong) — never collapsed into one list
```

## What it deliberately doesn't do

Doesn't recommend jailbreak/root detection or anti-tampering by default —
real UX cost, only worth it for apps whose threat model calls for it.
Doesn't treat Hermes bytecode or ProGuard/R8 obfuscation as security —
they raise reverse-engineering effort, they don't make a hardcoded secret
or a plain database safe.

## When to reach for it

- Before an app handling sensitive data (tokens, health, financial, PII)
  is trusted with real user data, or periodically as it grows.
- After adding a new third-party SDK, a WebView, or deep-link handling.

## Worked example

**Input:**
> "PocketSpotter just added Apple Health sync and a 'share workout' deep
> link — review it before we ship."

**What the skill does:**

1. **Scope:** identifies Apple Health data as sensitive (health data) and
   the new deep link as an attack-surface change — both get real scrutiny;
   generic UI code doesn't.
2. **Secret/token storage:** checks how the HealthKit auth token (if any)
   is stored — finds it's sitting in `AsyncStorage` alongside app
   settings. **Concrete finding**: unencrypted plain storage for a health
   credential; recommends `react-native-keychain`.
3. **Logging:** greps for `console.log` calls near the Health sync code —
   finds one that logs the full synced workout payload including
   timestamps and heart-rate data in dev builds. Confirms it's actually
   stripped in the release build config (it is) — notes this as handled
   correctly, not a finding.
4. **Local storage:** the app caches synced Health data in a local SQLite
   DB for offline view — checks whether it's encrypted. It isn't.
   **Concrete finding**: health data at rest, unencrypted — recommends
   SQLCipher.
5. **Deep links:** the new `pocketspotter://share?workout=<id>` link
   currently trusts `workout=<id>` and navigates straight to that
   workout's detail screen with no validation. **Concrete finding**:
   treats this as untrusted input — a malicious link could pass a
   non-existent or another user's ID; recommends validating the ID exists
   and belongs to the current user before navigating.
6. **Judgment call:** notes no re-auth-after-backgrounding is set up for
   the Health data screen — flags this explicitly as a call for the user
   to make given PocketSpotter's actual sensitivity level, not a
   pass/fail finding.

**Report:**
> Handled correctly: release logging is stripped of the raw payload.
> Findings: (1) Health token in AsyncStorage, unencrypted — move to
> Keychain. (2) Cached Health data in SQLite, unencrypted at rest — add
> SQLCipher. (3) Deep-link `workout` param unvalidated — treat as
> untrusted input, verify ownership before navigating.
> Judgment call: no re-auth timer on the Health screen — worth deciding
> given the data's sensitivity, not necessarily a gap.

**Output:** a scoped review that tells apart an actual security gap from
a deliberate trade-off — not a flat list mixing the two.
