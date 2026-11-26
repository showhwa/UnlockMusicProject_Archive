package probe

import "git.um-react.app/um/um-conv/app/protocol"

func probeQmpcMmkvCli(path string) protocol.ProbeResult {
	return probeVersionFlag(path, "qmpc-mmkv-cli", "qmpc-mmkv-cli")
}
