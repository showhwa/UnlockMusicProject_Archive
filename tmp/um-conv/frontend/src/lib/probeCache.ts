import type { ProbeResult } from '~protocol';

export type ExecutableProbeSnapshot = {
  status: 'idle' | 'probing' | 'ready';
  result: ProbeResult | null;
};

export type ProbeSnapshots = Record<string, ExecutableProbeSnapshot>;

const EMPTY_PROBE: ExecutableProbeSnapshot = { status: 'idle', result: null };

export function probeKey(exe: string, path: string): string {
  return JSON.stringify([exe, path]);
}

/** Stable snapshot for an executable/path pair; unknown pairs share one idle object. */
export function getProbeSnapshot(
  probes: ProbeSnapshots,
  exe: string,
  path: string,
): ExecutableProbeSnapshot {
  return probes[probeKey(exe, path)] ?? EMPTY_PROBE;
}
