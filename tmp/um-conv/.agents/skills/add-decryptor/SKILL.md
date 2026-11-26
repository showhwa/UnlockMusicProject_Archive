---
name: add-decryptor
description: Workflow for adding or updating encrypted music decryptors in um-conv. Use when integrating a new um_cli_rs subcommand or encrypted format, updating extension registration order, or adding player labels and decryptor tests.
---

# add-decryptor

Use this workflow together with `AGENTS.md` when adding a new encrypted format or updating an existing decryptor under `app/algo/`.

## Check the CLI contract first

- Before coding, inspect the real binary if available locally (`bin/bin/um_cli_rs.exe`, `bin/bin/um_cli_rs`, or `um_cli_rs` on `PATH`) with `<subcommand> --help` to confirm exact flags (`-I`, `--output`, `--ekey`) and `--` separator support.

## Implement `app/algo/<format>/`

- Name the directory and Go package after the format abbreviation (`kgm`, `kwm`, `ncm`, `qmc`), even when the `um_cli_rs` subcommand differs (for example, `kuwo` -> `kwm`, `qmc2` -> `qmc`).
- Follow `app/algo/kwm/kwm.go` and `app/algo/kgm/kgm.go` as the current template (prefer over older `ncm`/`qmc`):
  - Implement `protocol.Algo` with `New(ctx context.Context, settings *protocol.Settings) *Algo`.
  - Keep an injectable `run func(context.Context, string, []string) (cmd.CallResult, error)` defaulting to `cmd.CallCommandContext`.
  - Place `--` before `<input>` so paths starting with `-` are not parsed as flags.
  - Propagate `ctx.Err()` on command failure or cancellation.
  - When versions or modes vary, probe first with `-I`, parse the JSON header, and reject unsupported variants with clear user-facing errors without invoking decryption.
  - Verify the decrypted output with `decryptout.Validate` (`app/utils/decryptout`: must exist, be a regular file, and be non-empty).

## Wire into `app/service/convert/`

- **Declare all extensions on the algorithm**: `GetSupportedExtensions()` should return every extension the format supports, including extensions shared with existing decryptors (such as `.mflac`/`.mgg`).
- **Control collision precedence via registration order**: `DecryptAlgorithms` in `app/service/convert/registry.go` is the shared constructor list. `newAlgoRegistry` uses first-registration-wins. Keep higher-priority decryptors earlier in the slice and comment any shared-extension precedence.
- **Declare the about-page category**: implement `PopulateSupportedFormats` with one category name and the labels shown in its tooltip. `app/formats.go` calls decryptors in `DecryptAlgorithms` order after the plain media group. File matching still uses `GetSupportedExtensions`; do not list shared suffixes that another decryptor owns on the about page.
- **Add player labels**: Add a case for the new algorithm type to `playerLabel` in `app/service/convert/registry.go`. `encryptedPlayerByExt` (`source.go`) is derived from the registry, so each extension the algorithm claims gets the label automatically. Missing labels fail `TestEncryptedExtensionsHavePlayerNames` and cause `ff.ProbeMedia` to run on encrypted files.
- **Skip Wails bindings and frontend edits unless contracts change**: `app/service/convert/formats.go` (`supportedInputExts`, `isMediaFile`, `inputFilterGlob`) and `app/service/convert/preflight.go` (`queueNeedsDecrypt` -> `um_cli_rs` lookup) pick up newly registered extensions automatically. The about page reads `supportedFormatGroups()` through `AppInfoService`.

## Test and document

- Add unit tests in `app/algo/<format>/<format>_test.go` covering `GetSupportedExtensions`, happy-path CLI arguments and output, unsupported versions, invalid JSON, CLI errors, `context.Canceled` propagation, and missing/empty/directory output validation.
- Add conversion tests in `app/service/convert/registry_test.go` and `app/service/convert/source_test.go` covering registration, case-insensitive `isMediaFile`/`queueNeedsDecrypt`, `inputFilterGlob()`, player labels, and explicit type assertions pinning precedence for any overlapping extensions. Extend `app/formats_test.go` when the about-page category or labels change.
- Keep scope tight: do not alter unrelated pre-existing tests unless asked.
- Update `README.md` (intro, supported formats, and decryptor details) and `docs/architecture.md` (directory tree and decrypt pipeline).
- Format only changed Go files with `gofmt -w` and run targeted tests plus `go test ./...`.
