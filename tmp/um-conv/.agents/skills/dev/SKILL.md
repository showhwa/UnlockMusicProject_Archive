---
name: dev
description: Workflow for Go/Wails/React changes in um-conv. Use when developing or reviewing authoritative state, settings, conversion progress, revisions, generated bindings, or frontend synchronization.
---

# dev

Use this workflow together with `AGENTS.md` and, for frontend work, `frontend/AGENTS.md`. Those files remain authoritative for commands, formatting timing, package management, and completion review.

## Trace the data path

Before editing cross-layer behavior, trace the relevant path through:

1. Go protocol types in `app/protocol/`.
2. Persistence and authoritative state in `app/settingstore/` when settings are involved.
3. Wails-facing services in `app/service/`.
4. Generated frontend bindings and service calls.
5. Frontend stores, hooks, and components under `frontend/src/`.

Identify which Go snapshot, revision, mutation response, or event makes the frontend state authoritative. Keep presentation-only state local, but do not introduce a second business-state owner.

## Change contracts safely

- Change Go protocol and service contracts before their frontend consumers.
- Keep revision domains explicit. Reject stale responses or events independently when settings and session/job state use different revisions.
- Regenerate Wails bindings only after the Go contract is stable.
- Use generated types and backend-provided values in TypeScript instead of duplicating protocol shapes, defaults, validation, or supported-value catalogs.
- For optimistic UI, define confirmation and failure behavior. The backend-confirmed response must win.

## Verify behavior

- Add focused Go tests around authoritative state, persistence, validation, revisions, and service snapshots.
- Add focused frontend tests around event ordering, stale snapshots, optimistic updates, rollback or failure behavior, and reference preservation when relevant.
- Follow the formatting and validation sequence in `AGENTS.md` and `frontend/AGENTS.md`.
- If behavior depends on Wails, React, Zustand, Fluent UI, or another dependency and this skill does not establish it, verify the detail in current official documentation or source before relying on it.
