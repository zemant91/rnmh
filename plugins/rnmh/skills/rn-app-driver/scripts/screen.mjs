// Prints the compact view of the current RN screen, remembers it for act.mjs,
// and starts a new run (this skill's loop treats a fresh screen.mjs call as the
// start of a new exploration/verification session — see lib/paths.mjs).
// Usage (from the app's project root): node <skill>/scripts/screen.mjs
import fs from 'node:fs';
import { connect } from './lib/cdp.mjs';
import { snapshot } from './lib/snapshot.mjs';
import { out, startRun, activeRunDir } from './lib/paths.mjs';
try {
  const { evaluate, close } = await connect();
  const s = await snapshot(evaluate);
  fs.writeFileSync(out('screen.txt'), s.text);
  const runId = startRun();
  const { dir } = activeRunDir();
  fs.appendFileSync(`${dir}/actions.log`, `${new Date().toISOString()} look ${s.route}\n`);
  fs.appendFileSync(`${dir}/actions.jsonl`, JSON.stringify({ ts: new Date().toISOString(), type: 'look', route: s.route, chars: s.text.length }) + '\n');
  console.log(s.text + `\n— ${s.text.length} chars, ${s.ms}ms (run ${runId})`);
  close(); process.exit(0);
} catch (e) { console.log('ERROR: ' + e.message); process.exit(1); }
