package convert

import (
	"context"
	"sync"

	"git.um-react.app/um/um-conv/app/avconv"
	"git.um-react.app/um/um-conv/app/protocol"
)

// encryptedPlayerByExt maps every extension claimed by a registered decryptor
// to its player label. It is derived from the registry, so a new decryptor only
// needs a playerLabel entry.
var encryptedPlayerByExt = buildPlayerByExt()

func buildPlayerByExt() map[string]string {
	players := make(map[string]string)
	for ext, algo := range newAlgoRegistry(context.Background(), &protocol.Settings{}).exts {
		if label := playerLabel(algo); label != "" {
			players[ext] = label
		}
	}
	return players
}

func playerForPath(path string) string {
	_, player := longestSuffix(path, encryptedPlayerByExt)
	return player
}

func (s *ConvertService) scheduleSourceProbes(entries []*FileEntry) {
	if len(entries) == 0 {
		return
	}
	s.mu.Lock()
	if s.shuttingDown {
		s.mu.Unlock()
		return
	}
	ctx := s.lifecycleContext()
	s.probeWG.Add(1)
	s.mu.Unlock()
	go func() {
		defer s.probeWG.Done()
		s.runSourceProbes(ctx, entries)
	}()
}

func claimedPlayer(ctx context.Context, algorithms algoRegistry, path string) (string, bool) {
	algo, err := algorithms.resolve(ctx, path)
	if err != nil || algo == nil {
		return "", false
	}
	label := playerLabel(algo)
	return label, label != ""
}

// runSourceProbes fills in player labels and media info for newly queued
// entries. ctx is the service lifecycle, so ServiceShutdown stops the probes'
// um_cli_rs / ffmpeg processes.
func (s *ConvertService) runSourceProbes(ctx context.Context, entries []*FileEntry) {
	type probeTarget struct {
		file *FileEntry
		path string
	}
	s.mu.Lock()
	targets := make([]probeTarget, 0, len(entries))
	paths := make([]string, 0, len(entries))
	for _, file := range entries {
		paths = append(paths, file.Path)
		if file.Source.Player == "" {
			targets = append(targets, probeTarget{file: file, path: file.Path})
		}
	}
	s.mu.Unlock()
	if len(targets) == 0 {
		return
	}

	settings := s.store.Snapshot()
	if hasUnlabeledFlac(paths) {
		settings = settingsWithResolvedUmCliRs(settings)
	}
	algorithms := s.algoRegistry(ctx, &settings)
	sem := make(chan struct{}, 2)
	var wg sync.WaitGroup
	for _, target := range targets {
		wg.Add(1)
		go func(t probeTarget) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()
			if ctx.Err() != nil {
				return
			}

			if player, ok := claimedPlayer(ctx, algorithms, t.path); ok {
				s.applySourcePlayer(t.file, player)
				return
			}
			if ctx.Err() != nil {
				return
			}

			settings := s.store.Snapshot()
			ff := avconv.NewFFmpeg(&settings)
			format, bitrate, err := ff.ProbeMedia(ctx, t.path)
			if err != nil {
				return
			}
			s.applySourceProbe(t.file, format, bitrate)
		}(target)
	}
	wg.Wait()
}

func (s *ConvertService) applySourcePlayer(file *FileEntry, player string) {
	s.mutateFileEntry(file, func(entry *FileEntry) {
		entry.Source.Player = player
	})
}

func (s *ConvertService) applySourceProbe(file *FileEntry, format string, bitrateKbps int) {
	s.mutateFileEntry(file, func(entry *FileEntry) {
		entry.Source.OK = true
		entry.Source.Format = format
		entry.Source.BitrateKbps = bitrateKbps
	})
}
