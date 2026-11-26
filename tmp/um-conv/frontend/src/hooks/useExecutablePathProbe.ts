import { useCallback, useEffect, useRef, useState } from 'react';
import type { FieldProps } from '@fluentui/react-components';
import type { ProbeResult } from '~protocol';
import { useDebouncedAsync } from '@/hooks/useDebouncedAsync';
import { useConvertSelector, useProbe } from '@/hooks/useConvertStore';

const DEFAULT_DEBOUNCE_MS = 3000;

export type UseExecutablePathProbeOptions = {
  exe: string;
  persistedPath: string;
  patchPath: (value: string) => Promise<boolean>;
  /** Dialog title; defaults to `选择 ${exe}` (+ `.exe` on Windows). */
  selectTitle?: string;
  debounceMs?: number;
};

function isWindows(): boolean {
  return /Win/i.test(navigator.userAgent);
}

function defaultSelectTitle(exe: string): string {
  return `选择 ${exe}${isWindows() ? '.exe' : ''}`;
}

export type ExecutablePathProbeFieldProps = {
  value: string;
  onValueChange: (value: string) => void;
  onBlur: () => void;
  onSelect: () => void;
  /** Set draft, commit settings, and probe immediately (dialog / drop). */
  applyPath: (path: string) => void;
  validationState?: FieldProps['validationState'];
  /** Always a plain string from probe formatting; FFmpegField may wrap it in JSX. */
  validationMessage?: string;
  probeResult?: ProbeResult;
};

function formatProbeMessage(result: ProbeResult): {
  validationState: FieldProps['validationState'];
  validationMessage: string;
} {
  if (!result.ok) {
    return {
      validationState: 'error',
      validationMessage: result.error?.trim() || '可执行文件不可用',
    };
  }
  const parts: string[] = [];
  if (result.version) {
    parts.push(`版本 ${result.version}`);
  }
  return {
    validationState: 'none',
    validationMessage: parts.length > 0 ? parts.join('・') : '可用',
  };
}

export function useExecutablePathProbe({
  exe,
  persistedPath,
  patchPath,
  selectTitle,
  debounceMs = DEFAULT_DEBOUNCE_MS,
}: UseExecutablePathProbeOptions): ExecutablePathProbeFieldProps {
  const requestProbe = useConvertSelector((state) => state.requestProbe);
  const selectExecutable = useConvertSelector((state) => state.selectExecutable);
  const [draft, setDraft] = useState(persistedPath);
  const [syncTick, setSyncTick] = useState(0);
  const requestRef = useRef(0);
  const inFlightRef = useRef(0);
  // True while a local edit/commit is not yet reconciled with Go's persisted path.
  const unsettledRef = useRef(false);

  useEffect(() => {
    void requestProbe(exe, persistedPath);
  }, [exe, persistedPath, requestProbe]);

  const probeSnapshot = useProbe(exe, draft);
  const probeResult = probeSnapshot.result ?? undefined;
  const validation = probeResult ? formatProbeMessage(probeResult) : undefined;

  const updatePath = useCallback(
    async (path: string, commit: boolean) => {
      if (!commit) {
        await requestProbe(exe, path, true);
        return;
      }

      const request = ++requestRef.current;
      inFlightRef.current += 1;
      let ok: boolean;
      try {
        ok = await patchPath(path);
      } finally {
        inFlightRef.current -= 1;
      }
      // Only the latest local edit/commit may reconcile the draft or probe.
      if (request !== requestRef.current) return;
      unsettledRef.current = false;
      // Re-align the draft with the persisted path (rolls back on failure).
      setSyncTick((tick) => tick + 1);
      if (!ok) return;
      // Always force on user path updates so re-selecting the same path after
      // replacing the binary refreshes stale ready cache. Go remains
      // authoritative for the path; the persistedPath effect stays non-forced.
      await requestProbe(exe, path, true);
    },
    [exe, patchPath, requestProbe],
  );

  const probeAsyncDebounce = useDebouncedAsync(updatePath, debounceMs);

  // Keep the draft aligned with the authoritative setting, unless a newer local
  // edit or commit is still unsettled (e.g. an older commit succeeding late).
  useEffect(() => {
    if (unsettledRef.current) return;
    probeAsyncDebounce.cancel();
    setDraft(persistedPath);
  }, [persistedPath, syncTick, probeAsyncDebounce]);

  const onValueChange = useCallback(
    (value: string) => {
      // A newer edit invalidates rollbacks from earlier commits.
      requestRef.current += 1;
      unsettledRef.current = true;
      setDraft(value);
      probeAsyncDebounce(value, false);
    },
    [probeAsyncDebounce],
  );

  const onBlur = useCallback(() => {
    // While a commit is in flight, a draft equal to persistedPath may still be a
    // revert that must be committed once the earlier patch lands.
    if (draft !== persistedPath || (unsettledRef.current && inFlightRef.current > 0)) {
      probeAsyncDebounce.flush(draft, true);
    } else {
      // Nothing to persist; drop any pending preview probe for a reverted edit.
      probeAsyncDebounce.cancel();
      unsettledRef.current = false;
    }
  }, [draft, persistedPath, probeAsyncDebounce]);

  const applyPath = useCallback(
    (path: string) => {
      unsettledRef.current = true;
      setDraft(path);
      probeAsyncDebounce.flush(path, true);
    },
    [probeAsyncDebounce],
  );

  const onSelect = useCallback(() => {
    (async () => {
      const path = await selectExecutable(selectTitle ?? defaultSelectTitle(exe));
      if (!path) return;
      applyPath(path);
    })().catch((err) => console.error('onSelect failed', err));
  }, [applyPath, exe, selectExecutable, selectTitle]);

  return {
    value: draft,
    onValueChange,
    onBlur,
    onSelect,
    applyPath,
    validationState: validation?.validationState,
    validationMessage: validation?.validationMessage,
    probeResult,
  };
}
