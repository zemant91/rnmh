// Replays a saved case step by step, as a regression check.
//   node <skill>/scripts/run-case.mjs <case-name> [--confirm-all]
// If the case has a `setup` (see save-case.mjs), it runs first: an optional deep
// link, then optional setup actions — neither is assertion-checked (getting to the
// right state matters, not the exact path) but a failure there still aborts the
// whole run, since nothing after it can be trusted to start from the right place.
// Exits 0 if every step passed and the final route (if recorded) matched;
// exits 1 on the first failed/skipped step, or 2 if it never got to run
// (missing case, missing app driver, etc). The exit code is what a future
// CI step (ci-cd-pipeline) would gate on.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { casePath } from './lib/paths.mjs';

const args = process.argv.slice(2);
const [name] = args.filter(a => !a.startsWith('--'));
const CONFIRM_ALL = args.includes('--confirm-all');
const fail = (msg, code = 2) => { console.log('ERROR: ' + msg); process.exit(code); };
if (!name) fail('usage: node run-case.mjs <case-name> [--confirm-all]');

const file = casePath(name);
if (!fs.existsSync(file)) fail(`no saved case "${name}" (${file})`);
const kase = JSON.parse(fs.readFileSync(file, 'utf8'));
if (kase.needsConfirm && !CONFIRM_ALL) fail(`case "${name}" replays a confirmed (data-changing) step — re-run with --confirm-all after checking that's still safe on this app state`);

// A path, not a URL: `node file:///…` isn't a runnable entry point.
const actMjs = fileURLToPath(new URL('./act.mjs', import.meta.url));

function runStep(step, { assertRoute }) {
  const argv = [actMjs, step.cmd, step.target];
  if (step.arg !== undefined) argv.push(String(step.arg));
  if (step.flags?.long) argv.push('--long');
  if (step.flags?.direct) argv.push('--direct');
  if (step.flags?.confirm && CONFIRM_ALL) argv.push('--confirm');

  let stdout, status = 0;
  try {
    stdout = execFileSync('node', argv, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    stdout = e.stdout ?? '';
    status = e.status ?? 1;
  }
  if (status !== 0) return { ok: false, reason: stdout.trim() || `exit ${status}` };
  // Setup steps aren't assertion-checked (see header): an already-there tap is fine.
  if (assertRoute && /WARNING: screen did not change/.test(stdout)) return { ok: false, reason: 'screen did not change' };
  const route = stdout.match(/^screen: (.+)$/m)?.[1];
  if (assertRoute && step.expectRoute && route !== step.expectRoute) {
    return { ok: false, reason: `expected route "${step.expectRoute}", got "${route}"` };
  }
  return { ok: true, route };
}

if (kase.setup?.deepLink) {
  console.log(`setup: opening deep link ${kase.setup.deepLink}`);
  let udid;
  try {
    udid = process.env.SIM_UDID || Object.values(JSON.parse(execFileSync('xcrun', ['simctl', 'list', 'devices', 'booted', '-j'])).devices)
      .flat().find(d => d.state === 'Booted')?.udid;
  } catch (e) {
    fail(`setup: couldn't list simulators (${e.message}) — is Xcode/xcrun installed?`);
  }
  if (!udid) fail('setup: no booted iOS simulator (set SIM_UDID or boot one)');
  try {
    execFileSync('xcrun', ['simctl', 'openurl', udid, kase.setup.deepLink], { stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    fail(`setup: deep link failed: ${e.stderr?.toString().trim() || e.message}`);
  }
}

if (kase.setup?.actions?.length) {
  console.log(`setup: replaying ${kase.setup.actions.length} action(s) from run ${kase.setup.fromRun}`);
  for (let i = 0; i < kase.setup.actions.length; i++) {
    const step = kase.setup.actions[i];
    const result = runStep(step, { assertRoute: false });
    if (!result.ok) fail(`setup step ${i + 1}/${kase.setup.actions.length} (${step.cmd} ${step.target}) failed: ${result.reason}`, 1);
    console.log(`setup ${i + 1}/${kase.setup.actions.length} (${step.cmd} ${step.target}) → ${result.route}`);
  }
}

let allPass = true;
for (let i = 0; i < kase.steps.length; i++) {
  const step = kase.steps[i];
  const result = runStep(step, { assertRoute: true });
  if (!result.ok) {
    console.log(`FAIL step ${i + 1}/${kase.steps.length} (${step.cmd} ${step.target}): ${result.reason}`);
    allPass = false;
    break;
  }
  console.log(`PASS step ${i + 1}/${kase.steps.length} (${step.cmd} ${step.target}) → ${result.route}`);
}

if (allPass) {
  console.log(`PASS: "${name}" — ${kase.steps.length} step(s)`);
  process.exit(0);
} else {
  console.log(`FAILED: "${name}"`);
  process.exit(1);
}
