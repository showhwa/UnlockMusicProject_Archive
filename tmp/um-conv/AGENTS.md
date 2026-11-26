# Repository instructions

- Make the smallest coherent change. Start with affected code, callers, and nearby tests. Expand the search when the change crosses a boundary or the evidence requires it. Prefer `rg` when available (or `git ls-files`) over recursive directory scans so searches skip ignored and generated directories such as `frontend/node_modules`.
- For changes under `frontend/`, also read and follow `frontend/AGENTS.md`.
- Add or upgrade dependencies only when the task requires it and the user authorizes it. Use relevant skills in `.agents/skills/` and verify unfamiliar package behavior against official documentation or source.

## Go and Wails

- Go owns persisted, shared, and domain state, including settings, progress, jobs, defaults, supported values, and validation. Use generated bindings and backend-provided values in the frontend. Keep presentation state and drafts local, reconcile optimistic updates with backend results, and use backend revisions to reject stale snapshots, mutation responses, and events.
- Change the Go protocol and service first when the contract changes. Once stable, run `wails3 generate bindings -clean=true -time-type=Date -ts ./...` from the repository root and validate the generated changes.
- Use the `dev` skill (`.agents/skills/dev/SKILL.md`) for changes to authoritative state, Go/Wails contracts, or frontend state synchronized with Go.
- Use the `add-decryptor` skill (`.agents/skills/add-decryptor/SKILL.md`) when adding or updating encrypted music decryptors (such as `um_cli_rs` formats).

## Validation and review

- Format only changed files after implementation. Use `gofmt` for Go. Run the smallest checks that cover the change and add focused tests when existing coverage misses a regression risk.
- Run broader checks for shared behavior or cross-layer contracts, including `go test ./...` when those changes affect Go. Run the relevant build for build or packaging changes.
- Review the final diff yourself. For changes to Go/Wails contracts, persistence, concurrency, or asynchronous state synchronization, or when requested by the user, use one read-only reviewer when available. Verify its findings and rerun checks affected by fixes.
- Keep successful tool output brief. On failure, inspect the relevant error and enough context to diagnose it. Report validation and actionable review findings concisely.

## Commits

- Commit coherent, verified changes using the repository's message convention unless the user directs otherwise. Inspect the working tree and staged diff, and stage only task changes. Leave overlapping work uncommitted if it cannot be staged safely.
