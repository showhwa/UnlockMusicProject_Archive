# Frontend instructions

- Run commands from `frontend/` using the Node.js version in `.node-version` (run `fnm use` if the active version differs). Use `npm` only and preserve `package-lock.json`. For authorized dependency changes, update dependency metadata via `npm`, check for known CVEs, and prefer well-maintained libraries over new packages or custom boilerplate.
- Keep one React component per file and export component prop types. Extract repeated UI patterns into reusable components when warranted, and prefer code readability over minimizing line count.
- Load initial state through Go/Wails, subscribe to backend events when available, and refresh after lifecycle events that can make local state stale. Recover from failed optimistic mutations using backend-confirmed state.
- After implementation, format only changed frontend files with `npm exec -- prettier --write <changed-files...>`.
- Choose checks by impact. Run `npm run typecheck` for changes affecting types or their consumers, targeted `npm test -- <test-file>` for affected behavior with matching tests, and `npm run build` when validating bundling or build configuration. Run the full test suite for shared behavior or cross-layer contracts that affect the frontend.
