package adbkeys

import (
	"bytes"
	"compress/gzip"
	"context"
	"encoding/base64"
	"reflect"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"git.um-react.app/um/um-conv/app/adb"
	"git.um-react.app/um/um-conv/app/cmd"
)

func TestReadMapsLaterDeviceWins(t *testing.T) {
	c := adb.Client{Run: func(_ context.Context, _ string, args []string) (cmd.CallResult, error) {
		if reflect.DeepEqual(args, []string{"devices"}) {
			return cmd.CallResult{Stdout: "List of devices attached\ndev1\tdevice\ndev2\tdevice\n"}, nil
		}
		if len(args) != 4 || args[0] != "-s" || args[2] != "shell" {
			t.Fatalf("args = %q", args)
		}
		return cmd.CallResult{Stdout: base64.StdEncoding.EncodeToString(gzipBytes(t, []byte(args[1])))}, nil
	}}
	got, err := ReadMaps(context.Background(), c, "/data/keys", func(data []byte) (map[string]string, error) {
		return map[string]string{"k": string(data)}, nil
	})
	if err != nil {
		t.Fatal(err)
	}
	if got["k"] != "dev2" {
		t.Fatalf("merged = %#v, want dev2", got)
	}
}

func TestReadMapsSkipsFailedShell(t *testing.T) {
	c := adb.Client{Run: func(_ context.Context, _ string, args []string) (cmd.CallResult, error) {
		if args[0] == "devices" {
			return cmd.CallResult{Stdout: "List of devices attached\nonly\tdevice\n"}, nil
		}
		return cmd.CallResult{ExitCode: 7, Stderr: "su failed"}, nil
	}}
	_, err := ReadMaps(context.Background(), c, "/data/keys", func([]byte) (map[string]string, error) {
		t.Fatal("parser ran after a failed shell")
		return nil, nil
	})
	if err == nil || !strings.Contains(err.Error(), "从设备读取密钥失败") || !strings.Contains(err.Error(), "su failed") {
		t.Fatalf("error = %v", err)
	}
}

func gzipBytes(t *testing.T, data []byte) []byte {
	t.Helper()
	var buf bytes.Buffer
	zw := gzip.NewWriter(&buf)
	if _, err := zw.Write(data); err != nil {
		t.Fatal(err)
	}
	if err := zw.Close(); err != nil {
		t.Fatal(err)
	}
	return buf.Bytes()
}

func TestLoadDeviceMapsMissingAdb(t *testing.T) {
	t.Setenv("PATH", t.TempDir())
	_, err := LoadDeviceMaps(context.Background(), "", nil, "/data/keys", func([]byte) (map[string]string, error) {
		t.Fatal("parser ran without adb")
		return nil, nil
	})
	if err == nil || !strings.Contains(err.Error(), "找不到 adb") {
		t.Fatalf("error = %v", err)
	}
}

func TestReadMapsSerializesConcurrentCalls(t *testing.T) {
	tags := []string{"qmc", "kgm", "kwm"}
	payloads := make(map[string]string, len(tags))
	for _, tag := range tags {
		payloads[tag] = base64.StdEncoding.EncodeToString(gzipBytes(t, []byte(tag)))
	}

	var inFlight, maxInFlight atomic.Int32
	firstEntered := make(chan struct{})
	releaseFirst := make(chan struct{})
	var firstOnce sync.Once

	var mu sync.Mutex
	var callOrder []string

	makeClient := func(tag string) adb.Client {
		return adb.Client{Run: func(_ context.Context, _ string, args []string) (cmd.CallResult, error) {
			cur := inFlight.Add(1)
			for {
				prev := maxInFlight.Load()
				if cur <= prev || maxInFlight.CompareAndSwap(prev, cur) {
					break
				}
			}
			defer inFlight.Add(-1)

			mu.Lock()
			callOrder = append(callOrder, tag+":"+args[0])
			mu.Unlock()

			if args[0] == "devices" {
				if tag == tags[0] {
					firstOnce.Do(func() { close(firstEntered) })
					<-releaseFirst
				} else {
					time.Sleep(10 * time.Millisecond)
				}
				return cmd.CallResult{Stdout: "List of devices attached\ndev1\tdevice\n"}, nil
			}
			time.Sleep(10 * time.Millisecond)
			return cmd.CallResult{Stdout: payloads[tag]}, nil
		}}
	}

	type result struct {
		keys map[string]string
		err  error
	}
	results := make([]result, len(tags))
	var wg sync.WaitGroup

	// Start the first ReadMaps call and wait until it holds readMapsMu inside client.Run.
	wg.Add(1)
	go func() {
		defer wg.Done()
		got, err := ReadMaps(context.Background(), makeClient(tags[0]), "/data/keys-"+tags[0], func(data []byte) (map[string]string, error) {
			return map[string]string{"src": string(data)}, nil
		})
		results[0] = result{keys: got, err: err}
	}()

	<-firstEntered

	// Launch concurrent callers while the first ReadMaps call is blocked.
	for i := 1; i < len(tags); i++ {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()
			tag := tags[idx]
			got, err := ReadMaps(context.Background(), makeClient(tag), "/data/keys-"+tag, func(data []byte) (map[string]string, error) {
				return map[string]string{"src": string(data)}, nil
			})
			results[idx] = result{keys: got, err: err}
		}(i)
	}

	time.Sleep(20 * time.Millisecond)
	close(releaseFirst)
	wg.Wait()

	if got := maxInFlight.Load(); got != 1 {
		t.Fatalf("max in-flight calls = %d, want 1", got)
	}
	for i, tag := range tags {
		if results[i].err != nil {
			t.Fatalf("%s error = %v", tag, results[i].err)
		}
		if results[i].keys["src"] != tag {
			t.Fatalf("%s keys = %#v, want src=%q", tag, results[i].keys, tag)
		}
	}

	// Verify each caller's devices + shell calls stayed contiguous without interleaving.
	mu.Lock()
	defer mu.Unlock()
	if len(callOrder) != len(tags)*2 {
		t.Fatalf("callOrder = %v, want %d calls", callOrder, len(tags)*2)
	}
	for i := 0; i < len(callOrder); i += 2 {
		devTag, devOk := strings.CutSuffix(callOrder[i], ":devices")
		shellTag, shellOk := strings.CutSuffix(callOrder[i+1], ":-s")
		if !devOk || !shellOk || devTag != shellTag {
			t.Fatalf("interleaved ReadMaps calls at %d..%d: %v", i, i+1, callOrder)
		}
	}
}
