import {
  pingPresence as pingPresenceFn,
  startPlaySession as startPlaySessionFn,
  endPlaySession as endPlaySessionFn,
} from "@/lib/fns/presence";

export async function pingPresence(
  romSlug?: string | null,
  romTitle?: string | null
): Promise<void> {
  try {
    await pingPresenceFn({ data: { romSlug: romSlug ?? null, romTitle: romTitle ?? null } });
  } catch {
    // silent — user may not be signed in
  }
}

export async function startPlaySession(
  romSlug: string,
  romTitle: string
): Promise<string | null> {
  try {
    const res = await startPlaySessionFn({ data: { romSlug, romTitle } });
    return res.id;
  } catch {
    return null;
  }
}

export async function endPlaySession(
  id: string | null,
  seconds: number
): Promise<void> {
  if (!id || seconds <= 0) return;
  try {
    await endPlaySessionFn({ data: { sessionId: id, seconds } });
  } catch {
    // silent
  }
}

export function formatPlaytime(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds < 60) return `${Math.max(0, totalSeconds | 0)}s`;
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export function isOnline(lastSeen: string | null | undefined): boolean {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() < 2 * 60 * 1000;
}
