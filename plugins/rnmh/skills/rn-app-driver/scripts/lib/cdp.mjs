// Minimal CDP client for the RN app's Hermes runtime, via Metro's inspector proxy.
export async function connect(metro = 'http://localhost:8081') {
  let list;
  try { list = await (await fetch(`${metro}/json/list`)).json(); }
  catch { throw new Error(`Metro not reachable at ${metro} — start the app in dev mode`); }
  const target = list.find(t => t.webSocketDebuggerUrl);
  if (!target) throw new Error('No debuggable target — is the app open?');
  // Metro rejects upgrades without an Origin header (401).
  const ws = new WebSocket(target.webSocketDebuggerUrl, { headers: { Origin: metro } });
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('CDP handshake failed')); });
  let id = 0; const pending = new Map();
  ws.onmessage = e => { const m = JSON.parse(e.data); pending.get(m.id)?.(m); pending.delete(m.id); };
  const evaluate = async expression => {
    const m = await new Promise(res => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method: 'Runtime.evaluate', params: { expression, returnByValue: true } })); });
    if (m.result?.exceptionDetails) throw new Error('in-app error: ' + (m.result.exceptionDetails.exception?.description ?? m.result.exceptionDetails.text).slice(0, 400));
    return m.result?.result?.value;
  };
  return { target, evaluate, close: () => ws.close() };
}
