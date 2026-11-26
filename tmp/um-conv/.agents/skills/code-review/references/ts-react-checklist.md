# TypeScript & React Code Review Checklist (`um-conv`)

Use this checklist when reviewing files under `frontend/src/`.

## 1. Go-as-source-of-truth & Wails bindings

- **Generated bindings only**: Protocol types, service methods, and event names must be imported from `~protocol`, `~service/*`, and `~events`. Flag any hand-written duplicate protocol interfaces, hardcoded event names, or copied backend defaults/validation/format catalogs.
- **Event model hydration**: Payloads received from `Events.On(...)` are raw JSON objects and must be converted with generated `Model.createFrom(event.data)` before calling store updaters.
- **Backend-owned mutations**: Business actions (queue edits, conversion start, settings patch, executable probing) should flow through the store / Wails service calls (`ConvertService`, `SettingsService`), not ad-hoc local state mutations.

## 2. Store, revisions & reference stability (`frontend/src/lib/`, `frontend/src/hooks/`)

- **Independent revision guards**:
  - `applySnapshot` must compare `next.revision >= state.revision` for session/files/profiles/job and `next.settingsRevision >= state.settingsRevision` for settings independently.
  - `applySettingsState` (from `PatchSettings` responses) must reject responses with `next.revision < state.settingsRevision`.
- **Reference preservation**: Store updaters (`applySnapshot`, `mergeSettings`) must preserve existing object/array references (via `dequal`) when values have not changed, preventing cascading React re-renders.
- **Serialized mutations**: Queued async mutations (like `settingsQueue` in `convertStore.ts`) must catch/handle errors so one rejected promise never poisons or stalls subsequent queued updates.
- **Selector discipline**: Zustand selectors (`useConvertSelector`, `useSetting`) must select minimal primitives or stable references—never return fresh object/array literals (`{ a: s.a, b: s.b }`) from a selector without shallow equality or separate selectors.

## 3. Optimistic UI & async lifecycle

- **Local drafts only**: Optimistic controls must use `useOptimisticSetting` (or an equivalent local draft + monotonic `requestRef` counter) so the authoritative store slice is updated only by Go responses.
- **Out-of-order safety**: Ensure a slower earlier commit cannot clear a newer draft (`request === requestRef.current`), and a failed commit clears the draft so the UI falls back to the authoritative Go value.
- **Effect cleanup**:
  - Unsubscribe every `Events.On` listener in `useEffect` cleanup.
  - Cancel or ignore stale async work (`AbortController`, `cancelled` flag, or request counter) on unmount or dependency change (e.g., `hydrate`, debounced probes).
- **Avoid redundant effects**: Do not sync props/store values into local `useState` via `useEffect` when the value can be derived during render.

## 4. TypeScript safety & frontend conventions (`frontend/AGENTS.md`)

- **Strictness watch**: `frontend/tsconfig.json` has `strict: true` but `noImplicitAny: false`, `noUnusedLocals: false`, and `noUnusedParameters: false`. Actively flag implicit `any`, unsafe type assertions (`as Foo`), non-null assertions (`!`) on nullable backend/DOM values, and dead variables/imports.
- **Component hygiene**:
  - One React component per file; export component prop types.
  - Extract repeated UI patterns cleanly; keep components readable and focused on presentation.
  - Keep user-visible text consistent with `frontend/src/i18n/` where i18n is used.
- **Tests**: Check that state synchronization changes have focused Vitest tests covering stale revisions, out-of-order events, optimistic commit + failure rollback, abort/cleanup, and reference preservation.
