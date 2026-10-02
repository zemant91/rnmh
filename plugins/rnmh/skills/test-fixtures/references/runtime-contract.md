# Fixtures runtime contract and recipes

## The contract (identical in every project)

`rn-app-driver`'s `fixture.mjs` talks to the app only through this global,
evaluated over Hermes. Keep the shape exact; the driver checks `version`.

```ts
type FixtureInfo = { name: string; description: string };

declare global {
  // eslint-disable-next-line no-var
  var __rnmhFixtures:
    | {
        version: 1;
        list: () => FixtureInfo[];
        /** Resets everything the fixtures cover, then applies `name`.
         *  Throws on an unknown name. Resolves once state is in place. */
        load: (name: string) => Promise<{ name: string; summary: string }>;
      }
    | undefined;
}
```

Skeleton (adapt names/paths to the project's conventions):

```ts
// dev-only — required from the entry point behind `if (__DEV__)`
type Fixture = { description: string; apply: () => void | Promise<void> };

async function resetAll() {
  // 1. client stores back to their initial state
  // 2. app-owned local storage cleared through the app's own wrapper
  // 3. server-state cache cleared, network layer switched offline
}

const fixtures: Record<string, Fixture> = {
  empty: { description: 'First launch, no data', apply: () => {} },
  // 'two-exercises': { description: '...', apply: () => { ... } },
};

globalThis.__rnmhFixtures = {
  version: 1,
  list: () => Object.entries(fixtures).map(([name, f]) => ({ name, description: f.description })),
  load: async name => {
    const f = fixtures[name];
    if (!f) throw new Error(`Unknown fixture "${name}". Known: ${Object.keys(fixtures).join(', ')}`);
    await resetAll();
    await f.apply();
    return { name, summary: f.description };
  },
};
```

## Recipes by layer

Use whichever matches the project. Each one writes through the library's or
the app's public API.

### Client stores
- **Zustand:** capture the initial state once at module load
  (`const initial = useStore.getState()`), reset with
  `useStore.setState(initial, true)`, then set data with the store's own
  actions where they exist, or `setState` for plain fields.
- **Redux Toolkit:** dispatch the app's own reset action if it has one;
  otherwise ask before adding one. Set data by dispatching the app's real
  actions.
- **Jotai / MobX / Context-only state:** go through the store/atom setters
  the app already exports. Context-only state with no outside handle can't
  be seeded from a fixture — report it.

### App-owned local storage (MMKV, AsyncStorage, SQLite, ...)
Use the app's own wrapper functions (repository, `storage` module, queue
helpers). Clearing: the wrapper's clear/remove functions, or the storage
instance's own `clearAll()` only if the app owns that whole instance.
Never write keys the app's code doesn't already write.

### Server state (cache + offline)
- **TanStack Query:** `onlineManager.setOnline(false)` first (queries stop
  refetching, mutations are paused instead of sent), then
  `queryClient.clear()`, then `queryClient.setQueryData(key, data)` with the
  exact query keys the app's hooks use. Set `staleTime`-independent data;
  offline means nothing refetches it away.
- **RTK Query / Apollo / SWR:** seeding the cache works
  (`api.util.upsertQueryData`, `cache.writeQuery`, `mutate(key, data, false)`),
  but none of them has a built-in switch that pauses mutations. Report that
  writes on those screens would reach the network and ask the user how to
  proceed — don't add a network shim on your own.

### Session / auth
Set the session where the app reads it (e.g. the auth store's
`setSession`) with a fixed, obviously fake object. Stop anything that would
refresh it over the network through the auth client's own API (for
supabase-js: `supabase.auth.stopAutoRefresh()`). If the app validates the
session against the server before showing signed-in screens, report it —
that path can't be covered offline.

## Determinism checklist
- Fixed ids, names, numbers and dates (e.g. `2026-01-15T09:00:00Z`).
- Module-level counters the app uses for ids: reset them only through the
  app's API; if there's none, note that generated ids may differ between
  loads and don't assert on them.
- Every fixture is complete on its own — no fixture depends on another
  having been loaded first.
