package convert

import (
	"context"
	"strings"

	"git.um-react.app/um/um-conv/app/algo/kgm"
	"git.um-react.app/um/um-conv/app/algo/kwm"
	"git.um-react.app/um/um-conv/app/algo/ncm"
	qmc "git.um-react.app/um/um-conv/app/algo/qmc"
	"git.um-react.app/um/um-conv/app/protocol"
)

type algoRegistry struct {
	exts  map[string]protocol.Algo
	order []protocol.Algo
}

// resolve walks decryptors in registration order. The first DeepProbe that
// claims path wins. A cancelled ctx is returned as ctx.Err().
func (r algoRegistry) resolve(ctx context.Context, path string) (protocol.Algo, error) {
	index, err := r.resolveIndex(ctx, path)
	if err != nil || index < 0 {
		return nil, err
	}
	return r.order[index], nil
}

// resolveIndex is resolve reporting the claiming decryptor's position in
// r.order, or -1 when no decryptor claims path.
func (r algoRegistry) resolveIndex(ctx context.Context, path string) (int, error) {
	for i, algo := range r.order {
		if err := ctx.Err(); err != nil {
			return -1, err
		}
		claim, err := algo.DeepProbe(ctx, path)
		if err != nil {
			return -1, err
		}
		if claim {
			return i, nil
		}
	}
	return -1, nil
}

// resolveClaimed returns the decryptor recorded for path in claims (positions
// from a registry with the same order), and resolves paths without a claim.
func (r algoRegistry) resolveClaimed(ctx context.Context, path string, claims map[string]int) (protocol.Algo, error) {
	index, ok := claims[path]
	if !ok {
		return r.resolve(ctx, path)
	}
	if index < 0 || index >= len(r.order) {
		return nil, nil
	}
	return r.order[index], nil
}

// DecryptAlgorithms returns the decryptors in registration order.
// DeepProbe walks this order. Keep qmc before kwm so shared suffixes
// (.mflac, .mgg) are claimed by QMC2.
func DecryptAlgorithms(ctx context.Context, settings *protocol.Settings) []protocol.Algo {
	return []protocol.Algo{ncm.New(ctx, settings), qmc.NewQMPCAlgo(ctx, settings), kgm.New(ctx, settings), kwm.New(ctx, settings)}
}

// playerLabel returns the music player that produces algo's encrypted files.
func playerLabel(algo protocol.Algo) string {
	switch algo.(type) {
	case *ncm.Algo:
		return "网易云音乐"
	case *kgm.Algo:
		return "酷狗音乐"
	case *kwm.Algo:
		return "酷我音乐"
	case *qmc.QMPCAlgo:
		return "QQ音乐"
	default:
		return ""
	}
}

func newAlgoRegistry(ctx context.Context, settings *protocol.Settings) algoRegistry {
	return buildAlgoRegistry(DecryptAlgorithms(ctx, settings))
}

func buildAlgoRegistry(order []protocol.Algo) algoRegistry {
	exts := make(map[string]protocol.Algo)
	for _, algo := range order {
		for _, ext := range algo.GetSupportedExtensions() {
			ext = strings.ToLower(strings.TrimSpace(ext))
			if ext == "" {
				continue
			}
			if !strings.HasPrefix(ext, ".") {
				ext = "." + ext
			}
			if _, exists := exts[ext]; !exists {
				exts[ext] = algo
			}
		}
	}
	return algoRegistry{exts: exts, order: order}
}
