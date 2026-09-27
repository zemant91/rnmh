// Turns a run's recorded actions into a saved, replayable test case.
//   node <skill>/scripts/save-case.mjs <case-name> [--run <run-id>] [--force]
// Defaults to the currently active run (the one screen.mjs/act.mjs were just using).
// Use `--run <id>` to save from an older run — run ids are the folder names under
// .rnmh/app-driver/runs/ (sorted, so the newest sorts last).
import fs from 'node:fs';
import path from 'node:path';
import { RUNS, casePath } from './lib/paths.mjs';

const args = process.argv.slice(2);
const flags = new Set(args.filter(a => a.startsWith('--')));
const [name] = args.filter(a => !a.startsWith('--'));
const runIdx = args.indexOf('--run');
const runId = runIdx !== -1 ? args[runIdx + 1] : null;
const FORCE = flags.has('--force');
const fail = (msg) => { console.log('ERROR: ' + msg); process.exit(1); };

if (!name) fail('usage: node save-case.mjs <case-name> [--run <run-id>] [--force]');

const activeMarker = path.join(RUNS, '.active');
const id = runId || (fs.existsSync(activeMarker) ? fs.readFileSync(activeMarker, 'utf8').trim() : null);
if (!id) fail('no active run and no --run given — run screen.mjs/act.mjs first, or pass --run <id>');
const jsonlPath = path.join(RUNS, id, 'actions.jsonl');
if (!fs.existsSync(jsonlPath)) fail(`no actions.jsonl for run ${id} (${jsonlPath})`);

const entries = fs.readFileSync(jsonlPath, 'utf8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l));
const steps = entries.filter(e => e.cmd).map(e => {
  const step = { cmd: e.cmd, target: e.target };
  if (e.arg !== undefined) step.arg = e.arg;
  const flags = {};
  if (e.flags?.long) flags.long = true;
  if (e.flags?.direct) flags.direct = true;
  if (e.flags?.confirm) flags.confirm = true;
  if (Object.keys(flags).length) step.flags = flags;
  step.expectRoute = e.afterRoute;
  return step;
});
if (!steps.length) fail(`run ${id} has no actions (only look/screen calls) — nothing to save`);

const file = casePath(name);
if (fs.existsSync(file) && !FORCE) fail(`${file} already exists — pass --force to overwrite`);

const needsConfirm = steps.some(s => s.flags?.confirm);
fs.writeFileSync(file, JSON.stringify({
  name,
  createdAt: new Date().toISOString(),
  createdFromRun: id,
  needsConfirm,
  steps,
  expectFinalRoute: steps[steps.length - 1].expectRoute,
}, null, 2) + '\n');

console.log(`Saved ${steps.length} step(s) from run ${id} → ${file}`);
if (needsConfirm) console.log('Note: this case includes a confirmed (data-changing) step — replay it with `run-case.mjs --confirm-all`.');
