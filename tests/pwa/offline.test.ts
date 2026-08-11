import { readFileSync } from 'node:fs';
import { Script, createContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import { MatchRepository } from '../../src/game/storage.js';

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; }, clear: () => values.clear(), getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null, removeItem: (key) => { values.delete(key); }, setItem: (key, value) => { values.set(key, value); },
  };
}

type WorkerEvent = 'install' | 'activate' | 'fetch';

function workerHarness(options: { readonly failingAsset?: string } = {}) {
  const scope = 'https://game.example/-CrystalFruitMatch/';
  const stores = new Map<string, Map<string, Response>>();
  const listeners = new Map<WorkerEvent, (event: any) => void>();
  const opened: string[] = [];
  let offline = false;
  const normalize = (request: string | { url: string }) => new URL(typeof request === 'string' ? request : request.url, scope).href;
  const responseFor = (url: string) => new Response(url === scope
    ? '<link href="./assets/game.css"><script src="./assets/game.js"></script>'
    : url, { status: 200 });
  const cacheFor = (name: string) => {
    const entries = stores.get(name) ?? new Map<string, Response>();
    stores.set(name, entries);
    return {
      async addAll(requests: readonly string[]) {
        const urls = requests.map(normalize);
        const failingAsset = options.failingAsset;
        if (failingAsset && urls.some((url) => url.endsWith(failingAsset))) throw new Error('precache failed');
        for (const url of urls) entries.set(url, responseFor(url));
      },
      async put(request: string | { url: string }, response: Response) { entries.set(normalize(request), response.clone()); },
      async match(request: string | { url: string }) { return entries.get(normalize(request))?.clone(); },
    };
  };
  const caches = {
    async open(name: string) { opened.push(name); return cacheFor(name); },
    async keys() { return [...stores.keys()]; },
    async delete(name: string) { return stores.delete(name); },
    async match(request: string | { url: string }) {
      for (const entries of stores.values()) {
        const response = entries.get(normalize(request));
        if (response) return response.clone();
      }
      return undefined;
    },
  };
  const context = createContext({
    URL, Request, Response, caches,
    fetch: async (request: string | { url: string }) => {
      if (offline) throw new Error('network unavailable');
      return responseFor(normalize(request));
    },
    self: {
      location: { origin: 'https://game.example' },
      clients: { claim: async () => undefined },
      addEventListener: (type: WorkerEvent, handler: (event: any) => void) => listeners.set(type, handler),
    },
  });
  new Script(readFileSync('public/sw.js', 'utf8')).runInContext(context);

  const waitFor = async (type: 'install' | 'activate') => {
    let work: Promise<void> | undefined;
    listeners.get(type)?.({ waitUntil(value: Promise<void>) { work = value; } });
    if (!work) throw new Error(`Worker did not wait for ${type}.`);
    await work;
  };
  const dispatchFetch = (request: { readonly url: string; readonly method: string; readonly mode: string }) => {
    let response: Promise<Response> | undefined;
    listeners.get('fetch')?.({ request, respondWith(value: Promise<Response>) { response = value; } });
    return response;
  };
  return {
    stores, opened, cacheFor, waitFor, dispatchFetch,
    setOffline(value: boolean) { offline = value; },
  };
}

describe('offline PWA', () => {
  it('declares an installable portrait game manifest', () => {
    const manifest = JSON.parse(readFileSync('public/manifest.webmanifest', 'utf8'));
    expect(manifest).toMatchObject({ name: 'Crystal Fruit Match', short_name: 'Crystal Match', display: 'standalone', orientation: 'portrait', start_url: './' });
    expect(manifest.icons).toContainEqual(expect.objectContaining({ src: 'icons/icon.svg', sizes: 'any', type: 'image/svg+xml' }));
  });

  it('stages a complete shell in a release-specific cache before activation', async () => {
    const harness = workerHarness();
    await harness.waitFor('install');

    const current = harness.opened[0];
    expect(current).toMatch(/^crystal-fruit-match-shell-/);
    expect(current).not.toBe('crystal-fruit-match-v1');
    expect([...harness.stores.get(current)!.keys()]).toEqual(expect.arrayContaining([
      'https://game.example/-CrystalFruitMatch/',
      'https://game.example/-CrystalFruitMatch/index.html',
      'https://game.example/-CrystalFruitMatch/manifest.webmanifest',
      'https://game.example/-CrystalFruitMatch/icons/icon.svg',
      'https://game.example/-CrystalFruitMatch/sw.js',
      'https://game.example/-CrystalFruitMatch/assets/game.css',
      'https://game.example/-CrystalFruitMatch/assets/game.js',
    ]));
  });

  it('leaves the active cache untouched and removes the failed staging cache', async () => {
    const harness = workerHarness({ failingAsset: '/assets/game.js' });
    const active = harness.cacheFor('crystal-fruit-match-shell-previous');
    await active.put('./', new Response('previous shell'));

    await expect(harness.waitFor('install')).rejects.toThrow(/precache/i);

    expect(await (await active.match('./'))?.text()).toBe('previous shell');
    expect(harness.stores.has(harness.opened[0])).toBe(false);
  });

  it('deletes only obsolete Crystal Fruit Match caches during activation', async () => {
    const harness = workerHarness();
    await harness.waitFor('install');
    harness.cacheFor('crystal-fruit-match-shell-previous');
    harness.cacheFor('another-pages-app-v9');

    await harness.waitFor('activate');

    expect(harness.stores.has(harness.opened[0])).toBe(true);
    expect(harness.stores.has('crystal-fruit-match-shell-previous')).toBe(false);
    expect(harness.stores.has('another-pages-app-v9')).toBe(true);
  });

  it('uses the cached shell only for offline same-origin navigation', async () => {
    const harness = workerHarness();
    await harness.waitFor('install');
    harness.setOffline(true);

    const response = harness.dispatchFetch({ url: 'https://game.example/-CrystalFruitMatch/level/1', method: 'GET', mode: 'navigate' });
    await expect((await response)?.text()).resolves.toContain('<script');
  });

  it('does not substitute HTML for a missing non-navigation resource', async () => {
    const harness = workerHarness();
    await harness.waitFor('install');
    harness.setOffline(true);

    const response = harness.dispatchFetch({ url: 'https://game.example/-CrystalFruitMatch/assets/missing.js', method: 'GET', mode: 'cors' });
    await expect(response).rejects.toThrow(/network unavailable/i);
  });

  it('does not intercept cross-origin or non-GET requests', () => {
    const harness = workerHarness();
    expect(harness.dispatchFetch({ url: 'https://cdn.example/game.js', method: 'GET', mode: 'cors' })).toBeUndefined();
    expect(harness.dispatchFetch({ url: 'https://game.example/api', method: 'POST', mode: 'cors' })).toBeUndefined();
  });

  it('keeps corrupt saves from preventing launch', () => {
    const storage = memoryStorage();
    storage.setItem('crystal-fruit-match', '{not json');
    expect(new MatchRepository(storage).load()).toEqual({ status: 'recovered' });
  });
});
