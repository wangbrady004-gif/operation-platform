/**
 * Server-side calls to the NestJS ops API.
 * Set OPS_API_URL in .env.local (see .env.example).
 */

export function getOpsApiBaseUrl(): string {
  return (process.env.OPS_API_URL ?? "http://127.0.0.1:8899").replace(/\/$/, "");
}

export type HealthBody = { status: string; service?: string };

export async function fetchOpsHealth(): Promise<
  { ok: true; data: HealthBody } | { ok: false; message: string }
> {
  const base = getOpsApiBaseUrl();
  try {
    const res = await fetch(`${base}/health`, { cache: "no-store" });
    if (!res.ok) {
      return { ok: false, message: `${res.status} ${res.statusText}` };
    }
    const data = (await res.json()) as HealthBody;
    return { ok: true, data };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: msg };
  }
}

export async function fetchOpsRoot(): Promise<Record<string, unknown> | null> {
  const base = getOpsApiBaseUrl();
  try {
    const res = await fetch(`${base}/`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}
