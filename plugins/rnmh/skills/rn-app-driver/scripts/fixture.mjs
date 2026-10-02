// Lists or loads the app's test fixtures (named, disposable starting states) over Hermes.
//   node <skill>/scripts/fixture.mjs list
//   node <skill>/scripts/fixture.mjs load <name>
// The app provides them through the dev-only `globalThis.__rnmhFixtures` hook that the
// `test-fixtures` skill generates (contract: test-fixtures/references/runtime-contract.md).
// Loading resets the app's data to that fixture through the app's own APIs, so whatever a
// test saved before is gone. After loading, the settled screen is printed like act.mjs does.
// Exit codes: 0 ok, 1 load failed / unknown fixture, 2 no hook or app not reachable.
import fs from 'node:fs';
import { connect } from './lib/cdp.mjs';
import { settle, sleep } from './lib/snapshot.mjs';
import { out, activeRunDir } from './lib/paths.mjs';

const [cmd, name] = process.argv.slice(2).filter(a => !a.startsWith('--'));
const fail = (msg, code = 1) => { console.log('ERROR: ' + msg); process.exit(code); };
if (!['list', 'load'].includes(cmd) || (cmd === 'load' && !name)) fail('usage: fixture.mjs list | fixture.mjs load <name>', 2);

let conn;
try { conn = await connect(); } catch (e) { fail(e.message, 2); }
const { evaluate, close } = conn;

const hook = await evaluate(`JSON.stringify(globalThis.__rnmhFixtures ? { version: globalThis.__rnmhFixtures.version } : null)`);
const info = JSON.parse(hook);
if (!info) {
  close();
  fail('this app has no fixtures hook (globalThis.__rnmhFixtures). Generate fixtures with the `test-fixtures` skill, '
     + 'or continue without one and say so in the report: data-changing taps then act on real app data.', 2);
}
if (info.version !== 1) { close(); fail(`fixtures hook version ${info.version} — this driver understands version 1`, 2); }

if (cmd === 'list') {
  const list = JSON.parse(await evaluate('JSON.stringify(globalThis.__rnmhFixtures.list())'));
  if (!list.length) console.log('(no fixtures registered)');
  for (const f of list) console.log(`${f.name.padEnd(28)} ${f.description ?? ''}`);
  close(); process.exit(0);
}

// load: start the async load in the app, then poll for its result (CDP evaluate here doesn't await promises).
await evaluate(`(() => {
  globalThis.__rnmhFixtureResult = undefined;
  Promise.resolve().then(() => globalThis.__rnmhFixtures.load(${JSON.stringify(name)})).then(
    r => { globalThis.__rnmhFixtureResult = { ok: true, summary: r && r.summary }; },
    e => { globalThis.__rnmhFixtureResult = { ok: false, error: String((e && e.message) || e) }; });
  return 'started';
})()`);

const deadline = Date.now() + 10000;
let result;
while (Date.now() < deadline) {
  const raw = await evaluate('JSON.stringify(globalThis.__rnmhFixtureResult ?? null)');
  result = JSON.parse(raw);
  if (result) break;
  await sleep(100);
}
if (!result) { close(); fail(`fixture "${name}" didn't finish loading within 10 s`); }

const { dir } = activeRunDir();
const ts = new Date().toISOString();
if (!result.ok) {
  fs.appendFileSync(`${dir}/actions.log`, `${ts} fixture ${name} FAILED: ${result.error}\n`);
  close(); fail(`fixture "${name}" failed to load: ${result.error}`);
}

const after = await settle(evaluate);
fs.writeFileSync(out('screen.txt'), after.text);
fs.appendFileSync(`${dir}/actions.log`, `${ts} fixture ${name} -> ${after.route}\n`);
fs.appendFileSync(`${dir}/actions.jsonl`, JSON.stringify({ ts, type: 'fixture', fixture: name, afterRoute: after.route }) + '\n');
console.log(`Loaded fixture "${name}"${result.summary ? ` — ${result.summary}` : ''}`);
console.log(after.text + `\n— settled in ${after.settledIn}ms${after.stable ? '' : ' (still changing)'}`);
close(); process.exit(0);
