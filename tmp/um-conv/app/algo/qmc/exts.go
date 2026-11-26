package qmc

import (
	"context"

	"git.um-react.app/um/um-conv/app/protocol"
)

// qmcSuffixAlphabet is the single extra character QQ Music appends to .mflac and .mgg.
const qmcSuffixAlphabet = "0123456789abcdefghijklmnopqrstuvwxyz"

func (a *QMPCAlgo) GetSupportedExtensions() []string {
	return QMCExtensions()
}

func (a *QMPCAlgo) DeepProbe(_ context.Context, path string) (bool, error) {
	return protocol.MatchesAnyExtension(path, a.GetSupportedExtensions()), nil
}

func (*QMPCAlgo) PopulateSupportedFormats(formats map[string][]string) {
	formats["QQ 音乐"] = []string{"mgg*", "mflac*", "mmp4"}
}

// QMCExtensions lists every QQ Music suffix this decryptor accepts.
func QMCExtensions() []string {
	bases := []string{".mflac", ".mgg"}
	exts := make([]string, 0, len(bases)*(2+2*len(qmcSuffixAlphabet))+1)
	for _, base := range bases {
		exts = append(exts, base, base+".flac")
		for _, r := range qmcSuffixAlphabet {
			temp := base + string(r) // .mflac0, .mflaca, etc.
			exts = append(exts, temp, temp+".flac")
		}
	}
	exts = append(exts, ".mmp4")
	return exts
}
