export type OfflineStatus = { textContent: string | null };

export type ServiceWorkerLifecycle = {
  register(scriptUrl: string): Promise<unknown>;
  readonly ready: Promise<unknown>;
};

export async function registerOfflineSupport(
  status: OfflineStatus | null,
  serviceWorker: ServiceWorkerLifecycle,
): Promise<void> {
  if (status) status.textContent = 'Checking offline availability…';

  try {
    await serviceWorker.register('./sw.js');
    await serviceWorker.ready;
    if (status) status.textContent = 'Offline ready';
  } catch {
    if (status) status.textContent = 'Offline features unavailable';
  }
}
