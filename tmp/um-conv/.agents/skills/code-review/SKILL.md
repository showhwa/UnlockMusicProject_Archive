---
name: code-review
description: >-
  Review Go, Wails, and TypeScript/React code changes in um-conv. Use when
  reviewing diffs, commits, PRs, or auditing code for Go-as-source-of-truth
  invariants, revision and concurrency safety, Wails bindings, and Go/TypeScript
  best practices.
---

# code-review

Use this skill together with `AGENTS.md` and `frontend/AGENTS.md` to perform structured, architecture-aware code reviews in `um-conv`.

## Review workflow

1. **Determine scope**: Identify the target diff, commits, or files. Read the full changed files (or surrounding functions) plus immediate callers and tests so findings are grounded in real context.
2. **Load layer checklists on demand**:
   - Read [references/go-checklist.md](./references/go-checklist.md) when reviewing Go code (`app/`, `main.go`, `scripts/`).
   - Read [references/ts-react-checklist.md](./references/ts-react-checklist.md) when reviewing frontend code (`frontend/src/`).
3. **Audit cross-layer architecture first** (section below), then apply the language-specific checklists.
4. **Verify before reporting**: Confirm every suspected defect against actual callers, types, and tests. Do not report speculative issues.
5. **Present findings by severity** using the output format below.

## Core architecture invariants (Go is the single source of truth)

Every review in `um-conv` must verify these repository invariants:

- **Authoritative state ownership**: Go (`app/protocol/`, `app/settingstore/`, `app/service/`) owns all persisted settings, defaults, validation/repair, supported-value catalogs (`OutputProfile`, formats, encoders), file queue, and job progress.
  - Flag frontend code that duplicates defaults, validation rules, format/encoder catalogs, or introduces a second owner for business state.
  - Presentation-only state and in-flight input drafts stay local to the frontend.
- **Cross-layer contracts and Wails bindings**:
  - Contract changes must start in `app/protocol/` and `app/service/`, followed by regenerating `frontend/bindings/` (`wails3 generate bindings -clean=true -time-type=Date -ts ./...`).
  - TypeScript must import shared types, service calls, and event names from `~protocol`, `~service/*`, and `~events` rather than redefining shapes or hardcoding event strings.
  - Raw Wails event payloads (`Events.On`) must be hydrated via generated `createFrom` models before entering the store.
- **Independent revision domains and ordering safety**:
  - `AppSnapshot` carries separate `revision` (session/queue/job) and `settingsRevision` (settings) counters.
  - Stale snapshots, out-of-order events, and slow mutation responses must be rejected independently per domain and must never overwrite newer authoritative state.
- **Optimistic UI and failure reconciliation**:
  - Optimistic values must remain local drafts (e.g., `useOptimisticSetting`) and never directly mutate authoritative store slices.
  - Backend-confirmed responses must win; failed mutations must reconcile back to authoritative Go state and surface errors cleanly.
- **Decrypt/convert pipeline integrity** (when touching `app/algo/`, `app/probe/`, `app/avconv/`, or `app/service/convert/`):
  - Check `DecryptAlgorithms` registration order for shared-extension precedence, `encryptedPlayerByExt` coverage, CLI `--` separator before input paths, `ctx.Err()` propagation, `os.Stat` output validation, and temp-file cleanup.
  - For parallel conversion sessions, verify workers share the session's `algoRegistry` instance (preserving per-session key loading), output paths are reserved/unreserved under the output-registry lock, and user cancellation only sets a stop flag without cancelling in-flight conversion `ctx`.

## Severity classification & output format

Group findings by severity and include exact `path:line` references, concrete impact, and a minimal fix direction:

- **Blocker**: Correctness bugs, data loss, race conditions/deadlocks, stale-revision state corruption, broken Go/Wails/TS contracts, command/path injection, or failing invariants.
- **Important**: Violations of Go-as-source-of-truth, duplicated defaults/validation, leaking business state into React, missing cleanup/abort handling, error swallowing, or missing tests for high-risk paths.
- **Nit**: Minor readability, idiomatic Go/TS polish, or small structural improvements.

Keep the review concise:
1. List findings ordered by severity (or explicitly state if no issues were found).
2. Note any missing test coverage for risky behavior.
3. Recommend the minimal verification commands for the changed scope (e.g., `go test ./...`, `npm run typecheck`, targeted `npm test -- <file>`).
