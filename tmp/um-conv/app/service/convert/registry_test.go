package convert

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"slices"
	"strings"
	"testing"

	"git.um-react.app/um/um-conv/app/algo/kgm"
	"git.um-react.app/um/um-conv/app/algo/kwm"
	qmc "git.um-react.app/um/um-conv/app/algo/qmc"
	"git.um-react.app/um/um-conv/app/protocol"
)

func resolveAlgo(t *testing.T, algorithms algoRegistry, path string) protocol.Algo {
	t.Helper()
	algo, err := algorithms.resolve(context.Background(), path)
	if err != nil {
		t.Fatalf("resolve(%q): %v", path, err)
	}
	return algo
}

func needsDecrypt(t *testing.T, files []*FileEntry) bool {
	t.Helper()
	preflight, err := (&ConvertService{}).queueNeedsDecrypt(context.Background(), protocol.Settings{}, files)
	if err != nil {
		t.Fatalf("queueNeedsDecrypt: %v", err)
	}
	return preflight.needDecrypt
}

func TestDecryptAlgorithmsRemainRegistered(t *testing.T) {
	algorithms := newAlgoRegistry(context.Background(), &protocol.Settings{})
	for _, ext := range []string{".ncm", ".mflac", ".mgg"} {
		if algorithms.exts[ext] == nil {
			t.Fatalf("no decrypt algorithm registered for %s", ext)
		}
	}
}

func TestKugouExtensionsUseOneDecryptorPerBatch(t *testing.T) {
	settings := &protocol.Settings{}
	algorithms := newAlgoRegistry(context.Background(), settings)
	first := algorithms.exts[".kgm"]
	if first == nil || first == newAlgoRegistry(context.Background(), settings).exts[".kgm"] {
		t.Fatal("expected a fresh KGM decryptor for each batch")
	}
	filter := strings.Split(inputFilterGlob(), ";")
	for _, ext := range []string{".kgm", ".vpr", ".kgg", ".kgma"} {
		if algorithms.exts[ext] != first {
			t.Errorf("%s does not use the batch KGM decryptor", ext)
		}
		path := "song" + strings.ToUpper(ext)
		if !isMediaFile(path) || !needsDecrypt(t, []*FileEntry{{Path: path}}) {
			t.Errorf("%s was not recognized as encrypted music", path)
		}
		found := false
		for _, pattern := range filter {
			found = found || pattern == "*"+ext
		}
		if !found {
			t.Errorf("%s is missing from the input filter", ext)
		}
	}
}

func TestQMCSuffixVariantsRegister(t *testing.T) {
	algorithms := newAlgoRegistry(context.Background(), &protocol.Settings{})
	for _, ext := range []string{".mflac", ".mflac0", ".mflac9", ".mflaca", ".mflacz", ".mgg", ".mgg0", ".mgga", ".mggz", ".mmp4"} {
		if _, ok := algorithms.exts[ext].(*qmc.QMPCAlgo); !ok {
			t.Fatalf("%s algorithm = %T, want *qmc.QMPCAlgo", ext, algorithms.exts[ext])
		}
		path := "song" + strings.ToUpper(ext)
		if !isMediaFile(path) || !needsDecrypt(t, []*FileEntry{{Path: path}}) {
			t.Errorf("%s was not recognized as QQ Music", path)
		}
		if got := playerForPath(path); got != "QQ音乐" {
			t.Errorf("playerForPath(%q) = %q, want QQ音乐", path, got)
		}
	}
	if algorithms.exts[".mflac10"] != nil || algorithms.exts[".mmp40"] != nil || isMediaFile("song.mflac10") {
		t.Fatal("only a single [0-9a-z] character may follow .mflac or .mgg")
	}

	filter := strings.Split(inputFilterGlob(), ";")
	for _, pattern := range []string{"*.mflac", "*.mflac0", "*.mflacz", "*.mflac0.flac", "*.mgg", "*.mgga", "*.mggz.flac", "*.mmp4"} {
		if !slices.Contains(filter, pattern) {
			t.Errorf("input filter missing %s", pattern)
		}
	}
}

func TestQMCFlacSuffixMatchesWithoutCapturingPlainFlac(t *testing.T) {
	algorithms := newAlgoRegistry(context.Background(), &protocol.Settings{})
	for _, path := range []string{"song.mflac0.flac", "song.mflac.flac", "dir/song.MFLACZ.FLAC", "song.mgg9.flac", "song.MGGA.FLAC"} {
		if _, ok := resolveAlgo(t, algorithms, path).(*qmc.QMPCAlgo); !ok {
			t.Fatalf("resolve(%q) = %T, want *qmc.QMPCAlgo", path, resolveAlgo(t, algorithms, path))
		}
		if !isMediaFile(path) || !needsDecrypt(t, []*FileEntry{{Path: path}}) {
			t.Errorf("%s was not recognized as QQ Music", path)
		}
		if got := playerForPath(path); got != "QQ音乐" {
			t.Errorf("playerForPath(%q) = %q, want QQ音乐", path, got)
		}
	}
	for _, path := range []string{"song.flac", "song.mflac10.flac"} {
		if resolveAlgo(t, algorithms, path) != nil {
			t.Fatalf("resolve(%q) = %T, want nil", path, resolveAlgo(t, algorithms, path))
		}
		if playerForPath(path) != "" {
			t.Fatalf("playerForPath(%q) = %q, want empty", path, playerForPath(path))
		}
	}
	if !isMediaFile("song.flac") || needsDecrypt(t, []*FileEntry{{Path: "song.flac"}}) {
		t.Fatal("plain .flac must stay a media file and must not request decryption")
	}
}

