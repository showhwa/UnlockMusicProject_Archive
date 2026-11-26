package adb

import (
	"context"

	"git.um-react.app/um/um-conv/app/cmd"
)

// Client talks to adb. Run defaults to cmd.CallCommandContext.
type Client struct {
	Path string
	Run  func(context.Context, string, []string) (cmd.CallResult, error)
}
