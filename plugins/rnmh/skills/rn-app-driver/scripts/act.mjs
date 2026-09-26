// Acts on the current RN screen with REAL input (AXe HID events on the iOS simulator),
// using element frames from the React tree; then waits for the UI to settle and prints the new screen.
//
//   node <skill>/scripts/act.mjs press  <id|"text"> [--long] [--confirm] [--direct]
//   node <skill>/scripts/act.mjs type   <id|"text"> "value"  [--confirm]           (taps the field, then types)
//   node <skill>/scripts/act.mjs scroll <scroll-id> up|down|left|right              (swipe inside that ScrollView)
//
// --direct   call the JS handler instead of touching (fast state setup; skips hit-testing, not "live")
// --confirm  allow actions that may change app data (policy.default.json, or .rnmh/app-driver-policy.json in the project)
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
// Taps use --tap-style physical: AXe's default FBSimulator tapAt isn't delivered to RN Pressables (Xcode 27 / iOS 27).
import { connect } from './lib/cdp.mjs';
import { snapshot, settle } from './lib/snapshot.mjs';
import { out, loadPolicy } from './lib/paths.mjs';

const args = process.argv.slice(2);
const flags = new Set(args.filter(a => a.startsWith('--')));
const [cmd, rawTarget, arg3] = args.filter(a => !a.startsWith('--'));
const CONFIRM = flags.has('--confirm'), LONG = flags.has('--long'), DIRECT = flags.has('--direct');
const fail = (msg, code = 1) => { console.log('ERROR: ' + msg); process.exit(code); };
if (!['press', 'type', 'scroll'].includes(cmd) || !rawTarget) fail('usage: see header of act.mjs');
const want = rawTarget.replace(/^@/, '');

const policy = loadPolicy();
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const needsConfirm = el => {
  const word = policy.confirmWords.find(w => new RegExp(`\\b${esc(w)}\\b`, 'i').test(el.label));
  if (word) return `label matches "${word}"`;
  const group = (policy.confirmGroups ?? []).find(g => el.groups.includes(g));
  return group ? `inside ${group}` : null;
};

const udid = process.env.SIM_UDID || Object.values(JSON.parse(execFileSync('xcrun', ['simctl', 'list', 'devices', 'booted', '-j'])).devices)
  .flat().find(d => d.state === 'Booted')?.udid;
const axe = (...a) => { const t = Date.now(); execFileSync('axe', [...a, '--udid', udid], { stdio: ['ignore', 'ignore', 'pipe'] }); return Date.now() - t; };

let conn;
try {
  conn = await connect();
  const { evaluate } = conn;
  const before = await snapshot(evaluate);
  const els = before.elements;

  // Resolve target: exact id → exact label → label substring. Ambiguity is an error, never a guess.
  let sid = els[want] ? want : null;
  if (!sid) {
    const lower = want.toLowerCase();
    let hits = Object.keys(els).filter(k => els[k].label.toLowerCase() === lower);
    if (!hits.length) hits = Object.keys(els).filter(k => els[k].label.toLowerCase().includes(lower));
    if (hits.length > 1) fail(`"${want}" matches ${hits.length} elements: ${hits.join(', ')} — use an id`);
    if (!hits.length) fail(`nothing matches "${want}" on screen ${before.route}. Current screen:\n${before.text}`);
    sid = hits[0];
  }
  const el = els[sid];
  const frame = before.frames[el.rid];
  const offscreen = before.text.split('\n').some(l => l.trim().startsWith(`@${sid} `) && / offscreen /.test(l));
  const reason = cmd !== 'scroll' && needsConfirm(el);
  if (reason && !CONFIRM) fail(`${sid} "${el.label}" may change app data (${reason}). Ask the user, then re-run with --confirm.`, 2);
  if (!DIRECT && !udid) fail('no booted iOS simulator (set SIM_UDID or boot one)');
  if (!DIRECT && !frame) fail(`${sid} has no measured frame — cannot touch it (try --direct)`);
  if (!DIRECT && offscreen && cmd !== 'scroll') fail(`${sid} is offscreen — scroll its list first (a real tap would hit whatever is there)`);

  const cx = Math.round(frame?.[0] + frame?.[2] / 2), cy = Math.round(frame?.[1] + frame?.[3] / 2);
  let how, inputMs = 0;
  if (cmd === 'press' && DIRECT) {
    const handler = LONG ? 'onLongPress' : 'onPress';
    const res = await evaluate(`(() => {
      const f = globalThis.__rnprobe.els[${el.rid}]; const h = f?.memoizedProps?.${handler};
      if (typeof h !== 'function') return 'no ${handler} handler';
      if (f.memoizedProps.disabled) return 'element is disabled';
      try { h({ nativeEvent: {}, persist() {}, preventDefault() {}, stopPropagation() {} }); return 'ok'; } catch (e) { return 'handler threw: ' + e; }
    })()`);
    if (res !== 'ok') fail(`${sid}: ${res}`);
    how = `direct ${handler}`;
  } else if (cmd === 'press') {
    inputMs = LONG ? axe('touch', '-x', cx, '-y', cy, '--down', '--up', '--delay', '0.8') : axe('touch', '-x', cx, '-y', cy, '--down', '--up', '--delay', '0.05');
    how = `${LONG ? 'long-press' : 'tap'} at ${cx},${cy}`;
  } else if (cmd === 'type') {
    if (arg3 === undefined) fail('usage: node act.mjs type <id> "value"');
    if (DIRECT) fail('--direct is not supported for type');
    if (/[^\x20-\x7E]/.test(arg3)) fail('AXe types US-keyboard characters only; non-ASCII text is not supported yet');
    inputMs = axe('touch', '-x', cx, '-y', cy, '--down', '--up', '--delay', '0.05');
    execFileSync('axe', ['type', '--stdin', '--udid', udid], { input: arg3 });
    how = `tap ${cx},${cy} + type ${JSON.stringify(arg3)}`;
  } else {
    const dir = arg3 ?? 'down';
    if (!frame) fail(`${sid} has no frame`);
    const [x, y, w, h] = frame, m = 0.25;           // swipe across the middle 50% of the list
    const pts = { down: [cx, y + h * (1 - m), cx, y + h * m], up: [cx, y + h * m, cx, y + h * (1 - m)],
                  right: [x + w * (1 - m), cy, x + w * m, cy], left: [x + w * m, cy, x + w * (1 - m), cy] }[dir];
    if (!pts) fail('direction must be up|down|left|right');
    const [sx, sy, ex, ey] = pts.map(Math.round);
    inputMs = axe('swipe', '--start-x', sx, '--start-y', sy, '--end-x', ex, '--end-y', ey, '--duration', '0.3');
    how = `swipe ${dir} ${sx},${sy} → ${ex},${ey}`;
  }

  const after = await settle(evaluate, { baseline: before.text });
  fs.writeFileSync(out('screen.txt'), after.text);
  fs.appendFileSync(out('actions.log'), `${new Date().toISOString()} ${cmd} ${before.route}:${sid} "${el.label}" via ${how} -> ${after.route}${CONFIRM ? ' [confirmed]' : ''}\n`);
  const changed = after.changed;
  console.log(`${cmd} ${sid} "${el.label}" via ${how}${inputMs ? ` (${inputMs}ms)` : ''} → settled in ${after.settledIn}ms${after.stable ? '' : ' (still changing)'}${changed ? '' : ' — WARNING: screen did not change'}\n`);
  console.log(after.text);
  conn.close(); process.exit(0);
} catch (e) { fail(e.message + (e.stderr ? `\n${e.stderr}` : '')); }
