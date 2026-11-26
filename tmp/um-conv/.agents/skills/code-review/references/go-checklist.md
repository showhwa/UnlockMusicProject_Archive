# Go Code Review Checklist (`um-conv`)

Use this checklist when reviewing Go files under `app/`, `main.go`, or `scripts/`.

## 1. Authoritative state & persistence (`app/protocol`, `app/settingstore`)

- **Commit order**: In `settingstore`, settings must be validated/repaired (`prepareSettings`, `protocol.RepairSettings`) and persisted to disk *before* updating in-memory state and incrementing `revision`. Failed disk writes must leave memory and revision unchanged.
- **Change notifications**: Signal channels (e.g., `Store.changed`) must be non-blocking (`select { case ch <- struct{}{}: default: }`) and sent *after* releasing mutexes or safely without deadlocking listeners.
- **Merge Patch safety**: RFC 7396 JSON Merge Patch updates (`PatchState`) must pass through the same validation/repair pipeline as full `Save` so partial patches cannot introduce invalid enum values, unknown format IDs, or inconsistent fields.
- **JSON/Wails contract hygiene**:
  - Use explicit JSON tags matching existing camelCase conventions.
  - Initialize slices serialized to the frontend (e.g., `make([]FileEntry, len(s.files))`) so empty collections serialize as `[]` rather than `null` when TS expects an array.

## 2. Concurrency, locking & snapshots (`app/service/*`)

- **Lock discipline**:
  - Protect all shared mutable fields with `mu sync.Mutex`.
  - Never hold a mutex while running external commands, doing disk/network I/O, calling `application.EmitEvent`, or invoking another lock-holding component in a way that risks deadlock or lock-order inversion.
- **Snapshot isolation**: Snapshot helpers (like `snapshotLocked`) must copy slice elements / mutable structs so subsequent mutations in Go cannot race with Wails serialization or callers.
- **Revision monotonicity**: Every state mutation that affects the frontend projection must increment the owning revision under the same lock before snapshotting/publishing.
- **Goroutine lifecycle**: Every goroutine must have a clear termination path (context cancellation or channel close) and must not leak on cancellation or repeated runs.

## 3. Subprocesses, context & filesystem (`app/algo`, `app/avconv`, `app/probe`, `app/adb`, `app/cmd`)

- **Context propagation**: Pass `context.Context` into `cmd.CallCommandContext` and long-running operations; check and propagate `ctx.Err()` on failure or cancellation.
- **CLI argument safety**: Never build shell command strings; pass argument slices directly and place `--` before user-controlled file paths (such as `<input>`) so filenames starting with `-` are not parsed as flags.
- **Output validation & cleanup**:
  - Verify decrypted/converted output files with `os.Stat` (exists, `Mode().IsRegular()`, `Size() > 0`) before treating the step as successful.
  - Clean up temporary files/directories on both success and error paths (`defer`), including extracted cover/metadata temp files.
- **Cross-platform builds**: Keep OS-specific behavior behind proper build tags (`_windows.go`, `_darwin.go`, `_linux.go`, `_other.go`), including Windows console hiding and `.exe` resolution.

## 4. Error handling & idiomatic Go

- **Error wrapping**: Wrap errors with `fmt.Errorf("...: %w", err)` when callers or tests inspect them via `errors.Is`/`errors.As`. Never silently discard errors from I/O, parsing, or state transitions.
- **Dependency injection**: Keep external command runners and stores injectable (e.g., `run func(...)` field on decryptors, `*settingstore.Store` injected into services) so unit tests stay fast and deterministic without real binaries.
- **Small, focused tests**: Verify new or changed behavior has focused unit tests covering happy paths, invalid input, cancellation (`context.Canceled`), revision ordering, and error/rollback paths.
