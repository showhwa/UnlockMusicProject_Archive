package convert

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"strings"
	"time"

	"git.um-react.app/um/um-conv/app/avconv"
	"git.um-react.app/um/um-conv/app/protocol"
)

type fileResult struct {
	status     FileStatus
	outputPath string
	output     OutputInfo
	errMessage string
}

func (s *ConvertService) convertOne(
	ctx context.Context,
	ff *avconv.FFmpeg,
	file *FileEntry,
	algo protocol.Algo,
	settings protocol.Settings,
	profile *protocol.OutputProfile,
	tempDir string,
	index int,
	registry *outputRegistry,
	runFiles []*FileEntry,
) (fileResult, error) {
	src := file.Path
	if _, err := os.Stat(src); err != nil {
		return fileResult{}, fmt.Errorf("输入文件不存在: %w", err)
	}

	input, err := s.prepareWorkInput(file, algo, &settings, tempDir, index, runFiles)
	defer input.cleanup()
	if err != nil {
		return fileResult{}, err
	}

	plan, err := s.planOutput(ctx, ff, file, input.path, settings, profile, registry, runFiles)
	if err != nil {
		return fileResult{}, err
	}
	if plan.skipped {
		slog.Info("skip existing output", "src", src)
		return fileResult{status: FileStatusSkipped, outputPath: plan.path}, nil
	}

	if err := s.writeOutput(ctx, ff, file, input, plan.path, profile, runFiles); err != nil {
		registry.unreserve(plan.path)
		return fileResult{}, err
	}

	result := fileResult{
		status:     FileStatusSuccess,
		outputPath: plan.path,
		output:     probeOutput(ctx, ff, plan.path, plan.ext, profile),
	}
	if err := cleanupSource(src, settings); err != nil {
		return result, err
	}

	slog.Info("convert file done", "src", src, "dest", plan.path)
	return result, nil
}

// workInput is the media file handed to ffmpeg: the source itself, or a
// decrypted temporary with optional cover/metadata sidecars.
type workInput struct {
	path      string
	options   avconv.ConvertOptions
	tempFiles []string
}

func (w workInput) cleanup() {
	for _, p := range w.tempFiles {
		_ = os.Remove(p)
	}
}

// prepareWorkInput decrypts encrypted sources into temporary files, or
// validates that a plain source is a supported media type.
func (s *ConvertService) prepareWorkInput(
	file *FileEntry,
	algo protocol.Algo,
	settings *protocol.Settings,
	tempDir string,
	index int,
	runFiles []*FileEntry,
) (workInput, error) {
	src := file.Path
	input := workInput{path: src}
	if algo == nil {
		ext := filepath.Ext(src)
		if _, ok := mediaExts[strings.ToLower(ext)]; !ok {
			return input, fmt.Errorf("不支持的文件类型: %s", ext)
		}
		return input, nil
	}

	s.reportFileProgress(runFiles, file, 0, false)
	decrypted := filepath.Join(tempDir, fmt.Sprintf("um-conv-dec-%d-%d", time.Now().UnixNano(), index))
	result, err := decryptToTemporary(algo, src, decrypted, settings)
	if err != nil {
		return input, fmt.Errorf("解密失败: %w", err)
	}
	input.tempFiles = append(input.tempFiles, result.AudioPath)
	input.path = result.AudioPath
	if result.CoverPath != "" {
		input.tempFiles = append(input.tempFiles, result.CoverPath)
		input.options.CoverPath = result.CoverPath
	}
	if result.MetadataPath != "" {
		input.tempFiles = append(input.tempFiles, result.MetadataPath)
		input.options.MetadataPath = result.MetadataPath
	}
	return input, nil
}

type outputPlan struct {
	path    string
	ext     string
	skipped bool
}

// planOutput picks the output extension (detecting it for FormatNone),
// resolves the destination path, and creates its directory.
func (s *ConvertService) planOutput(
	ctx context.Context,
	ff *avconv.FFmpeg,
	file *FileEntry,
	workPath string,
	settings protocol.Settings,
	profile *protocol.OutputProfile,
	registry *outputRegistry,
	runFiles []*FileEntry,
) (outputPlan, error) {
	src := file.Path
	outExt := ff.GetProfileEncodeExt(profile)
	if profile.Format == protocol.FormatNone {
		s.reportFileProgress(runFiles, file, 50, false)
		detected, err := ff.DetectExtension(ctx, workPath)
		if err != nil {
			return outputPlan{}, fmt.Errorf("检测格式失败: %w", err)
		}
		outExt = detected
	}
	outPath, skipped, err := registry.reserve(src, settings, outExt)
	if err != nil {
		return outputPlan{}, err
	}
	if skipped {
		return outputPlan{path: outPath, ext: outExt, skipped: true}, nil
	}
	if err := os.MkdirAll(filepath.Dir(outPath), 0o755); err != nil {
		registry.unreserve(outPath)
		return outputPlan{}, err
	}
	return outputPlan{path: outPath, ext: outExt}, nil
}

// writeOutput copies the work input (FormatNone) or encodes it to outPath.
func (s *ConvertService) writeOutput(
	ctx context.Context,
	ff *avconv.FFmpeg,
	file *FileEntry,
	input workInput,
	outPath string,
	profile *protocol.OutputProfile,
	runFiles []*FileEntry,
) error {
	if profile.Format == protocol.FormatNone {
		if err := copyFile(input.path, outPath); err != nil {
			return fmt.Errorf("复制失败: %w", err)
		}
		return nil
	}

	s.reportFileProgress(runFiles, file, 0, false)

	err := ff.Convert(ctx, input.path, outPath, profile, input.options, func(filePercent float64) {
		s.reportFileProgress(runFiles, file, filePercent, false)
	})
	if err != nil {
		_ = os.Remove(outPath)
		return err
	}
	return nil
}

// probeOutput gathers size, format and bitrate of the written file.
func probeOutput(ctx context.Context, ff *avconv.FFmpeg, outPath, outExt string, profile *protocol.OutputProfile) OutputInfo {
	output := OutputInfo{}
	if info, statErr := os.Stat(outPath); statErr == nil {
		output.Size = formatByteSize(info.Size())
	}
	probedFormat, probedBitrate, probeErr := ff.ProbeMedia(ctx, outPath)
	if profile.Format == protocol.FormatNone {
		if probeErr == nil {
			output.Format = probedFormat
			output.BitrateKbps = probedBitrate
		} else {
			output.Format = strings.ToUpper(strings.TrimPrefix(outExt, "."))
		}
		return output
	}
	output.Format = profile.Name
	if probeErr == nil {
		output.BitrateKbps = probedBitrate
	}
	return output
}

// cleanupSource removes the source file when DeleteSourceAfterConvert is set.
func cleanupSource(src string, settings protocol.Settings) error {
	if !settings.DeleteSourceAfterConvert {
		return nil
	}
	if err := os.Remove(src); err != nil {
		return fmt.Errorf("输出成功但删除源文件失败: %w", err)
	}
	return nil
}

func decryptToTemporary(algo protocol.Algo, src, dest string, settings *protocol.Settings) (protocol.DecryptResult, error) {
	result, err := algo.Decrypt(src, dest, settings)
	if err != nil {
		removeDecryptArtifacts(dest, result)
		return protocol.DecryptResult{}, err
	}
	return result, nil
}

func removeDecryptArtifacts(dest string, result protocol.DecryptResult) {
	paths := []string{dest, dest + ".cover", result.AudioPath, result.CoverPath, result.MetadataPath}
	for _, path := range paths {
		if path != "" {
			_ = os.Remove(path)
		}
	}
}
