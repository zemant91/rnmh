// Inventory of where a React Native app keeps state — a starting point for test-fixtures, not a verdict.
//   node <skill>/scripts/scan-state.mjs        (from the project root)
// Prints: state-related dependencies from package.json, then file:line hits per category.
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const pkgPath = path.join(root, 'package.json');
if (!fs.existsSync(pkgPath)) { console.log('ERROR: no package.json here — run from the project root'); process.exit(1); }
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const deps = { ...pkg.dependencies, ...pkg.devDependencies };

const LIBS = {
  'client store': ['zustand', '@reduxjs/toolkit', 'redux', 'react-redux', 'jotai', 'mobx', 'mobx-state-tree', 'valtio', 'recoil', 'xstate', '@legendapp/state'],
  'local storage': ['react-native-mmkv', '@react-native-async-storage/async-storage', 'react-native-sqlite-storage', '@op-engineering/op-sqlite', 'expo-sqlite', '@nozbe/watermelondb', 'realm', '@realm/react', 'react-native-keychain', 'react-native-encrypted-storage'],
  'server state': ['@tanstack/react-query', 'react-query', '@apollo/client', 'swr', 'urql', 'relay-runtime'],
  'backend client': ['@supabase/supabase-js', 'firebase', '@react-native-firebase/app', '@react-native-firebase/firestore', 'axios', 'graphql-request', '@aws-amplify/datastore', 'aws-amplify'],
};

console.log('== State-related dependencies ==');
for (const [cat, names] of Object.entries(LIBS)) {
  const found = names.filter(n => deps[n]).map(n => `${n}@${deps[n]}`);
  console.log(`${cat.padEnd(15)} ${found.length ? found.join(', ') : '—'}`);
}

const PATTERNS = {
  'client store': [/\bcreate(?:<[^>]*>)?\(\)?\s*\(/, /\bcreateSlice\(/, /\bconfigureStore\(/, /\batom(?:WithStorage)?\(/, /\bmakeAutoObservable\(/, /\bcreateContext\(/],
  'persistence': [/\bpersist\(/, /\bcreateMMKV\(|new MMKV\(/, /\bAsyncStorage\.(?:setItem|getItem|multiSet|clear)\(/, /\bopenDatabase\(|\bopen\(\{\s*name/, /\bnew Realm\(|\bRealmProvider\b/],
  'server state': [/\buseQuery\(|\buseInfiniteQuery\(|\buseSuspenseQuery\(/, /\buseMutation\(/, /\bnew QueryClient\(/, /\bcreateApi\(/, /\bnew ApolloClient\(/, /\buseSWR\(/],
  'backend calls': [/\bcreateClient\(/, /\.from\(['"][\w-]+['"]\)/, /\bfetch\(/, /\baxios\.(?:get|post|put|patch|delete)\(/, /\bcollection\(/],
  'session / auth': [/\bauth\.(?:onAuthStateChange|getSession|signIn\w*|signOut|setSession)\b/, /\bsession\b.*\bset\w*\(/i, /\b(?:token|accessToken|refreshToken)\b/],
};

const SKIP = new Set(['node_modules', 'ios', 'android', '.git', '.rnmh', 'build', 'dist', 'coverage', 'vendor', '__mocks__']);
const files = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (!SKIP.has(e.name)) walk(p); }
    else if (/\.(tsx?|jsx?)$/.test(e.name) && !/\.(test|spec|stories)\.|\.d\.ts$/.test(e.name)) files.push(p);
  }
})(root);

const hits = Object.fromEntries(Object.keys(PATTERNS).map(k => [k, []]));
for (const f of files) {
  const lines = fs.readFileSync(f, 'utf8').split('\n');
  lines.forEach((line, i) => {
    for (const [cat, res] of Object.entries(PATTERNS)) {
      if (res.some(re => re.test(line))) { hits[cat].push(`${path.relative(root, f)}:${i + 1}  ${line.trim().slice(0, 110)}`); break; }
    }
  });
}

const MAX = 25;
for (const [cat, list] of Object.entries(hits)) {
  console.log(`\n== ${cat} (${list.length}) ==`);
  list.slice(0, MAX).forEach(l => console.log('  ' + l));
  if (list.length > MAX) console.log(`  … ${list.length - MAX} more — narrow by reading the files above`);
}

const entry = ['index.js', 'index.ts', 'index.tsx', 'src/index.ts', 'src/index.tsx'].find(p => fs.existsSync(path.join(root, p)));
const existing = files.filter(f => /__rnmhFixtures/.test(fs.readFileSync(f, 'utf8')));
console.log('\n== Hook ==');
console.log(`entry point: ${entry ?? 'not found — check package.json "main" / AppRegistry call'}`);
console.log(`existing fixtures module: ${existing.length ? existing.map(f => path.relative(root, f)).join(', ') : 'none'}`);
