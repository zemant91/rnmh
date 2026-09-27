// Where the driver keeps its state. Everything is relative to the project the agent works in (cwd),
// never inside the plugin folder, which may be read-only or shared between projects.
//
// Layout:
//   .rnmh/app-driver/screen.txt          latest snapshot (convenience copy, always current screen)
//   .rnmh/app-driver/runs/.active        id of the run currently being appended to
//   .rnmh/app-driver/runs/<id>/          one exploration/verification session
//     actions.log                        human-readable, one line per action (same format as before)
//     actions.jsonl                      structured, one JSON object per line — what save-case.mjs reads
//   .rnmh/app-driver/cases/<name>.json   a saved, replayable sequence of steps (see save-case.mjs / run-case.mjs)
import fs from 'node:fs';
import path from 'node:path';

export const OUT = process.env.RN_APP_DRIVER_OUT || path.join(process.cwd(), '.rnmh', 'app-driver');
fs.mkdirSync(OUT, { recursive: true });
export const out = name => path.join(OUT, name);

export const RUNS = path.join(OUT, 'runs');
export const CASES = path.join(OUT, 'cases');
const ACTIVE_MARKER = path.join(RUNS, '.active');

// Timestamp used as a run id: sortable, filesystem-safe, no colons.
function runId() {
  return new Date().toISOString().replace(/[:.]/g, '-').replace('Z', '');
}

// Starts a fresh run and makes it the active one. screen.mjs calls this every time it runs —
// per the skill's own loop, screen.mjs marks the start of a new look-act-check session.
export function startRun() {
  const id = runId();
  fs.mkdirSync(path.join(RUNS, id), { recursive: true });
  fs.writeFileSync(ACTIVE_MARKER, id);
  return id;
}

// The run actions append to. Falls back to starting one if act.mjs is ever called
// with no prior screen.mjs in this process's lifetime (defensive, not the normal path).
export function activeRunDir() {
  let id = fs.existsSync(ACTIVE_MARKER) ? fs.readFileSync(ACTIVE_MARKER, 'utf8').trim() : null;
  if (!id || !fs.existsSync(path.join(RUNS, id))) id = startRun();
  const dir = path.join(RUNS, id);
  fs.mkdirSync(path.join(dir, 'shots'), { recursive: true });
  return { id, dir };
}

export function casePath(name) {
  fs.mkdirSync(CASES, { recursive: true });
  return path.join(CASES, `${name}.json`);
}

// Project override: .rnmh/app-driver-policy.json in the project root; otherwise the plugin default.
export function loadPolicy() {
  const project = path.join(process.cwd(), '.rnmh', 'app-driver-policy.json');
  const file = fs.existsSync(project) ? project : new URL('../policy.default.json', import.meta.url);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
