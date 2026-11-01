# AGENTS.md — Unlock Music (um-react)

Browser SPA that decrypts locally selected encrypted music files (no upload). React rewrite of Unlock Music.

Hosted at [git.um-react.app/um/um-react](https://git.um-react.app/um/um-react). Crypto algorithms live in `@unlock-music/crypto` (WASM), **not** in this repo.

## Quick start

```sh
corepack prepare pnpm@12.14.0 --activate
pnpm i --frozen-lockfile
pnpm start          # http://localhost:5173/
pnpm test           # vitest run (also pre-push)
pnpm lint
pnpm build          # tsc -p tsconfig.prod.json && vite build && write-version
```

- **Package manager:** pnpm `@12.14.0` (`engineStrict`)
- **Node:** `24.22.0` (`devEngines`)
- **TypeScript:** stay on **6.x** (do not bump to 7)
- **Registry:** `@unlock-music/*` from `git.um-react.app` (see `.npmrc`)
- App **does not support subdirectory deploy**

## Architecture

```
Main thread (UI / Redux / key import)
  SelectFile → blob URL → fileListingSlice.processFile
    → keyLookup(production settings) → DecryptCommandOptions
    → DecryptionQueue → WorkerClientBus
Web Worker (decrypt-worker)
  fetch(blobURI) → try Deciphers in order → blob URL result
```

- Blob URIs are passed via `postMessage`; worker loads bytes with `fetch`.
- Single worker today (`decrypt-worker/client.ts`); concurrency via `ConcurrentQueue` (default 5).
- Key DB / MMKV parsing runs on the **main thread** (`util/sqlite.ts`, `util/mmkv/`, `util/DatabaseKeyExtractor.ts`).

### Entry points

| Concern                | Path                                                  |
| ---------------------- | ----------------------------------------------------- |
| Bootstrap              | `src/main.tsx` → `src/components/AppRoot.tsx`         |
| Redux store            | `src/store.ts` (`fileListing` + `settings` only)      |
| Typed hooks            | `src/hooks.ts`                                        |
| Decrypt queue UI       | `src/features/file-listing/`                          |
| Settings + persist     | `src/features/settings/`                              |
| Worker client / server | `src/decrypt-worker/client.ts`, `worker.ts`           |
| Decipher registry      | `src/decrypt-worker/Deciphers.ts` (**order matters**) |
| Path alias             | `~/*` → `src/*`                                       |

### Routes (`AppRoot`)

| Path           | Tab                        |
| -------------- | -------------------------- |
| `/`            | Main unlock UI             |
| `/settings/*`  | Settings (`SETTINGS_TABS`) |
| `/questions/*` | FAQ (`FAQ_PAGES`)          |

## `src/` layout

| Dir               | Role                                                                  |
| ----------------- | --------------------------------------------------------------------- |
| `components/`     | Shared UI (AppRoot, Dialog, key import, downloads) — **no `App.tsx`** |
| `tabs/`           | Top-level route shells                                                |
| `features/`       | Domain modules (see below)                                            |
| `decrypt-worker/` | Worker + `decipher/*` + worker parsers                                |
| `faq/`            | FAQ pages + registry                                                  |
| `util/`           | Queues, worker bus, SQLite/MMKV, downloads, helpers                   |
| `test-utils/`     | Vitest setup + `renderWithProviders`                                  |

### Features

| Folder          | Purpose                                                            |
| --------------- | ------------------------------------------------------------------ |
| `settings/`     | Staging/production slice, persistence, general panel, tab registry |
| `file-listing/` | Decrypt queue + `processFile` thunk                                |
| `nav/`          | Settings/FAQ nested nav                                            |
| `qmc/`          | QQ Music QMCv2 keys                                                |
| `kwm/`          | Kuwo KWMv2 keys                                                    |
| `kugou/`        | Kugou KGG/KGM keys                                                 |
| `qtfm/`         | QingTing FM device key                                             |

Provider features typically contain: `types.ts`, `importKeys.ts`, `keyLookup.ts`, `panel/`, `instructions/`, `__tests__/`. They do **not** own Redux slices — they plug into `settingsSlice`.

## Settings model (critical)

- **`staging`**: editable UI state (key rows with `id`).
- **`production`**: committed shape used for decrypt + `localStorage` (`um-react-settings`).
- Decrypt **`keyLookup` selectors always read `production`**. Dirty settings must be committed (保存) before decrypt sees them.
- Persist: `features/settings/persistSettings.ts` (debounced save; `mergeSettings` on load).
- Key-list CRUD: `createKeyListReducers.ts` for `qmc2` / `kwm2` / `kugou`.

**Route id ≠ Redux key** (do not “fix” rename persist keys):

| Route  | Redux / persist |
| ------ | --------------- |
| `qmc`  | `qmc2`          |
| `kwm`  | `kwm2`          |
| `kgg`  | `kugou`         |
| `qtfm` | `qtfm`          |

## Adding / changing a music format

1. Prefer implementing crypto in `@unlock-music/crypto` / `lib_um_crypto_rust` (see `docs/develop-with-um_crypto.zh.md`).
2. Add `src/decrypt-worker/decipher/YourFormat.ts` implementing `DecipherInstance`.
3. Register factory in `Deciphers.ts` at the right priority (fixed header → footer → expensive full-file last).
4. If user keys needed: extend `DecryptCommandOptions`; add `features/<name>/` + wire `settingsSlice`, `persistSettings.mergeSettings`, `settingsTabs.tsx`.
5. If header parse needed before decrypt: worker action in `actions.ts` / `worker.ts` / `worker/*`, call from `fileListingSlice.processFile`.
6. Tests + README supported-formats / FAQ as appropriate.

## UI & copy

- Tailwind CSS 4 + **DaisyUI 5** (`src/App.css`). Prefer existing patterns (`btn`, `modal`, `list`, `alert`, …).
- Shared: `Dialog`, `KeyListContainer`, `ImportSecretModal`, `HelpText/*`, `react-icons`.
- **No i18n library** — user-facing strings are hard-coded Simplified Chinese (some Traditional phrasing exists; match nearby copy).
- Import from `react-router` (v8), not `react-router-dom`.

## Testing

- Vitest + jsdom; `globals: true`; setup `src/test-utils/setup-jest.ts` (mocks `Worker`, `matchMedia`).
- Colocate under `__tests__/` as `*.test.ts(x)`.
- Components: `renderWithProviders` from `src/test-utils/test-helper.tsx`.
- Selectors/converters: mini-store or `setupStore({ preloadedState })`.
- Contribution rule: coverage must not drop below main branch; Prettier + ESLint clean before PR.
- Hooks: `pre-commit` → lint-staged; `pre-push` → `pnpm test`.

## Tooling gotchas

| Topic             | Note                                                                                                 |
| ----------------- | ---------------------------------------------------------------------------------------------------- |
| WASM              | `vite-plugin-wasm`; exclude `@unlock-music/crypto` from `optimizeDeps`; worker awaits crypto `ready` |
| Local crypto link | `LIB_UM_WASM_LOADER_DIR` / pnpm link; Vite `server.fs.allow`                                         |
| sql.js            | Patched via `pnpm-workspace.yaml` → `patches/sql.js.patch`; alias `@sql-wasm`                        |
| PWA               | `vite-plugin-pwa`; `src/dummy.mjs` aliases `module` for Workbox                                      |
| Prettier          | singleQuote, printWidth 120                                                                          |
| Unused vars       | prefix with `_` (ESLint)                                                                             |
| CI                | `.gitea/workflows/build.yaml` (build, zip, win64, Netlify deploy)                                    |

## Docs to read first

| Doc                                        | When                                        |
| ------------------------------------------ | ------------------------------------------- |
| `README.MD`                                | Formats, architecture summary, contribution |
| `docs/getting-started.zh.md`               | Install / build / pack                      |
| `docs/develop-with-um_crypto.zh.md`        | Crypto SDK local development                |
| `docs/faq_zh-hans.md` / `docs/adb_dump.md` | User FAQ / ADB key dump                     |

## Agent working rules for this repo

- Prefer **surgical edits**; match existing DaisyUI/Tailwind and feature folder patterns.
- Do not rename `kugou` persist key or casually change staging↔production semantics.
- Do not move heavy crypto into the main thread; keep decryption in the worker.
- Do not invent an i18n framework for one-off strings.
- Run `pnpm test` / `pnpm lint` after behavioral changes when practical.
- Crypto algorithm work usually belongs upstream in `@unlock-music/crypto`, not duplicated here.
