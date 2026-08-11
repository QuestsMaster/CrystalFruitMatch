import { describe, expect, it } from 'vitest';
import { registerOfflineSupport } from '../../src/pwa/offline-readiness.js';

describe('offline readiness', () => {
  it('keeps the status pending until the service worker controller is ready', async () => {
    let resolveReady: (() => void) | undefined;
    const status = { textContent: 'Checking offline availability…' };
    const ready = new Promise<void>((resolve) => { resolveReady = resolve; });

    const result = registerOfflineSupport(status, {
      register: async () => ({}),
      ready,
    });

    await Promise.resolve();
    expect(status.textContent).toBe('Checking offline availability…');

    resolveReady?.();
    await result;
    expect(status.textContent).toBe('Offline ready');
  });
});
