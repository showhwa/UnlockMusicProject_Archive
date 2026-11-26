package probe

import "git.um-react.app/um/um-conv/app/protocol"

const UmCliRsName = "um_cli_rs"

func probeUmCliRs(path string) protocol.ProbeResult {
	return probeVersionFlag(path, UmCliRsName, UmCliRsName)
}
