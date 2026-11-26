package convert

import (
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"testing"

	"git.um-react.app/um/um-conv/app/protocol"
)

func TestOutputRegistry_OverwriteSessionConflict(t *testing.T) {
	dir := t.TempDir()
	outDir := filepath.Join(dir, "out")
	if err := os.MkdirAll(outDir, 0o755); err != nil {
		t.Fatal(err)
	}
	src1 := filepath.Join(dir, "a", "song.mflac")
	src2 := filepath.Join(dir, "b", "song.ncm")
	if err := os.MkdirAll(filepath.Dir(src1), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(filepath.Dir(src2), 0o755); err != nil {
		t.Fatal(err)
	}
	settings := protocol.Settings{
		OutputTarget:       protocol.OutputTargetCustom,
		OutputDir:          outDir,
		ExistingOutputMode: protocol.ExistingOutputOverwrite,
	}
	reg := newOutputRegistry()

	path1, skipped, err := reg.reserve(src1, settings, "mp3")
	if err != nil || skipped {
		t.Fatalf("first reserve: path=%q skipped=%v err=%v", path1, skipped, err)
	}
	_, _, err = reg.reserve(src2, settings, "mp3")
	if err == nil {
		t.Fatal("expected session overwrite conflict")
	}
}

func TestOutputRegistry_SkipAfterSessionWrite(t *testing.T) {
	dir := t.TempDir()
	outDir := filepath.Join(dir, "out")
	if err := os.MkdirAll(outDir, 0o755); err != nil {
		t.Fatal(err)
	}
	src1 := filepath.Join(dir, "a", "song.mflac")
	src2 := filepath.Join(dir, "b", "song.ncm")
	if err := os.MkdirAll(filepath.Dir(src1), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(filepath.Dir(src2), 0o755); err != nil {
		t.Fatal(err)
	}
	settings := protocol.Settings{
		OutputTarget:       protocol.OutputTargetCustom,
		OutputDir:          outDir,
		ExistingOutputMode: protocol.ExistingOutputSkip,
	}
	reg := newOutputRegistry()

	path1, _, err := reg.reserve(src1, settings, "mp3")
	if err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path1, []byte("x"), 0o644); err != nil {
		t.Fatal(err)
	}
	path2, skipped, err := reg.reserve(src2, settings, "mp3")
	if err != nil {
		t.Fatal(err)
	}
	if !skipped || path2 != path1 {
		t.Fatalf("got path=%q skipped=%v", path2, skipped)
	}
}

func TestOutputRegistry_UnreserveAllowsReuse(t *testing.T) {
	dir := t.TempDir()
	outDir := filepath.Join(dir, "out")
	if err := os.MkdirAll(outDir, 0o755); err != nil {
		t.Fatal(err)
	}
	src1 := filepath.Join(dir, "a", "song.mflac")
	src2 := filepath.Join(dir, "b", "song.ncm")
	if err := os.MkdirAll(filepath.Dir(src1), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(filepath.Dir(src2), 0o755); err != nil {
		t.Fatal(err)
	}
	settings := protocol.Settings{
		OutputTarget:       protocol.OutputTargetCustom,
		OutputDir:          outDir,
		ExistingOutputMode: protocol.ExistingOutputOverwrite,
	}
	reg := newOutputRegistry()

	path1, _, err := reg.reserve(src1, settings, "mp3")
	if err != nil {
		t.Fatal(err)
	}
	reg.unreserve(path1)
	path2, skipped, err := reg.reserve(src2, settings, "mp3")
	if err != nil || skipped || path2 != path1 {
		t.Fatalf("reuse: path=%q skipped=%v err=%v", path2, skipped, err)
	}
}

func TestOutputRegistry_RenameAvoidsReservedEmptyDisk(t *testing.T) {
	dir := t.TempDir()
	outDir := filepath.Join(dir, "out")
	if err := os.MkdirAll(outDir, 0o755); err != nil {
		t.Fatal(err)
	}
	settings := protocol.Settings{
		OutputTarget:       protocol.OutputTargetCustom,
		OutputDir:          outDir,
		ExistingOutputMode: protocol.ExistingOutputRename,
	}
	reg := newOutputRegistry()

	wants := []string{
		filepath.Join(outDir, "song.mp3"),
		filepath.Join(outDir, "song_1.mp3"),
		filepath.Join(outDir, "song_2.mp3"),
	}
	for i, want := range wants {
		src := filepath.Join(dir, fmt.Sprintf("d%d", i), "song.ncm")
		got, skipped, err := reg.reserve(src, settings, "mp3")
		if err != nil || skipped || got != want {
			t.Fatalf("reserve #%d = (%q, %v, %v), want (%q, false, nil)", i, got, skipped, err, want)
		}
	}
}

func TestOutputRegistry_RenameAvoidsReservedPreExistingDisk(t *testing.T) {
	dir := t.TempDir()
	outDir := filepath.Join(dir, "out")
	if err := os.MkdirAll(outDir, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(outDir, "song.mp3"), []byte("existing"), 0o644); err != nil {
		t.Fatal(err)
	}
	settings := protocol.Settings{
		OutputTarget:       protocol.OutputTargetCustom,
		OutputDir:          outDir,
		ExistingOutputMode: protocol.ExistingOutputRename,
	}
	reg := newOutputRegistry()

	got1, skipped1, err := reg.reserve(filepath.Join(dir, "a", "song.mflac"), settings, "mp3")
	want1 := filepath.Join(outDir, "song_1.mp3")
	if err != nil || skipped1 || got1 != want1 {
		t.Fatalf("first reserve = (%q, %v, %v), want (%q, false, nil)", got1, skipped1, err, want1)
	}

	got2, skipped2, err := reg.reserve(filepath.Join(dir, "b", "song.ncm"), settings, "mp3")
	want2 := filepath.Join(outDir, "song_2.mp3")
	if err != nil || skipped2 || got2 != want2 {
		t.Fatalf("second reserve = (%q, %v, %v), want (%q, false, nil) (must not produce song_1_1.mp3)", got2, skipped2, err, want2)
	}
}

func TestOutputRegistry_SkipWhenReservedInMemory(t *testing.T) {
	dir := t.TempDir()
	outDir := filepath.Join(dir, "out")
	if err := os.MkdirAll(outDir, 0o755); err != nil {
		t.Fatal(err)
	}
	settings := protocol.Settings{
		OutputTarget:       protocol.OutputTargetCustom,
		OutputDir:          outDir,
		ExistingOutputMode: protocol.ExistingOutputSkip,
	}
	reg := newOutputRegistry()

	// Task 1 reserves before writing to disk.
	path1, skipped1, err := reg.reserve(filepath.Join(dir, "a", "song.mflac"), settings, "mp3")
	if err != nil || skipped1 {
		t.Fatalf("first reserve = (%q, %v, %v)", path1, skipped1, err)
	}
	// Task 2 in Skip mode must skip due to in-memory reservation.
	path2, skipped2, err := reg.reserve(filepath.Join(dir, "b", "song.ncm"), settings, "mp3")
	if err != nil || !skipped2 || path2 != path1 {
		t.Fatalf("second reserve = (%q, %v, %v), want (%q, true, nil)", path2, skipped2, err, path1)
	}
}

func TestOutputRegistry_DiskSkipReservesAgainstOverwrite(t *testing.T) {
	dir := t.TempDir()
	outDir := filepath.Join(dir, "out")
	if err := os.MkdirAll(outDir, 0o755); err != nil {
		t.Fatal(err)
	}
	existing := filepath.Join(outDir, "song.mp3")
	if err := os.WriteFile(existing, []byte("keep"), 0o644); err != nil {
		t.Fatal(err)
	}
	reg := newOutputRegistry()

	skipSettings := protocol.Settings{
		OutputTarget:       protocol.OutputTargetCustom,
		OutputDir:          outDir,
		ExistingOutputMode: protocol.ExistingOutputSkip,
	}
	got, skipped, err := reg.reserve(filepath.Join(dir, "a", "song.mflac"), skipSettings, "mp3")
	if err != nil || !skipped || got != existing {
		t.Fatalf("disk skip = (%q, %v, %v), want (%q, true, nil)", got, skipped, err, existing)
	}

	overwriteSettings := skipSettings
	overwriteSettings.ExistingOutputMode = protocol.ExistingOutputOverwrite
	if _, _, err := reg.reserve(filepath.Join(dir, "b", "song.ncm"), overwriteSettings, "mp3"); err == nil {
		t.Fatal("expected overwrite to be blocked after disk skip reserved the path")
	}
}

func TestOutputRegistry_OverwritePreExistingDiskThenConflict(t *testing.T) {
	dir := t.TempDir()
	outDir := filepath.Join(dir, "out")
	if err := os.MkdirAll(outDir, 0o755); err != nil {
		t.Fatal(err)
	}
	existing := filepath.Join(outDir, "song.mp3")
	if err := os.WriteFile(existing, []byte("old"), 0o644); err != nil {
		t.Fatal(err)
	}
	settings := protocol.Settings{
		OutputTarget:       protocol.OutputTargetCustom,
		OutputDir:          outDir,
		ExistingOutputMode: protocol.ExistingOutputOverwrite,
	}
	reg := newOutputRegistry()

	got, skipped, err := reg.reserve(filepath.Join(dir, "a", "song.mflac"), settings, "mp3")
	if err != nil || skipped || got != existing {
		t.Fatalf("first overwrite of pre-existing disk file = (%q, %v, %v), want (%q, false, nil)", got, skipped, err, existing)
	}

	_, _, err = reg.reserve(filepath.Join(dir, "b", "song.ncm"), settings, "mp3")
	if err == nil || !strings.Contains(err.Error(), "输出文件已被本会话中的其他任务写入") {
		t.Fatalf("second overwrite err = %v, want session conflict error", err)
	}
}

func TestOutputRegistry_SameAsSourceWithReservedConflictAllModes(t *testing.T) {
	for _, mode := range []protocol.ExistingOutputMode{
		protocol.ExistingOutputSkip,
		protocol.ExistingOutputOverwrite,
		protocol.ExistingOutputRename,
	} {
		t.Run(string(mode), func(t *testing.T) {
			dir := t.TempDir()
			src := filepath.Join(dir, "song.mp3")
			if err := os.WriteFile(src, []byte("src"), 0o644); err != nil {
				t.Fatal(err)
			}
			reg := newOutputRegistry()
			// Pre-reserve song_1.mp3 as if another worker claimed it.
			reg.reserved[normalizeOutputKey(filepath.Join(dir, "song_1.mp3"))] = struct{}{}

			settings := protocol.Settings{
				OutputTarget:       protocol.OutputTargetSource,
				ExistingOutputMode: mode,
			}
			got, skipped, err := reg.reserve(src, settings, "mp3")
			want := filepath.Join(dir, "song_2.mp3")
			if err != nil || skipped || got != want {
				t.Fatalf("mode=%q: reserve = (%q, %v, %v), want (%q, false, nil)", mode, got, skipped, err, want)
			}
		})
	}
}

func TestOutputRegistry_NormalizeKeyAbsCleanAndCase(t *testing.T) {
	dir := t.TempDir()
	outDir := filepath.Join(dir, "out")
	if err := os.MkdirAll(outDir, 0o755); err != nil {
		t.Fatal(err)
	}
	uncleanOutDir := filepath.Join(dir, "sub", "..", "out")

	reg := newOutputRegistry()
	settings1 := protocol.Settings{
		OutputTarget:       protocol.OutputTargetCustom,
		OutputDir:          outDir,
		ExistingOutputMode: protocol.ExistingOutputOverwrite,
	}
	settings2 := protocol.Settings{
		OutputTarget:       protocol.OutputTargetCustom,
		OutputDir:          uncleanOutDir,
		ExistingOutputMode: protocol.ExistingOutputOverwrite,
	}

	if _, _, err := reg.reserve(filepath.Join(dir, "a", "song.mflac"), settings1, "mp3"); err != nil {
		t.Fatal(err)
	}
	if _, _, err := reg.reserve(filepath.Join(dir, "b", "song.ncm"), settings2, "mp3"); err == nil {
		t.Fatal("expected unclean path to collide with normalized reserved key")
	}

	if runtime.GOOS == "windows" {
		if _, _, err := reg.reserve(filepath.Join(dir, "c", "SONG.ncm"), settings1, "MP3"); err == nil {
			t.Fatal("expected case-insensitive collision on Windows")
		}
	}
}

func TestOutputRegistry_ConcurrentReserve(t *testing.T) {
	t.Run("rename produces distinct paths", func(t *testing.T) {
		dir := t.TempDir()
		outDir := filepath.Join(dir, "out")
		if err := os.MkdirAll(outDir, 0o755); err != nil {
			t.Fatal(err)
		}
		settings := protocol.Settings{
			OutputTarget:       protocol.OutputTargetCustom,
			OutputDir:          outDir,
			ExistingOutputMode: protocol.ExistingOutputRename,
		}
		reg := newOutputRegistry()

		const n = 16
		results := make([]string, n)
		errs := make([]error, n)
		var wg sync.WaitGroup
		for i := 0; i < n; i++ {
			wg.Add(1)
			go func(idx int) {
				defer wg.Done()
				src := filepath.Join(dir, fmt.Sprintf("d%d", idx), "song.ncm")
				p, skipped, err := reg.reserve(src, settings, "mp3")
				if skipped {
					errs[idx] = fmt.Errorf("unexpected skipped for %d", idx)
					return
				}
				results[idx] = p
				errs[idx] = err
			}(i)
		}
		wg.Wait()

		seen := make(map[string]struct{}, n)
		for i := 0; i < n; i++ {
			if errs[i] != nil {
				t.Fatalf("goroutine %d error: %v", i, errs[i])
			}
			key := normalizeOutputKey(results[i])
			if _, dup := seen[key]; dup {
				t.Fatalf("duplicate reserved path: %q", results[i])
			}
			seen[key] = struct{}{}
		}
	})

	t.Run("overwrite allows exactly one winner", func(t *testing.T) {
		dir := t.TempDir()
		outDir := filepath.Join(dir, "out")
		if err := os.MkdirAll(outDir, 0o755); err != nil {
			t.Fatal(err)
		}
		settings := protocol.Settings{
			OutputTarget:       protocol.OutputTargetCustom,
			OutputDir:          outDir,
			ExistingOutputMode: protocol.ExistingOutputOverwrite,
		}
		reg := newOutputRegistry()

		const n = 16
		var winners, conflicts int
		var mu sync.Mutex
		var wg sync.WaitGroup
		for i := 0; i < n; i++ {
			wg.Add(1)
			go func(idx int) {
				defer wg.Done()
				src := filepath.Join(dir, fmt.Sprintf("d%d", idx), "song.ncm")
				_, skipped, err := reg.reserve(src, settings, "mp3")
				mu.Lock()
				defer mu.Unlock()
				if err == nil && !skipped {
					winners++
				} else if err != nil {
					conflicts++
				}
			}(i)
		}
		wg.Wait()

		if winners != 1 || conflicts != n-1 {
			t.Fatalf("winners=%d conflicts=%d, want 1 and %d", winners, conflicts, n-1)
		}
	})
}
