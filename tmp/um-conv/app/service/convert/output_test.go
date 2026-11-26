package convert

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"git.um-react.app/um/um-conv/app/protocol"
)

func TestUniquePath(t *testing.T) {
	dir := t.TempDir()
	src := filepath.Join(dir, "a.mp3")
	if err := os.WriteFile(src, []byte("x"), 0o644); err != nil {
		t.Fatal(err)
	}
	got, err := uniquePath(src, src)
	if err != nil {
		t.Fatal(err)
	}
	if got == src {
		t.Fatalf("should avoid source path, got %q", got)
	}
	want := filepath.Join(dir, "a_1.mp3")
	if got != want {
		t.Fatalf("got %q want %q", got, want)
	}
}

func TestUniquePathReturnsStatErrors(t *testing.T) {
	// A NUL byte makes os.Stat fail with something other than ErrNotExist on
	// every platform; the old loop retried it forever.
	bad := filepath.Join(t.TempDir(), "a\x00.mp3")
	got, err := uniquePath(bad, filepath.Join(t.TempDir(), "src.mp3"))
	if err == nil || os.IsNotExist(err) {
		t.Fatalf("uniquePath(%q) = (%q, %v), want a non-ErrNotExist error", bad, got, err)
	}
	if got != "" {
		t.Fatalf("got path %q with error", got)
	}

	// The avoidSrc branch also has to surface the error rather than loop.
	if got, err := uniquePath(bad, bad); err == nil {
		t.Fatalf("uniquePath(avoid=self) = (%q, nil), want error", got)
	}

	settings := protocol.Settings{ExistingOutputMode: protocol.ExistingOutputRename}
	if _, _, err := resolveOutputPath(filepath.Join(t.TempDir(), "song.mflac"), settings, "mp3\x00"); err == nil {
		t.Fatal("resolveOutputPath must propagate uniquePath errors")
	}
}

func TestResolveOutputPath_CustomOverwriteRejectsDirectory(t *testing.T) {
	dir := t.TempDir()
	src := filepath.Join(dir, "song.mflac")
	outDir := filepath.Join(dir, "out")
	if err := os.MkdirAll(filepath.Join(outDir, "song.mp3"), 0o755); err != nil {
		t.Fatal(err)
	}
	settings := protocol.Settings{
		OutputTarget:       protocol.OutputTargetCustom,
		OutputDir:          outDir,
		ExistingOutputMode: protocol.ExistingOutputOverwrite,
	}
	got, skipped, err := resolveOutputPath(src, settings, "mp3")
	if err == nil || skipped {
		t.Fatalf("got (%q, %t, %v), want a directory error", got, skipped, err)
	}
}

func TestResolveOutputPath_Custom(t *testing.T) {
	dir := t.TempDir()
	src := filepath.Join(dir, "song.mflac")
	outDir := filepath.Join(dir, "out")
	if err := os.MkdirAll(outDir, 0o755); err != nil {
		t.Fatal(err)
	}
	settings := protocol.Settings{
		OutputTarget:       protocol.OutputTargetCustom,
		OutputDir:          outDir,
		ExistingOutputMode: protocol.ExistingOutputSkip,
	}
	got, skipped, err := resolveOutputPath(src, settings, "flac")
	if err != nil {
		t.Fatal(err)
	}
	if skipped {
		t.Fatal("expected not skipped")
	}
	want := filepath.Join(outDir, "song.flac")
	if got != want {
		t.Fatalf("got %q want %q", got, want)
	}
}

func TestResolveOutputPath_StripsQMCFlacSuffix(t *testing.T) {
	dir := t.TempDir()
	src := filepath.Join(dir, "song.MFLAC0.FLAC")
	settings := protocol.Settings{ExistingOutputMode: protocol.ExistingOutputSkip}
	got, skipped, err := resolveOutputPath(src, settings, "mp3")
	want := filepath.Join(dir, "song.mp3")
	if err != nil || skipped || got != want {
		t.Fatalf("got (%q, %t, %v), want (%q, false, nil)", got, skipped, err, want)
	}
}

func TestResolveOutputPath_SkipExisting(t *testing.T) {
	dir := t.TempDir()
	src := filepath.Join(dir, "song.mflac")
	out := filepath.Join(dir, "song.mp3")
	if err := os.WriteFile(out, []byte("x"), 0o644); err != nil {
		t.Fatal(err)
	}
	settings := protocol.Settings{
		OutputTarget:       protocol.OutputTargetSource,
		ExistingOutputMode: protocol.ExistingOutputSkip,
	}
	got, skipped, err := resolveOutputPath(src, settings, "mp3")
	if err != nil {
		t.Fatal(err)
	}
	if !skipped {
		t.Fatalf("expected skipped, got path %q", got)
	}
	if got != out {
		t.Fatalf("got %q want %q", got, out)
	}
}

