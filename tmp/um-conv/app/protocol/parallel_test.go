package protocol

import (
	"runtime"
	"testing"
)

func TestResolveParallel_Disabled(t *testing.T) {
	if got := ResolveParallel(false, 8); got != 1 {
		t.Fatalf("got %d want 1", got)
	}
}

func TestResolveParallel_ZeroOrNegativeUsesNumCPU(t *testing.T) {
	want := runtime.NumCPU()
	if want < 1 {
		want = 1
	}
	if want > MaxParallel {
		want = MaxParallel
	}
	for _, parallel := range []int{0, -3} {
		if got := ResolveParallel(true, parallel); got != want {
			t.Fatalf("parallel=%d: got %d want %d", parallel, got, want)
		}
	}
}

func TestResolveParallel_Explicit(t *testing.T) {
	if got := ResolveParallel(true, 4); got != 4 {
		t.Fatalf("got %d want 4", got)
	}
}

func TestResolveParallel_Capped(t *testing.T) {
	if got := ResolveParallel(true, 999); got != MaxParallel {
		t.Fatalf("got %d want %d", got, MaxParallel)
	}
}
