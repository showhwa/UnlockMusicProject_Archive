package probe

import (
	"fmt"

	"git.um-react.app/um/um-conv/app/protocol"
)

// Probe checks whether an external executable is available and returns version / capabilities.
func Probe(req protocol.ProbeRequest) protocol.ProbeResult {
	switch req.Exe {
	case "ffmpeg":
		return probeFFmpeg(req.Path)
	case UmCliRsName:
		return probeUmCliRs(req.Path)
	case "qmpc-mmkv-cli":
		return probeQmpcMmkvCli(req.Path)
	case "adb":
		return probeAdb(req.Path)
	default:
		return failResult(fmt.Errorf("未知可执行文件类型: %s", req.Exe))
	}
}

func failResult(err error) protocol.ProbeResult {
	return protocol.ProbeResult{
		OK:    false,
		Error: err.Error(),
	}
}