func TestResolveOutputPath_RenameExisting(t *testing.T) {
	dir := t.TempDir()
	src := filepath.Join(dir, "song.mflac")
	out := filepath.Join(dir, "song.mp3")
	if err := os.WriteFile(out, []byte("x"), 0o644); err != nil {
		t.Fatal(err)
	}
	settings := protocol.Settings{
		OutputTarget:       protocol.OutputTargetSource,
		ExistingOutputMode: protocol.ExistingOutputRename,
	}
	got, skipped, err := resolveOutputPath(src, settings, "mp3")
	if err != nil {
		t.Fatal(err)
	}
	if skipped {
		t.Fatal("expected not skipped")
	}
	want := filepath.Join(dir, "song_1.mp3")
	if got != want {
		t.Fatalf("got %q want %q", got, want)
	}
}

func TestResolveOutputPath_OverwriteExisting(t *testing.T) {
	dir := t.TempDir()
	src := filepath.Join(dir, "song.mflac")
	out := filepath.Join(dir, "song.mp3")
	if err := os.WriteFile(out, []byte("x"), 0o644); err != nil {
		t.Fatal(err)
	}
	settings := protocol.Settings{
		OutputTarget:       protocol.OutputTargetSource,
		ExistingOutputMode: protocol.ExistingOutputOverwrite,
	}
	got, skipped, err := resolveOutputPath(src, settings, "mp3")
	if err != nil {
		t.Fatal(err)
	}
	if skipped {
		t.Fatal("expected not skipped")
	}
	if got != out {
		t.Fatalf("got %q want %q", got, out)
	}
}

func TestResolveOutputPath_SameAsSourceAlwaysRenames(t *testing.T) {
	dir := t.TempDir()
	src := filepath.Join(dir, "song.mp3")
	if err := os.WriteFile(src, []byte("x"), 0o644); err != nil {
		t.Fatal(err)
	}
	want := filepath.Join(dir, "song_1.mp3")
	for _, mode := range []protocol.ExistingOutputMode{
		protocol.ExistingOutputSkip,
		protocol.ExistingOutputRename,
		protocol.ExistingOutputOverwrite,
	} {
		settings := protocol.Settings{
			OutputTarget:       protocol.OutputTargetSource,
			ExistingOutputMode: mode,
		}
		got, skipped, err := resolveOutputPath(src, settings, "mp3")
		if err != nil {
			t.Fatalf("mode=%q: %v", mode, err)
		}
		if skipped {
			t.Fatalf("mode=%q: should not skip when candidate equals source", mode)
		}
		if got != want {
			t.Fatalf("mode=%q: got %q want %q", mode, got, want)
		}
	}
}

func TestResolveOutputPath_AliasOfSourceAlwaysRenames(t *testing.T) {
	dir := t.TempDir()
	src := writePlaceholderExecutable(t, dir, "song.wav")
	alias := filepath.Join(dir, "song.flac")
	if err := os.Link(src, alias); err != nil {
		t.Skipf("hard links are unavailable: %v", err)
	}

	settings := protocol.Settings{ExistingOutputMode: protocol.ExistingOutputSkip}
	got, skipped, err := resolveOutputPath(src, settings, "flac")
	want := filepath.Join(dir, "song_1.flac")
	if err != nil || skipped || got != want {
		t.Fatalf("got (%q, %t, %v), want (%q, false, nil)", got, skipped, err, want)
	}
}

func TestResolveOutputPath_StripsKGGFlacSuffix(t *testing.T) {
	dir := t.TempDir()
	settings := protocol.Settings{ExistingOutputMode: protocol.ExistingOutputSkip}
	got, skipped, err := resolveOutputPath(filepath.Join(dir, "song.kgg.flac"), settings, "mp3")
	want := filepath.Join(dir, "song.mp3")
	if err != nil || skipped || got != want {
		t.Fatalf("kgg.flac got (%q, %t, %v), want (%q, false, nil)", got, skipped, err, want)
	}
	got, skipped, err = resolveOutputPath(filepath.Join(dir, "song.flac"), settings, "mp3")
	if err != nil || skipped || got != want {
		t.Fatalf("flac got (%q, %t, %v), want (%q, false, nil)", got, skipped, err, want)
	}
}

func TestInputFilterIncludesEncryptedFormats(t *testing.T) {
	glob := inputFilterGlob()
	for _, part := range []string{"*.ncm", "*.mflac", "*.mgg", "*.mp3"} {
		if !strings.Contains(glob, part) {
			t.Fatalf("glob missing %s: %s", part, glob)
		}
	}
}
