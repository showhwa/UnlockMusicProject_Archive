# Agent guide — um-cli

Unlock Music CLI (`um`): decrypt vendor-locked audio files to raw streams, optionally rewrite tags/cover with ffmpeg.

Module path: `git.um-react.app/um/cli`  
Entry point: `cmd/um/main.go`

## Quick commands

```bash
go test ./...
go build -o um ./cmd/um
./um -h
./um --supported-ext
```

CI (`.gitea/workflows/build.yml`): `go test ./...` then cross-build `linux|windows|darwin` × `amd64|arm64`, `CGO_ENABLED=0`, Go `^1.25`.

Optional runtime deps (not needed to compile):

- `ffmpeg` / `ffprobe` — only when `--update-metadata` is set
- Windows: `qmpc-mmkv-cli.exe` for automatic QMC keys
- Windows: KuGou `KGMusicV3.db` for `.kgg` (KGMv5)

## Layout

```
cmd/um/          CLI flags, directory walk / watch, decode → write pipeline
algo/
  common/        Decoder interfaces, registry, raw “noop” passthrough, CryptoParams
  ncm/ kgm/ kwm/ qmc/ tm/ xiami/ ximalaya/   one package per format family
internal/
  ffmpeg/        metadata + album art via ffmpeg/ffprobe
  mmkv/          MMKV file read + QMCKeys merge/normalize
  sniff/         audio/image magic → extension
  utils/         crypto helpers, temp files, unicode normalize
  logging/       zap helpers (mostly unused; logger still global in main)
misc/            release/repack scripts
```

Do not invent new top-level packages; put shared non-algo code under `internal/`.

## Architecture (decode path)

1. `main` resolves input/output, loads crypto side-data into `common.CryptoParams`.
2. `common.GetDecoder(path, skipNoop)` matches **filename suffix** (lowercased base name; multi-dot suffixes like `.kgm.flac` supported).
3. For each matching `DecoderFactory`, `Create` → `Validate()`. First success wins.
4. Decrypted bytes are read via `io.Reader`; first 64 bytes sniffed for output extension.
5. Without `--update-metadata`: stream copy to output. With it: optional `AudioMetaGetter` / `CoverImageGetter`, then `ffmpeg.UpdateMeta`.

Key types (`algo/common/interface.go`):

- `Decoder` — `Validate() error` + `io.Reader`
- `StreamDecoder` — `Decrypt(buf []byte, offset int)` for stream ciphers
- `AudioMetaGetter` / `CoverImageGetter` — optional, used only with `--update-metadata`

Registration (`algo/common/dispatch.go`):

```go
func init() {
    common.RegisterDecoder("ext", false /* noop */, NewDecoder)
}
```

Format packages are blank-imported from `cmd/um/main.go` so `init()` runs. New format packages **must** be blank-imported there.

`noop == true` means “looks like plaintext audio” (see `algo/common/raw.go`). Default CLI skips them (`--skip-noop` defaults true).

## CryptoParams / keys

```go
type CryptoParams struct {
    KggDbPath string      // KuGou KGMv5
    QmcKeys   QMCKeys     // map[normalizedName]ekey
}
```

QMC key merge order in `appMain` (later maps overwrite earlier on same key):

1. `qmc.LoadMMKVOrDefault` — **platform build tags**
   - `key_mmkv_loader_darwin.go` — QQ Music Mac v8 / v10
   - `key_mmkv_loader_windows.go` — runs `qmpc-mmkv-cli`
   - `key_mmkv_loader_default.go` — other OS: empty
2. `qmc.LoadUserMMKV(--qmc-mmkv, --qmc-mmkv-key)` — soft-fail
3. `qmc.LoadAndroidDB(--qmc-android-db)` — soft-fail; tables `audio_file_ekey_table` or `EKeyFileInfo`

Always normalize map keys/values with `internal/utils.NormalizeUnicode` (NFC) when adding loaders.

KGG: `algo/kgm/pc_kugou_db` — real decrypt in `cipher_windows.go` (filename build constraint); stub on `!windows`.

## Adding or changing a decoder

1. Prefer extending an existing `algo/<vendor>` package over a new top-level package.
2. Implement `Validate` (seek/parse headers, init cipher) then `Read` (decrypt in place with absolute offset).
3. Register every real-world extension in `init()`; QMC already lists many aliases (Weiyun hex names, `mflac*` / `mgg*` suffixes).
4. Blank-import the package from `cmd/um` if new.
5. Pass secrets only via `DecoderParams.CryptoParams`, never globals.
6. Soft-fail optional key sources with `logger.Warn`; hard-fail only when decrypt cannot proceed.
7. Add `_test.go` next to the cipher/loader you touch; keep fixtures small.

Optional metadata: implement `AudioMetaGetter` / `CoverImageGetter` on the same decoder type.

## Platform / build tags

| Pattern | Purpose |
|---------|---------|
| `*_darwin.go` / `*_windows.go` | OS-specific implementations |
| `//go:build !windows` etc. | Explicit stubs |
| `algo/qmc/qmmac/` | macOS QQ Music MMKV helpers |

Do not call Windows-only or Darwin-only APIs from untagged files. Prefer stub + real file pairs over runtime `GOOS` switches when the whole API is unavailable.

## Conventions

- Errors: wrap with `%w` and a short package prefix (`qmc init cipher:`, `kgm v5:`).
- Logging: `*zap.Logger` from `DecoderParams.Logger` inside algo code; CLI still uses a package-level logger in `main` (do not expand that pattern).
- No new dependencies without need; prefer stdlib + existing modules (`urfave/cli/v2`, `zap`, `go-mmkv`, `modernc.org/sqlite`).
- Do not commit built binaries (`/um`, `*.exe` — see `.gitignore`).
- User-facing docs: keep `README.md` accurate when changing flags or Go version; keep `CHANGELOG.md` under `[Unreleased]` for notable behavior changes.
- Scope: this repo is the CLI only; crypto shared with web may live in sibling `um` projects — do not assume web TS sources are present here.

## Useful file map

| Task | Start here |
|------|------------|
| CLI flags / pipeline | `cmd/um/main.go` |
| Register / dispatch | `algo/common/dispatch.go`, `interface.go` |
| QMC decrypt / footer | `algo/qmc/qmc.go`, `key_derive.go`, `cipher_*.go` |
| QMC keys | `algo/qmc/key_mmkv_loader*.go`, `key_android_db_loader.go` |
| KGM / KGG | `algo/kgm/`, `algo/kgm/pc_kugou_db/` |
| NCM | `algo/ncm/` |
| Metadata rewrite | `internal/ffmpeg/` |

## Tests

```bash
go test ./algo/qmc/ -count=1
go test ./... -count=1
```

Prefer table-driven tests; avoid network in unit tests. Platform-specific tests may no-op or skip off-target OS.
