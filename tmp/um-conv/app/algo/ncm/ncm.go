package ncm

import (
	"context"
	"fmt"
	"log/slog"
	"os"

	"git.um-react.app/um/um-conv/app/cmd"
	"git.um-react.app/um/um-conv/app/protocol"
	"git.um-react.app/um/um-conv/app/utils/decryptout"
)

type commandRunner func(ctx context.Context, program string, args []string) (cmd.CallResult, error)

type Algo struct {
	ctx      context.Context
	settings *protocol.Settings
	run      commandRunner
}

// New creates a NetEase NCM decryptor whose subprocesses stop with ctx.
func New(ctx context.Context, settings *protocol.Settings) *Algo {
	if ctx == nil {
		ctx = context.Background()
	}
	return &Algo{ctx: ctx, settings: settings, run: cmd.CallCommandContext}
}

var _ protocol.Algo = (*Algo)(nil)

func (a *Algo) Decrypt(src, dest string, settings *protocol.Settings) (protocol.DecryptResult, error) {
	ctx := a.ctx
	if ctx == nil {
		ctx = context.Background()
	}
	if err := ctx.Err(); err != nil {
		return protocol.DecryptResult{}, err
	}
	activeSettings := protocol.ActiveSettings(a.settings, settings)
	if activeSettings == nil {
		return protocol.DecryptResult{}, fmt.Errorf("umc_rs: settings are nil")
	}

	coverPath := dest + ".cover"
	rawMetadataPath := dest + ".metadata.json"
	defer func() { _ = os.Remove(rawMetadataPath) }()
	result, err := a.run(ctx, activeSettings.Binaries.UmCliRs, []string{
		"ncm", "--output", dest, "-c", coverPath, "-m", rawMetadataPath, "--", src,
	})
	if ctxErr := ctx.Err(); ctxErr != nil {
		return protocol.DecryptResult{}, ctxErr
	}
	if result.Failed(err) {
		slog.Error("um_cli_rs ncm decrypt failed", "src", src, "dest", dest, "exit", result.ExitCode, "stdout", result.Stdout, "stderr", result.Stderr, "err", err)
		return protocol.DecryptResult{}, result.Error("umc_rs: failed to decrypt ncm", err)
	}
	if err := decryptout.Validate(dest); err != nil {
		return protocol.DecryptResult{}, fmt.Errorf("umc_rs: invalid decrypted output: %w", err)
	}

	decrypted := protocol.DecryptResult{AudioPath: dest, CoverPath: optionalFile(coverPath)}
	if optionalFile(rawMetadataPath) != "" {
		metadataPath := dest + ".metadata.txt"
		if err := writeFFMetadata(rawMetadataPath, metadataPath); err != nil {
			return decrypted, fmt.Errorf("处理元信息失败: %w", err)
		}
		decrypted.MetadataPath = metadataPath
	}
	return decrypted, nil
}

func (a *Algo) GetSupportedExtensions() []string {
	return []string{".ncm"}
}

func (a *Algo) DeepProbe(_ context.Context, path string) (bool, error) {
	return protocol.MatchesAnyExtension(path, a.GetSupportedExtensions()), nil
}

func (*Algo) PopulateSupportedFormats(formats map[string][]string) {
	formats["网易云"] = []string{"ncm"}
}

func optionalFile(path string) string {
	info, err := os.Stat(path)
	if err != nil || !info.Mode().IsRegular() || info.Size() == 0 {
		_ = os.Remove(path)
		return ""
	}
	return path
}
