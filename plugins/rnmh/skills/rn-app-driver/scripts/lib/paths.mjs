// Where the driver keeps its state. Everything is relative to the project the agent works in (cwd),
// never inside the plugin folder, which may be read-only or shared between projects.
import fs from 'node:fs';
import path from 'node:path';

export const OUT = process.env.RN_APP_DRIVER_OUT || path.join(process.cwd(), '.rnmh', 'app-driver');
fs.mkdirSync(OUT, { recursive: true });
export const out = name => path.join(OUT, name);

// Project override: .rnmh/app-driver-policy.json in the project root; otherwise the plugin default.
export function loadPolicy() {
  const project = path.join(process.cwd(), '.rnmh', 'app-driver-policy.json');
  const file = fs.existsSync(project) ? project : new URL('../policy.default.json', import.meta.url);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
