// Prints the compact view of the current RN screen and remembers it for act.mjs.
// Usage (from the app's project root): node <skill>/scripts/screen.mjs
import fs from 'node:fs';
import { connect } from './lib/cdp.mjs';
import { snapshot } from './lib/snapshot.mjs';
import { out } from './lib/paths.mjs';
try {
  const { evaluate, close } = await connect();
  const s = await snapshot(evaluate);
  fs.writeFileSync(out('screen.txt'), s.text);
  console.log(s.text + `\n— ${s.text.length} chars, ${s.ms}ms`);
  close(); process.exit(0);
} catch (e) { console.log('ERROR: ' + e.message); process.exit(1); }
