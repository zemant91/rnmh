// Replays a saved case step by step, as a regression check.
//   node <skill>/scripts/run-case.mjs <case-name> [--confirm-all]
// Exits 0 if every step passed and the final route (if recorded) matched;
// exits 1 on the first failed/skipped step, or 2 if it never got to run
// (missing case, missing app driver, etc). The exit code is what a future
// CI step (ci-cd-pipeline) would gate on.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
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

const actMjs = new URL('./act.mjs', import.meta.url);
let allPass = true;

for (let i = 0; i < kase.steps.length; i++) {
  const step = kase.steps[i];
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

  if (status !== 0) {
    console.log(`FAIL step ${i + 1}/${kase.steps.length} (${step.cmd} ${step.target}): ${stdout.trim() || `exit ${status}`}`);
    allPass = false;
    break;
  }
  if (/WARNING: screen did not change/.test(stdout)) {
    console.log(`FAIL step ${i + 1}/${kase.steps.length} (${step.cmd} ${step.target}): screen did not change`);
    allPass = false;
    break;
  }
  const route = stdout.match(/^screen: (.+)$/m)?.[1];
  if (step.expectRoute && route !== step.expectRoute) {
    console.log(`FAIL step ${i + 1}/${kase.steps.length} (${step.cmd} ${step.target}): expected route "${step.expectRoute}", got "${route}"`);
    allPass = false;
    break;
  }
  console.log(`PASS step ${i + 1}/${kase.steps.length} (${step.cmd} ${step.target}) → ${route}`);
}

if (allPass) {
  console.log(`PASS: "${name}" — ${kase.steps.length} step(s)`);
  process.exit(0);
} else {
  console.log(`FAILED: "${name}"`);
  process.exit(1);
}