func TestKuwoExtensionRegisteredAndQMC2TakesPrecedence(t *testing.T) {
	settings := &protocol.Settings{}
	algorithms := newAlgoRegistry(context.Background(), settings)
	first, ok := algorithms.exts[".kwm"].(*kwm.Algo)
	if !ok || first == nil {
		t.Fatalf(".kwm algorithm = %T, want *kwm.Algo", algorithms.exts[".kwm"])
	}
	if first == newAlgoRegistry(context.Background(), settings).exts[".kwm"] {
		t.Fatal("expected a fresh KWM decryptor for each batch")
	}
	for _, ext := range []string{".mflac", ".mgg"} {
		if _, ok := algorithms.exts[ext].(*qmc.QMPCAlgo); !ok {
			t.Fatalf("%s algorithm = %T, want *qmc.QMPCAlgo", ext, algorithms.exts[ext])
		}
	}

	const path = "song.KWM"
	if !isMediaFile(path) || !needsDecrypt(t, []*FileEntry{{Path: path}}) {
		t.Errorf("%s was not recognized as encrypted music", path)
	}
	if !slices.Contains(strings.Split(inputFilterGlob(), ";"), "*.kwm") {
		t.Errorf("*.kwm is missing from input filter %q", inputFilterGlob())
	}
}

func TestKGGFlacUsesSameKugouDecryptor(t *testing.T) {
	algorithms := newAlgoRegistry(context.Background(), &protocol.Settings{})
	kgg := algorithms.exts[".kgg"]
	if kgg == nil || algorithms.exts[".kgg.flac"] != kgg || algorithms.exts[".kgm.flac"] != kgg {
		t.Fatalf("registry kgg=%T kgg.flac=%T kgm.flac=%T", kgg, algorithms.exts[".kgg.flac"], algorithms.exts[".kgm.flac"])
	}
	if resolveAlgo(t, algorithms, "song.kgg") != resolveAlgo(t, algorithms, "dir/song.kgg.flac") {
		t.Fatal("song.kgg and song.kgg.flac should use the same decryptor")
	}
	if resolveAlgo(t, algorithms, "song.flac") != nil {
		t.Fatalf("resolve(song.flac) = %T, want nil", resolveAlgo(t, algorithms, "song.flac"))
	}
	if got := playerForPath("song.KGG.FLAC"); got != "酷狗音乐" {
		t.Fatalf("playerForPath = %q, want 酷狗音乐", got)
	}
	if !isMediaFile("song.kgg.flac") || !slices.Contains(strings.Split(inputFilterGlob(), ";"), "*.kgg.flac") {
		t.Fatal(".kgg.flac was not accepted as an input")
	}
	if !isMediaFile("song.flac") || needsDecrypt(t, []*FileEntry{{Path: "song.flac"}}) {
		t.Fatal("plain .flac must stay a media file and must not request decryption")
	}
}

func TestResolveHonorsCancellation(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	algorithms := newAlgoRegistry(context.Background(), &protocol.Settings{})
	_, err := algorithms.resolve(ctx, "song.kwm")
	if !errors.Is(err, context.Canceled) {
		t.Fatalf("resolve error = %v, want context.Canceled", err)
	}
}

func TestFlacHeaderDoesNotSelectKuwo(t *testing.T) {
	dir := t.TempDir()
	write := func(name, content string) string {
		t.Helper()
		path := filepath.Join(dir, name)
		if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
			t.Fatal(err)
		}
		return path
	}
	kuwo := write("song.flac", "yeelion-kuwo")
	plain := write("plain.flac", "fLaC\x00\x00\x00\x22extra")
	kgg := write("song.kgg.flac", "yeelion-kuwo")
	mflac := write("song.mflac0.flac", "yeelion-kuwo-tme")

	algorithms := newAlgoRegistry(context.Background(), &protocol.Settings{})
	if got := resolveAlgo(t, algorithms, kuwo); got != nil {
		t.Fatalf("resolve(%q) = %T, want nil without kuwo -I", kuwo, got)
	}
	if needsDecrypt(t, []*FileEntry{{Path: kuwo}}) {
		t.Fatal("unprobed .flac must not request decryption")
	}
	if resolveAlgo(t, algorithms, plain) != nil || needsDecrypt(t, []*FileEntry{{Path: plain}}) {
		t.Fatal("plain flac header must not request decryption")
	}
	if _, ok := resolveAlgo(t, algorithms, kgg).(*kgm.Algo); !ok {
		t.Fatalf("resolve(%q) = %T, want *kgm.Algo", kgg, resolveAlgo(t, algorithms, kgg))
	}
	if _, ok := resolveAlgo(t, algorithms, mflac).(*qmc.QMPCAlgo); !ok {
		t.Fatalf("resolve(%q) = %T, want *qmc.QMPCAlgo", mflac, resolveAlgo(t, algorithms, mflac))
	}
}

func TestQueueNeedsDecryptSkipsDeepProbeForKnownExtensions(t *testing.T) {
	// Missing files: a DeepProbe would fail, so a true answer proves the
	// extension shortcut was taken. Plain media and unlabeled flac stay false.
	if !needsDecrypt(t, []*FileEntry{{Path: "a.mp3"}, {Path: "missing.ncm"}}) {
		t.Fatal("known encrypted extension must request decryption")
	}
	if needsDecrypt(t, []*FileEntry{{Path: "a.mp3"}, {Path: "b.m4a"}}) {
		t.Fatal("plain media must not request decryption")
	}
}
