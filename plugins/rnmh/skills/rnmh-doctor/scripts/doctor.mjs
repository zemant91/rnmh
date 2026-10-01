// rnmh-doctor: checks the local machine for everything this harness's
// real-execution skills actually depend on (not application code, not a
// specific project — run it from anywhere). Prints a grouped,
// human-readable report. Always exits 0: this is a diagnostic for a
// developer to read, not a gate that should fail a script depending on it.
// Usage: node <skill>/scripts/doctor.mjs
import { execFileSync } from 'node:child_process';
import os from 'node:os';

const isMac = process.platform === 'darwin';
const results = [];

function run(cmd, args) {
  try {
    const out = execFileSync(cmd, args, { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
    return { ok: true, out };
  } catch {
    return { ok: false, out: null };
  }
}

function check(group, name, { ok, detail, installHint, skipped, skipReason }) {
  results.push({ group, name, ok, detail, installHint, skipped, skipReason });
}

async function reachable(url) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch(url, { method: 'HEAD', signal: ctrl.signal });
    clearTimeout(t);
    return res.ok || res.status < 500;
  } catch {
    return false;
  }
}

// --- Core ---
check('Core', 'Platform', { ok: true, detail: `${process.platform} (${os.release()})` });

{
  const v = process.versions.node;
  const major = parseInt(v.split('.')[0], 10);
  check('Core', 'Node.js', {
    ok: major >= 18,
    detail: `v${v}`,
    installHint: 'nvm install --lts, or https://nodejs.org (need 18+; rn-app-driver wants 22+)',
  });
}

{
  const r = run('git', ['--version']);
  check('Core', 'git', {
    ok: r.ok,
    detail: r.out,
    installHint: isMac ? 'xcode-select --install' : 'install git for your OS',
  });
}

// --- rn-app-driver ---
{
  const r = run('axe', ['--version']);
  check('rn-app-driver', 'axe', {
    ok: r.ok,
    detail: r.out,
    installHint: 'brew install cameroncooke/axe/axe',
    skipped: !isMac,
    skipReason: 'macOS + iOS simulator only',
  });
}

{
  let bootedCount = null;
  let ok = false;
  if (isMac) {
    const r = run('xcrun', ['simctl', 'list', 'devices', '-j']);
    ok = r.ok;
    if (r.ok) {
      try {
        const data = JSON.parse(r.out);
        bootedCount = 0;
        for (const runtime of Object.values(data.devices || {})) {
          for (const d of runtime) if (d.state === 'Booted') bootedCount++;
        }
      } catch {
        bootedCount = null;
      }
    }
  }
  check('rn-app-driver', 'iOS simulator (xcrun/simctl)', {
    ok: isMac ? ok : null,
    detail: bootedCount === null ? null : `${bootedCount} booted`,
    installHint: 'install Xcode + command line tools (xcode-select --install)',
    skipped: !isMac,
    skipReason: 'macOS only',
  });
}

// --- ci-cd-pipeline (real Fastlane setup + basic store deploy) ---
{
  let r = run('fastlane', ['--version']);
  let via = 'global';
  if (!r.ok) {
    r = run('bundle', ['exec', 'fastlane', '--version']);
    via = 'bundler (Gemfile)';
  }
  check('ci-cd-pipeline', 'fastlane', {
    ok: r.ok,
    detail: r.ok ? `${r.out.split('\n')[0]} (${via})` : null,
    installHint: 'gem install fastlane, or add it to a Gemfile and run via bundler',
  });
}

{
  const r = run('pod', ['--version']);
  check('ci-cd-pipeline', 'CocoaPods', {
    ok: r.ok,
    detail: r.out,
    installHint: 'sudo gem install cocoapods, or: brew install cocoapods',
    skipped: !isMac,
    skipReason: 'macOS only (iOS native deps)',
  });
}

{
  const androidHome = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || null;
  const adb = androidHome ? run(`${androidHome}/platform-tools/adb`, ['version']) : { ok: false };
  check('ci-cd-pipeline', 'Android SDK (ANDROID_HOME + adb)', {
    ok: !!androidHome && adb.ok,
    detail: !androidHome
      ? null
      : adb.ok
        ? androidHome
        : `ANDROID_HOME is set (${androidHome}) but adb wasn't found there`,
    installHint: 'install Android Studio, then set ANDROID_HOME to its SDK path',
  });
}

// --- rn-library-research ---
const npmOk = await reachable('https://registry.npmjs.org/');
check('rn-library-research', 'npm registry reachable', {
  ok: npmOk,
  detail: npmOk ? 'reachable' : null,
  installHint: 'check network/proxy/VPN settings',
});

const ghOk = await reachable('https://api.github.com/');
check('rn-library-research', 'GitHub API reachable', {
  ok: ghOk,
  detail: ghOk ? 'reachable' : null,
  installHint: 'check network/proxy/VPN settings',
});

// --- Report ---
const groups = [...new Set(results.map((r) => r.group))];
const lines = [];
for (const g of groups) {
  lines.push(`\n${g}`);
  for (const r of results.filter((x) => x.group === g)) {
    if (r.skipped) {
      lines.push(`  ⚪ ${r.name} — skipped (${r.skipReason})`);
      continue;
    }
    const mark = r.ok ? '✅' : '❌';
    const detail = r.detail ? ` — ${r.detail}` : '';
    lines.push(`  ${mark} ${r.name}${detail}`);
    if (!r.ok && r.installHint) lines.push(`     install: ${r.installHint}`);
  }
}
console.log(lines.join('\n'));

const failed = results.filter((r) => !r.skipped && !r.ok);
console.log(
  `\n${failed.length === 0 ? 'All checked tools present.' : `${failed.length} gap(s) found — see install hints above.`}`
);
console.log(
  '\nThis checks the machine only. From inside an actual RN project, also run `npx react-native doctor` for project-specific toolchain checks (Watchman, JDK, the exact Xcode/Gradle versions this project needs) — rnmh-doctor deliberately doesn\'t duplicate that.'
);
process.exit(0);
