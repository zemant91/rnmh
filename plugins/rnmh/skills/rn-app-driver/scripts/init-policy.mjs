// Proposes a per-project data-safety policy before the first on-device session in a project.
//
//   node <skill>/scripts/init-policy.mjs                         # dry run: list candidate groups, write nothing
//   node <skill>/scripts/init-policy.mjs --write GroupA,GroupB   # write only the groups the user picked
//   node <skill>/scripts/init-policy.mjs --write none            # write the policy with no extra groups
//
// Why: the default policy matches labels (save, delete, edit...). Buttons like "Done", "OK", "Apply" or
// "Next" often persist data too, but can't go on the word list because just as many only close a sheet
// or a keyboard. The reliable signal is WHERE the button sits: anything inside a form/editor component
// should need --confirm. This script finds those components in the project's source so the user can
// pick them once, up front, instead of discovering a gap after an accidental save.
//
// It never decides on its own: without --write it only prints candidates. Run from the project root.
// Writes .rnmh/app-driver-policy.json = the default confirmWords + any groups already in the project
// policy + the groups passed to --write. (A project policy replaces the default, so the words are copied
// in; default confirmGroups are NOT copied, since they belong to whichever project they were added for.)
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const wi = args.indexOf('--write');
const WRITE = wi !== -1 ? (args[wi + 1] ?? '') : null;
if (WRITE === '') { console.log('ERROR: --write needs a comma-separated list of groups, or "none"'); process.exit(1); }

const root = process.cwd();
const projectPolicy = path.join(root, '.rnmh', 'app-driver-policy.json');
const defaults = JSON.parse(fs.readFileSync(new URL('./policy.default.json', import.meta.url), 'utf8'));
const existing = fs.existsSync(projectPolicy) ? JSON.parse(fs.readFileSync(projectPolicy, 'utf8')) : null;

// ---- scan --------------------------------------------------------------------------------------
const SKIP = new Set(['node_modules', 'ios', 'android', '.git', '.rnmh', 'build', 'dist', 'coverage', 'vendor', '__tests__', '__mocks__']);
const files = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') && e.name !== '.') { if (e.isDirectory()) continue; }
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (!SKIP.has(e.name)) walk(p); }
    else if (/\.(tsx|jsx)$/.test(e.name) && !/\.(test|spec|stories)\./.test(e.name)) files.push(p);
  }
})(root);

// Component name looks like a place where data gets entered or changed.
const NAME = /(Form|Editor|Edit|Create|Add|New|Compose|Picker|Rating|Settings|Checkout|Payment|Sheet|Modal)$|^(Edit|Create|Add|New)/;
// File contains code that writes data somewhere.
const WRITES = [
  [/\bonSubmit\b|\bhandleSubmit\b/, 'submit handler'],
  [/\buseMutation\b|\bmutate(Async)?\(/, 'mutation'],
  [/\.(save|insert|upsert|update|create|delete|remove|destroy|write)\(/, 'storage/API write'],
  [/\b(setItem|multiSet|executeSql|runAsync)\(/, 'local storage write'],
  [/\bmethod:\s*['"](POST|PUT|PATCH|DELETE)['"]/i, 'HTTP write'],
];
const COMPONENT = /(?:export\s+(?:default\s+)?)?(?:function\s+([A-Z][A-Za-z0-9]*)\s*\(|const\s+([A-Z][A-Za-z0-9]*)\s*(?::[^=]+)?=\s*(?:React\.)?(?:memo|forwardRef)?\(?\s*(?:\([^)]*\)|[a-z_][A-Za-z0-9_]*)\s*(?::[^=]+)?=>)/g;

const candidates = [];
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  const writes = WRITES.filter(([re]) => re.test(src)).map(([, why]) => why);
  for (const m of src.matchAll(COMPONENT)) {
    const name = m[1] || m[2];
    const byName = NAME.test(name);
    if (!byName && !writes.length) continue;
    const why = [byName && 'name looks like a form/editor', ...writes].filter(Boolean).join(', ');
    candidates.push({ name, file: path.relative(root, f), why, strong: byName && writes.length > 0 });
  }
}
const seen = new Set();
const uniq = candidates.filter(c => !seen.has(c.name) && seen.add(c.name))
  .sort((a, b) => (b.strong - a.strong) || a.name.localeCompare(b.name));

// ---- report or write ---------------------------------------------------------------------------
if (WRITE === null) {
  console.log(existing ? `Project policy exists: ${path.relative(root, projectPolicy)} (groups: ${(existing.confirmGroups ?? []).join(', ') || 'none'})`
                       : 'No project policy yet — the plugin default applies (label words only).');
  if (!uniq.length) { console.log('No candidate components found.'); process.exit(0); }
  console.log(`\nCandidate groups (${uniq.length}). "*" = name AND file both point to data changes:\n`);
  for (const c of uniq) console.log(`${c.strong ? '*' : ' '} ${c.name.padEnd(32)} ${c.why}  (${c.file})`);
  console.log('\nThese are proposals from a source scan, not decisions. Ask the user which to protect, then:');
  console.log('  node <skill>/scripts/init-policy.mjs --write GroupA,GroupB   (or --write none)');
  console.log('Only components that show up as group headers in screen.mjs output actually match; a group');
  console.log('that never appears in the tree is harmless but does nothing.');
  process.exit(0);
}

const picked = WRITE === 'none' ? [] : WRITE.split(',').map(s => s.trim()).filter(Boolean);
const groups = [...new Set([...(existing?.confirmGroups ?? []), ...picked])];
const words = existing?.confirmWords ?? defaults.confirmWords;
fs.mkdirSync(path.dirname(projectPolicy), { recursive: true });
fs.writeFileSync(projectPolicy, JSON.stringify({
  _comment: 'Per-project data-safety policy for rn-app-driver (replaces the plugin default). Created by init-policy.mjs; edit freely.',
  ...existing, // keep anything else already recorded here (e.g. networkBypass from test-fixtures)
  confirmWords: words,
  confirmGroups: groups,
}, null, 2) + '\n');
console.log(`Wrote ${path.relative(root, projectPolicy)} — ${words.length} words, groups: ${groups.join(', ') || 'none'}`);
