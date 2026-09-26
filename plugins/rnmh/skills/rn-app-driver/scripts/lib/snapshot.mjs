// Builds a compact, agent-oriented snapshot of the current RN screen.

// ---- runs inside the app (synchronous; state parked on globalThis.__rnprobe) ----
const walkScreen = () => {
  const SKIP = /^(LogBoxStateSubscription|LogBoxNotificationContainer|DebuggingOverlay|PressabilityDebugView|Svg)$/;
  // Library / plumbing names that never become group headers (heuristic, extend as needed).
  const PLUMBING = /(Context|Provider|Navigator|Navigation|Container|Wrapper|Freeze|Suspender|Scene|Frame|Ensure|Maybe|Debug|Linking|Locale|PreventRemove|Static|Background|Header|SafeArea|Animated|^View$|^Screen|^InnerScreen$|^Root|^App|Gate$|Compat$|TabView$|StackView$|RootComponent)/;
  const SCROLL = /^(ScrollView|FlatList|SectionList|VirtualizedList|FlashList)$/;
  const hook = globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__;
  const root = [...hook.getFiberRoots([...hook.renderers.keys()][0])][0];
  const nameOf = f => { const t = f.type; if (!t) return null; if (typeof t === 'string') return t;
    return t.displayName || t.name || t.render?.displayName || t.render?.name || t.type?.displayName || t.type?.name || null; };
  const kids = f => { const out = []; let c = f.child; while (c) { out.push(c); c = c.sibling; } return out; };
  const reg = globalThis.__rnprobe = { els: {}, frames: {}, pending: 0 };
  let nextId = 1, route = null, routeDepth = -1;

  // Texts inside one Text component are concatenated; separate Text components joined with " · ".
  const textOf = f => {
    const parts = [];
    const visit = (n, inText) => { for (const c of kids(n)) {
      if (c.tag === 6) { if (inText) inText.s += c.memoizedProps; else parts.push(String(c.memoizedProps)); continue; }
      const nm = nameOf(c);
      if (nm === 'Text' && !inText) { const acc = { s: '' }; visit(c, acc); if (acc.s.trim()) parts.push(acc.s.trim()); }
      else visit(c, inText);
    } };
    visit(f, null);
    return parts.map(x => x.trim()).filter(Boolean).join(' · ');
  };
  const iconsOf = f => { const out = []; const v = n => { for (const c of kids(n)) { const nm = nameOf(c); if (nm && /Icon$/.test(nm)) out.push(nm.replace(/Icon$/, '')); else v(c); } }; v(f); return out; };
  const register = (f, kind) => { const id = nextId++; reg.els[id] = f; 
    let h = f; while (h && typeof h.type !== 'string') h = h.child;
    const inst = h?.stateNode?.canonical?.publicInstance ?? h?.stateNode;
    if (inst?.measureInWindow) { reg.pending++; inst.measureInWindow((x, y, w, hh) => { reg.frames[id] = [Math.round(x), Math.round(y), Math.round(w), Math.round(hh)]; reg.pending--; }); }
    return id; };

  const build = (f, depth) => {
    const name = nameOf(f), host = typeof f.type === 'string', p = f.memoizedProps || {};
    if (f.tag === 6) return [{ t: 'text', s: String(p) }];
    if (name && SKIP.test(name)) return [];
    if (p.freeze === true || p.activityState === 0 || (name === 'MaybeScreen' && p.visible === false)) return []; // hidden screens
    if (name === 'SceneView' && p.route?.name && depth > routeDepth) { route = p.route.name; routeDepth = depth; }
    if (!host && (typeof p.onPress === 'function' || typeof p.onLongPress === 'function')) {
      return [{ t: 'el', id: register(f), name, text: textOf(f), icons: iconsOf(f), a11y: p.accessibilityLabel || p['aria-label'], testID: p.testID, disabled: !!p.disabled }];
    }
    if (!host && name === 'TextInput') return [{ t: 'el', id: register(f), name, value: p.value ?? p.defaultValue ?? '', placeholder: p.placeholder, testID: p.testID }];
    if (!host && typeof p.onValueChange === 'function') return [{ t: 'el', id: register(f), name, value: p.value, testID: p.testID }];
    if (!host && name === 'Text') {
      // textOf() walks children, so wrap a sibling-less copy of this fiber to read only its own text
      const self = { type: f.type, tag: f.tag, child: f.child, sibling: null, memoizedProps: f.memoizedProps };
      const s = textOf({ child: self }); return s ? [{ t: 'text', s }] : [];
    }
    // native-stack: only the top-most screen is visible
    let children = kids(f);
    if (name === 'ScreenStack') {
      // native-stack: only the top-most screen is visible. Items can sit below wrapper fibers,
      // so collect the shallowest ScreenStackItems (not crossing nested stacks) and keep the last.
      const items = [];
      const find = n => { for (const c of kids(n)) { const nm = nameOf(c); if (nm === 'ScreenStackItem') items.push(c); else if (nm !== 'ScreenStack') find(c); } };
      find(f);
      if (items.length) return build(items.at(-1), depth + 1);
    }
    let out = children.flatMap(c => build(c, depth + 1));
    if (!host && name && SCROLL.test(name)) {
      if (out.length === 1 && out[0].t === 'scroll') return out;                // nested ScrollView wrappers
      return [{ t: 'scroll', id: register(f), name, horizontal: !!p.horizontal, children: out }];
    }
    if (!host && name && !PLUMBING.test(name) && out.length >= 2) return [{ t: 'group', name, children: out }];
    return out;
  };
  const nodes = build(root.current, 0);
  reg.route = route;
  return JSON.stringify({ route, nodes });
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---- semantic ids ----
// Priority: testID → <scope>/<label-slug> → <scope>/<index> for list rows with changing labels.
// <scope> is the nearest named group, or the route name when the element sits directly on the screen.
const slug = s => String(s).replace(/^icon:/, '').replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
  .replace(/[^a-z0-9а-яё]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32);
// Labels that change over time (clock times, durations, "·"-joined rows) make bad ids.
const isDynamic = l => l.length > 24 || /\d{1,2}:\d{2}|·|\b\d+\s?(m|h|min|sec|s)\b/i.test(l);

export function assignIds(route, nodes) {
  const elements = {}, used = new Map();
  const visit = (n, groups) => {
    if (n.t === 'group') { n.children.forEach(c => visit(c, [...groups, n.name])); return; }
    if (n.t === 'el' || n.t === 'scroll') {
      const scope = groups.at(-1) ?? route ?? 'screen';
      const label = n.t === 'scroll' ? '' : labelOf(n);
      let base;
      if (n.testID) base = n.testID;
      else if (n.t === 'scroll') base = `${scope}/scroll`;
      else if (label && !isDynamic(label) && slug(label)) base = `${scope}/${slug(label)}`;
      else { const k = `${scope}#row`; used.set(k, (used.get(k) ?? 0) + 1); base = `${scope}/${used.get(k)}`; }
      const count = (used.get(base) ?? 0) + 1; used.set(base, count);
      n.sid = count === 1 ? base : `${base}-${count}`; if (count > 1) n.dup = true;
      elements[n.sid] = { rid: n.id, name: n.name, label, groups };
    }
    n.children?.forEach(c => visit(c, groups));
  };
  nodes.forEach(n => visit(n, []));
  return elements;
}

export function labelOf(n) {
  return n.text || n.a11y || (n.icons?.length ? `icon:${n.icons.join(',')}` : '') || n.placeholder || '';
}

export async function snapshot(evaluate) {
  const t0 = Date.now();
  const { route, nodes } = JSON.parse(await evaluate(`(${walkScreen.toString()})()`));
  let frames = {};
  for (let i = 0; i < 20; i++) {                    // measureInWindow is async on Fabric; poll briefly
    const r = JSON.parse(await evaluate('JSON.stringify({ p: globalThis.__rnprobe.pending, f: globalThis.__rnprobe.frames })'));
    frames = r.f; if (r.p === 0) break;
    await sleep(10);
  }
  const elements = assignIds(route, nodes);
  return { route, nodes, frames, elements, text: format(route, nodes, frames), ms: Date.now() - t0 };
}

export function format(route, nodes, frames) {
  const q = s => JSON.stringify(s);
  const frame = id => frames[id] ? `[${frames[id].join(',')}]` : '[?]';
  // Outside the nearest ScrollView's visible area → the user can't see it without scrolling.
  const offscreen = (id, vp) => { const f = frames[id]; if (!f || !vp) return false;
    return f[1] + f[3] <= vp[1] + 1 || f[1] >= vp[1] + vp[3] - 1 || f[0] + f[2] <= vp[0] + 1 || f[0] >= vp[0] + vp[2] - 1; };
  const lines = [`screen: ${route ?? '?'}`];
  const fmtList = (list, d, vp) => {
    for (let i = 0; i < list.length; i++) {
      const n = list[i], ind = '  '.repeat(d);
      if (n.t === 'text') {                       // merge runs of plain texts into one line
        const run = [n.s]; while (list[i + 1]?.t === 'text') run.push(list[++i].s);
        lines.push(ind + run.map(q).join(' '));
      } else if (n.t === 'group') { lines.push(ind + n.name); fmtList(n.children, d + 1, vp); }
      else if (n.t === 'scroll') {
        lines.push(`${ind}@${n.sid} ${n.name}${n.horizontal ? ' (horizontal)' : ''} ${frame(n.id)}`);
        fmtList(n.children, d + 1, frames[n.id] ?? vp);
      } else {
        const label = labelOf(n);
        const extra = [n.icons?.length && n.text ? `icon:${n.icons.join(',')}` : '', n.testID && `testID=${n.testID}`,
          n.value !== undefined && `value=${q(n.value)}`, n.disabled && 'disabled', offscreen(n.id, vp) && 'offscreen'].filter(Boolean).join(' ');
        lines.push(`${ind}@${n.sid}${n.dup ? ' (duplicate name — add testID)' : ''} ${n.name}${label ? ' ' + q(label) : ''}${extra ? ' ' + extra : ''} ${frame(n.id)}`);
      }
    }
  };
  fmtList(nodes, 0, null);
  return lines.join('\n');
}

// Waits until the screen stops changing. With a baseline (the screen before an action) it first
// waits up to `changeTimeout` for the screen to differ — a tap's effect can land a few frames later,
// and two identical snapshots taken before it would look "settled".
export async function settle(evaluate, { interval = 150, timeout = 3000, baseline = null, changeTimeout = 1500 } = {}) {
  const start = Date.now();
  let prev = await snapshot(evaluate);
  let changed = baseline === null || prev.text !== baseline;
  while (!changed && Date.now() - start < changeTimeout) {
    await sleep(50);
    prev = await snapshot(evaluate);
    changed = prev.text !== baseline;
  }
  while (Date.now() - start < timeout) {
    await sleep(interval);
    const cur = await snapshot(evaluate);
    if (cur.text === prev.text) return { ...cur, settledIn: Date.now() - start, stable: true, changed };
    prev = cur;
  }
  return { ...prev, settledIn: Date.now() - start, stable: false, changed };
}
