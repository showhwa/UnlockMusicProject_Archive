package qmc

import (
	"context"
	"errors"
	"fmt"
	"path/filepath"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"git.um-react.app/um/um-conv/app/cmd"
	"git.um-react.app/um/um-conv/app/protocol"
)

func TestGetMusicExEkeyReportsMissingTool(t *testing.T) {
	missing := filepath.Join(t.TempDir(), "missing-qmpc-mmkv-cli.exe")
	algo := NewQMPCAlgo(t.Context(), &protocol.Settings{
		Binaries: protocol.BinariesSettings{QmpcMmkvCli: missing},
	})

	_, err := algo.GetMusicExEkeyByMediaFilename("media.mflac", 0)
	if err == nil {
		t.Fatal("expected missing qmpc-mmkv-cli error")
	}
	for _, part := range []string{"MusicEx", "qmpc-mmkv-cli"} {
		if !strings.Contains(err.Error(), part) {
			t.Fatalf("error %q does not contain %q", err, part)
		}
	}
}

func TestGetMusicExEkeySerializesConcurrentCalls(t *testing.T) {
	mmkv := fakeExecutable(t, "qmpc-mmkv-cli.exe")
	algo := NewQMPCAlgo(t.Context(), &protocol.Settings{
		Binaries: protocol.BinariesSettings{QmpcMmkvCli: mmkv},
	})

	var inFlight, maxInFlight atomic.Int32
	firstEntered := make(chan struct{})
	releaseFirst := make(chan struct{})
	var firstOnce sync.Once

	var mu sync.Mutex
	attempts := make(map[string]int)
	var callOrder []string

	algo.run = func(_ context.Context, program string, args []string) (cmd.CallResult, error) {
		if program != mmkv {
			return cmd.CallResult{}, fmt.Errorf("unexpected program %q, want %q", program, mmkv)
		}
		cur := inFlight.Add(1)
		for {
			prev := maxInFlight.Load()
			if cur <= prev || maxInFlight.CompareAndSwap(prev, cur) {
				break
			}
		}
		defer inFlight.Add(-1)

		filename := args[len(args)-1]
		mu.Lock()
		attempts[filename]++
		attempt := attempts[filename]
		callOrder = append(callOrder, filename)
		mu.Unlock()

		if filename == "a.mflac" && attempt == 1 {
			firstOnce.Do(func() { close(firstEntered) })
			<-releaseFirst
			return cmd.CallResult{ExitCode: 5}, nil
		}
		if filename == "b.mflac" && attempt == 1 {
			time.Sleep(10 * time.Millisecond)
			return cmd.CallResult{ExitCode: 5}, nil
		}
		time.Sleep(10 * time.Millisecond)
		return cmd.CallResult{Stdout: filename + "\nekey-" + filename + "\n"}, nil
	}

	type result struct {
		ekey string
		err  error
	}
	files := []struct {
		name    string
		retries int
	}{
		{name: "a.mflac", retries: 1},
		{name: "b.mflac", retries: 1},
		{name: "c.mflac", retries: 0},
	}
	results := make([]result, len(files))
	var wg sync.WaitGroup

	// Start the first lookup and wait until it holds ekeyMu inside algo.run.
	wg.Add(1)
	go func() {
		defer wg.Done()
		ekey, err := algo.GetMusicExEkeyByMediaFilename(files[0].name, files[0].retries)
		results[0] = result{ekey: ekey, err: err}
	}()

	<-firstEntered

	// Launch additional concurrent lookups while the first lookup is still running.
	for i := 1; i < len(files); i++ {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()
			ekey, err := algo.GetMusicExEkeyByMediaFilename(files[idx].name, files[idx].retries)
			results[idx] = result{ekey: ekey, err: err}
		}(i)
	}

	time.Sleep(20 * time.Millisecond)
	close(releaseFirst)
	wg.Wait()

	if got := maxInFlight.Load(); got != 1 {
		t.Fatalf("max in-flight calls = %d, want 1", got)
	}
	for i, f := range files {
		if results[i].err != nil {
			t.Fatalf("%s error = %v", f.name, results[i].err)
		}
		wantEkey := "ekey-" + f.name
		if results[i].ekey != wantEkey {
			t.Fatalf("%s ekey = %q, want %q", f.name, results[i].ekey, wantEkey)
		}
	}

	// Verify retries stayed contiguous under ekeyMu without interleaving other callers.
	mu.Lock()
	defer mu.Unlock()
	if len(callOrder) != 5 {
		t.Fatalf("callOrder = %v, want 5 total calls", callOrder)
	}
	if callOrder[0] != "a.mflac" || callOrder[1] != "a.mflac" {
		t.Fatalf("a.mflac retry was interleaved: callOrder = %v", callOrder)
	}
	bFirst := -1
	for i, name := range callOrder {
		if name == "b.mflac" {
			bFirst = i
			break
		}
	}
	if bFirst < 0 || bFirst+1 >= len(callOrder) || callOrder[bFirst+1] != "b.mflac" {
		t.Fatalf("b.mflac retry was interleaved: callOrder = %v", callOrder)
	}
}

func TestGetMusicExEkeySkipsRunWhenCancelledWhileWaiting(t *testing.T) {
	mmkv := fakeExecutable(t, "qmpc-mmkv-cli.exe")
	ctx, cancel := context.WithCancel(t.Context())
	defer cancel()

	algo := NewQMPCAlgo(ctx, &protocol.Settings{
		Binaries: protocol.BinariesSettings{QmpcMmkvCli: mmkv},
	})

	firstEntered := make(chan struct{})
	releaseFirst := make(chan struct{})
	var runCalls atomic.Int32

	algo.run = func(_ context.Context, _ string, args []string) (cmd.CallResult, error) {
		runCalls.Add(1)
		close(firstEntered)
		<-releaseFirst
		return cmd.CallResult{ExitCode: 1}, context.Canceled
	}

	var wg sync.WaitGroup
	var err1, err2 error

	wg.Add(1)
	go func() {
		defer wg.Done()
		_, err1 = algo.GetMusicExEkeyByMediaFilename("a.mflac", 0)
	}()

	<-firstEntered

	wg.Add(1)
	go func() {
		defer wg.Done()
		_, err2 = algo.GetMusicExEkeyByMediaFilename("b.mflac", 0)
	}()

	time.Sleep(20 * time.Millisecond)
	cancel()
	close(releaseFirst)
	wg.Wait()

	if !errors.Is(err1, context.Canceled) {
		t.Fatalf("err1 = %v, want context.Canceled", err1)
	}
	if !errors.Is(err2, context.Canceled) {
		t.Fatalf("err2 = %v, want context.Canceled", err2)
	}
	if got := runCalls.Load(); got != 1 {
		t.Fatalf("runCalls = %d, want 1 (waiting caller must skip run after cancel)", got)
	}
}
