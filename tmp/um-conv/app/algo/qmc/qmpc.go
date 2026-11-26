package qmc

import (
	"context"
	"fmt"
	"log/slog"
	"sync"

	"git.um-react.app/um/um-conv/app/cmd"
	"git.um-react.app/um/um-conv/app/protocol"
)

type QMPCMetadataType string

const (
	QMPCMetadataTypePCv1    QMPCMetadataType = "PCv1"
	QMPCMetadataTypeMusicEx QMPCMetadataType = "MusicEx"
	QMPCMetadataTypeQTag    QMPCMetadataType = "QTag"
	QMPCMetadataTypeSTag    QMPCMetadataType = "STag"
)

type QMPCInfoOutput struct {
	FooterLen            int              `json:"footerLen"`
	EKey                 string           `json:"ekey"`
	MetadataType         QMPCMetadataType `json:"metadataType"`
	MusicexMediaFilename string           `json:"musicexMediaFilename"`
}

type QMPCAlgo struct {
	ctx      context.Context
	settings *protocol.Settings
	adbKeys  func() (map[string]string, error)
	run      func(context.Context, string, []string) (cmd.CallResult, error)
	adbRun   func(context.Context, string, []string) (cmd.CallResult, error)
	ekeyMu   sync.Mutex
}

func NewQMPCAlgo(ctx context.Context, settings *protocol.Settings) *QMPCAlgo {
	if ctx == nil {
		ctx = context.Background()
	}
	a := &QMPCAlgo{ctx: ctx, settings: settings, run: cmd.CallCommandContext}
	a.adbKeys = sync.OnceValues(a.loadAdbKeys)
	return a
}

var _ protocol.Algo = (*QMPCAlgo)(nil)

func (a *QMPCAlgo) Decrypt(src string, dest string, settings *protocol.Settings) (protocol.DecryptResult, error) {
	if err := a.ctx.Err(); err != nil {
		return protocol.DecryptResult{}, err
	}
	activeSettings := protocol.ActiveSettings(a.settings, settings)
	if activeSettings == nil {
		return protocol.DecryptResult{}, errMissingSettings
	}
	ekey, err := a.getEKey(activeSettings, src)
	if err != nil {
		slog.Error("failed to get ekey", "src", src, "error", err)
		return protocol.DecryptResult{}, fmt.Errorf("umc_rs: failed to get ekey: %w", err)
	}

	if err := a.decryptFileWithEKey(activeSettings, src, dest, ekey); err != nil {
		return protocol.DecryptResult{}, err
	}
	return protocol.DecryptResult{AudioPath: dest}, nil
}
