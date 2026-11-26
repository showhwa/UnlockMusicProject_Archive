package protocol

import "runtime"

const MaxParallel = 256

// ResolveParallel returns the worker count for a convert run without mutating settings.
func ResolveParallel(enable bool, parallel int) int {
	if !enable {
		return 1
	}
	if parallel <= 0 {
		parallel = runtime.NumCPU()
	}
	if parallel < 1 {
		parallel = 1
	}
	if parallel > MaxParallel {
		return MaxParallel
	}
	return parallel
}
