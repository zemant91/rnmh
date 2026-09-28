// Turns a run's recorded actions into a saved, replayable test case.
//   node <skill>/scripts/save-case.mjs <case-name> [--run <run-id>] [--force]
//     [--setup-run <run-id>] [--deep-link <url>]
// Defaults to the currently active run (the one screen.mjs/act.mjs were just using).
// Use `--run <id>` to save from an older run — run ids are the folder names under
// .rnmh/app-driver/runs/ (sorted, so the newest sorts last).
//
// --setup-run <id>   an earlier run whose actions get the app into the state this
//                     case needs (e.g. navigate to a known screen, tap a debug-menu
//                     reset button) — replayed once before the case's own steps,
//                     with no route assertions (getting there matters, not the path).
// --deep-link <url>  opened via `xcrun simctl openurl` before --setup-run's actions,
//                     if the app handles deep links into a specific state directly.
// There's no direct-storage-reset option on purpose: that would need per-project
// knowledge of the storage engine/schema, which breaks the "only act through what
// the app's own interface exposes" rule everything else here follows.
import fs from 'node:fs';
import path from 'node:path';
import { RUNS, casePath } from './lib/paths.mjs';

const args = process.argv.slice(2);
const flags = new Set(args.filter(a => a.startsWith('--')));
const [name] = args.filter(a => !a.startsWith('--'));
const flagValue = (flag) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : null; };
const runId = flagValue('--run');
const setupRunId = flagValue('--setup-run');
const deepLink = flagValue('--deep-link');
const FORCE = flags.has('--force');
const fail = (msg) => { console.log('ERROR: ' + msg); process.exit(1); };

if (!name) fail('usage: node save-case.mjs <case-name> [--run <id>] [--setup-run <id>] [--deep-link <url>] [--force]');

const activeMarker = path.join(RUNS, '.active');
const activeId = fs.existsSync(activeMarker) ? fs.readFileSync(activeMarker, 'utf8').trim() : null;

function loadActions(id) {
  const jsonlPath = path.join(RUNS, id, 'actions.jsonl');
  if (!fs.existsSync(jsonlPath)) fail(`no actions.jsonl for run ${id} (${jsonlPath})`);
  return fs.readFileSync(jsonlPath, 'utf8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l))
    .filter(e => e.cmd)
    .map(e => {
      const step = { cmd: e.cmd, target: e.target };
      if (e.arg !== undefined) step.arg = e.arg;
      const stepFlags = {};
      if (e.flags?.long) stepFlags.long = true;
      if (e.flags?.direct) stepFlags.direct = true;
      if (e.flags?.confirm) stepFlags.confirm = true;
      if (Object.keys(stepFlags).length) step.flags = stepFlags;
      step.expectRoute = e.afterRoute;
      return step;
    });
}

const id = runId || activeId;
if (!id) fail('no active run and no --run given — run screen.mjs/act.mjs first, or pass --run <id>');
const steps = loadActions(id);
if (!steps.length) fail(`run ${id} has no actions (only look/screen calls) — nothing to save`);

let setupActions = null;
if (setupRunId) {
  setupActions = loadActions(setupRunId).map(({ expectRoute, ...s }) => s); // no assertions during setup
  if (!setupActions.length) fail(`--setup-run ${setupRunId} has no actions`);
}
const file = casePath(name);
if (fs.existsSync(file) && !FORCE) fail(`${file} already exists — pass --force to overwrite`);

const needsConfirm = steps.some(s => s.flags?.confirm) || (setupActions ?? []).some(s => s.flags?.confirm);
const kase = {
  name,
  createdAt: new Date().toISOString(),
  createdFromRun: id,
  needsConfirm,
  steps,
  expectFinalRoute: steps[steps.length - 1].expectRoute,
};
if (setupActions || deepLink) {
  kase.setup = {};
  if (deepLink) kase.setup.deepLink = deepLink;
  if (setupActions) { kase.setup.actions = setupActions; kase.setup.fromRun = setupRunId; }
}

fs.writeFileSync(file, JSON.stringify(kase, null, 2) + '\n');

console.log(`Saved ${steps.length} step(s) from run ${id} → ${file}`);
if (kase.setup) console.log(`Setup: ${deepLink ? `deep link ${deepLink}` : ''}${deepLink && setupActions ? ' + ' : ''}${setupActions ? `${setupActions.length} action(s) from run ${setupRunId}` : ''}`);
if (needsConfirm) console.log('Note: this case includes a confirmed (data-changing) step — replay it with `run-case.mjs --confirm-all`.');
