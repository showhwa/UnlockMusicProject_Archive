import { useCallback, useMemo, useRef, useState } from 'react';
import { useConvertSelector } from '@/hooks/useConvertStore';

export type OptimisticSetting<T> = {
  /** Draft value while editing or committing; otherwise the authoritative value. */
  value: T;
  /** Replace the local draft without persisting. Supersedes any in-flight commit's cleanup. */
  setDraft: (value: T) => void;
  /** Persist `value`; resolves with whether Go accepted it. */
  commit: (value: T) => Promise<boolean>;
  /** Persist the current draft, if there is one that is not already authoritative. */
  commitDraft: () => Promise<boolean>;
  /** True while a local draft is displayed instead of the authoritative value. */
  pending: boolean;
};

/**
 * Keeps an optimistic value local to the control. The authoritative settings
 * slice is updated only with the value returned by Go. The returned object and
 * its functions are referentially stable until `value`/`pending` change; callbacks
 * (`commit`, `setDraft`, `commitDraft`) are stable across renders for the same store.
 */
export function useOptimisticSetting<T>(
  authoritative: T,
  makePatch: (value: T) => { [_ in string]?: unknown },
): OptimisticSetting<T> {
  const patchSettings = useConvertSelector((state) => state.patchSettings);
  const [draft, setDraftState] = useState<T | undefined>(undefined);
  const requestRef = useRef(0);
  const inFlightRef = useRef(0);
  const patchRef = useRef(makePatch);
  patchRef.current = makePatch;
  // Written synchronously with every draft change (never from render) so
  // callers in the same tick as setDraft/commit observe the latest draft.
  const draftRef = useRef<T | undefined>(undefined);
  // True when the displayed draft came from setDraft and has not been committed yet.
  const editedRef = useRef(false);
  const authoritativeRef = useRef(authoritative);
  authoritativeRef.current = authoritative;

  const writeDraft = useCallback((value: T | undefined) => {
    draftRef.current = value;
    setDraftState(value);
  }, []);

  const setDraft = useCallback(
    (value: T) => {
      // A newer local edit must not be cleared by an older commit finishing.
      requestRef.current += 1;
      editedRef.current = true;
      writeDraft(value);
    },
    [writeDraft],
  );

  const commit = useCallback(
    async (value: T): Promise<boolean> => {
      const request = ++requestRef.current;
      inFlightRef.current += 1;
      editedRef.current = false;
      writeDraft(value);
      try {
        const ok = await patchSettings(patchRef.current(value));
        if (request === requestRef.current) writeDraft(undefined);
        return ok;
      } finally {
        inFlightRef.current -= 1;
      }
    },
    [patchSettings, writeDraft],
  );

  const commitDraft = useCallback(async (): Promise<boolean> => {
    const current = draftRef.current;
    if (current === undefined || !editedRef.current) return true;
    if (inFlightRef.current === 0 && Object.is(current, authoritativeRef.current)) {
      editedRef.current = false;
      writeDraft(undefined);
      return true;
    }
    return commit(current);
  }, [commit, writeDraft]);

  const value = draft === undefined ? authoritative : draft;
  const pending = draft !== undefined;

  return useMemo(
    () => ({ value, setDraft, commit, commitDraft, pending }),
    [value, setDraft, commit, commitDraft, pending],
  );
}
