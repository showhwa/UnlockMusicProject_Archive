package cmd

import (
	"errors"
	"fmt"
	"strings"
)

type CallResult struct {
	Stdout   string
	Stderr   string
	ExitCode int
}

// Failed reports whether the process did not complete successfully.
func (r CallResult) Failed(runErr error) bool {
	return runErr != nil || r.ExitCode != 0
}

// Error builds an error that includes exit code, stdout, and stderr.
// A non-nil runErr stays reachable through errors.Is and errors.As.
func (r CallResult) Error(prefix string, runErr error) error {
	stdout := strings.TrimSpace(r.Stdout)
	stderr := strings.TrimSpace(r.Stderr)
	var tail strings.Builder
	fmt.Fprintf(&tail, " (exit=%d)", r.ExitCode)
	if stdout != "" {
		fmt.Fprintf(&tail, "\nstdout: %s", stdout)
	}
	if stderr != "" {
		fmt.Fprintf(&tail, "\nstderr: %s", stderr)
	}
	if runErr == nil {
		if stdout == "" && stderr == "" {
			tail.WriteString(": command failed with no output")
		}
		return errors.New(prefix + tail.String())
	}
	return fmt.Errorf("%s: %w%s", prefix, runErr, tail.String())
}

func (r CallResult) ExtractLinePairObject() map[string]string {
	obj := make(map[string]string)

	var key, value string
	isKey := true
	for line := range strings.SplitSeq(r.Stdout, "\n") {
		if isKey {
			key = strings.TrimSpace(line)
			isKey = false
		} else {
			value = strings.TrimSpace(line)
			isKey = true
			obj[key] = value
		}
	}
	return obj
}
