package main

import (
	"embed"

	"git.um-react.app/um/um-conv/app"
)

//go:embed all:frontend/dist
var assets embed.FS

// AppVersion and AppCommit are injected with -ldflags.
// Both just build-prod-win32 and CI compute AppVersion via
// `git describe --tags --always --dirty` and AppCommit via the short HEAD hash.
// Outside a git repository, and for just dev / just build, the defaults below stay.
var (
	AppVersion = "v0.0.0"
	AppCommit  = "custom"
)

func main() {
	app.Run(AppVersion, AppCommit, &assets)
}
