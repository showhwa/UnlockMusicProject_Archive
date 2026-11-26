package convert

import "fmt"

type jobMessageKind int

const (
	jobMsgRunning jobMessageKind = iota
	jobMsgDone
	jobMsgCancelled
)

func formatJobMessage(kind jobMessageKind, done, total, ok, skip, fail int) string {
	switch kind {
	case jobMsgDone:
		return fmt.Sprintf("转换完成，已处理 %d/%d 个文件，成功 %d，跳过 %d，错误 %d", done, total, ok, skip, fail)
	case jobMsgCancelled:
		return fmt.Sprintf("转换已取消，已处理 %d/%d 个文件，成功 %d，跳过 %d，错误 %d", done, total, ok, skip, fail)
	default:
		return fmt.Sprintf("已处理 %d/%d 个文件，成功 %d，跳过 %d，错误 %d", done, total, ok, skip, fail)
	}
}

func overallPercent(fractions []float64) float64 {
	if len(fractions) == 0 {
		return 0
	}
	var sum float64
	for _, f := range fractions {
		if f < 0 {
			f = 0
		}
		if f > 1 {
			f = 1
		}
		sum += f
	}
	p := sum / float64(len(fractions)) * 100
	if p > 100 {
		p = 100
	}
	return p
}

func fileFraction(file *FileEntry) float64 {
	switch file.Status {
	case FileStatusSuccess, FileStatusSkipped, FileStatusFailed:
		return 1
	default:
		p := file.Progress / 100
		if p < 0 {
			return 0
		}
		if p > 1 {
			return 1
		}
		return p
	}
}

func countFileStats(files []*FileEntry) (ok, skip, fail, done int) {
	for _, f := range files {
		switch f.Status {
		case FileStatusSuccess:
			ok++
			done++
		case FileStatusSkipped:
			skip++
			done++
		case FileStatusFailed:
			fail++
			done++
		}
	}
	return ok, skip, fail, done
}

func fileFractions(files []*FileEntry) []float64 {
	out := make([]float64, len(files))
	for i, f := range files {
		out[i] = fileFraction(f)
	}
	return out
}
