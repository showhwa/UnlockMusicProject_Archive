package cmd

import (
	"bytes"
	"context"
	"os/exec"

	"git.um-react.app/um/um-conv/app/utils"
)

func CallCommandContext(ctx context.Context, program string, args []string) (CallResult, error) {
	var stdout bytes.Buffer
	var stderr bytes.Buffer

	cmd := exec.CommandContext(ctx, program, args...)
	utils.HideConsoleWindow(cmd)
	cmd.Stdin = nil
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err := cmd.Run()
	exitCode := -1 // process never started
	if cmd.ProcessState != nil {
		exitCode = cmd.ProcessState.ExitCode()
	}
	return CallResult{
		Stdout:   stdout.String(),
		Stderr:   stderr.String(),
		ExitCode: exitCode,
	}, err
}

func CallCommand(program string, args []string) (CallResult, error) {
	return CallCommandContext(context.Background(), program, args)
}
