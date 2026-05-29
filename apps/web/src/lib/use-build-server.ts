import { useEffect, useState } from 'react';

export type BuildServerStatus =
  | { state: 'checking' }
  | { state: 'online'; platform: string; isWindows: boolean; hasInstaller: boolean }
  | { state: 'offline'; error: string };

type HealthResponse =
  | { online: true; platform: string; isWindows: boolean; hasInstaller: boolean }
  | { online: false; error: string };

let cachedStatus: BuildServerStatus | null = null;
let inflight: Promise<BuildServerStatus> | null = null;

async function fetchBuildServerStatus(): Promise<BuildServerStatus> {
  try {
    const res = await fetch('/api/build-server/health');
    const data = (await res.json()) as HealthResponse;
    if (data.online) {
      return {
        state: 'online',
        platform: data.platform,
        isWindows: data.isWindows,
        hasInstaller: data.hasInstaller,
      };
    }
    return { state: 'offline', error: data.error };
  } catch {
    return { state: 'offline', error: 'Build server unreachable' };
  }
}

function loadBuildServerStatus(): Promise<BuildServerStatus> {
  if (cachedStatus && cachedStatus.state !== 'checking') {
    return Promise.resolve(cachedStatus);
  }
  if (!inflight) {
    inflight = fetchBuildServerStatus().then((status) => {
      cachedStatus = status;
      return status;
    }).finally(() => {
      inflight = null;
    });
  }
  return inflight;
}

/**
 * Shared build-server health (cached for the session).
 * Multiple components reuse the same result instead of each showing "checking".
 */
export function useBuildServerStatus(): BuildServerStatus {
  const [status, setStatus] = useState<BuildServerStatus>(
    () => cachedStatus ?? { state: 'checking' },
  );

  useEffect(() => {
    let cancelled = false;

    if (cachedStatus && cachedStatus.state !== 'checking') {
      setStatus(cachedStatus);
      return;
    }

    void loadBuildServerStatus().then((next) => {
      if (!cancelled) setStatus(next);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return status;
}
