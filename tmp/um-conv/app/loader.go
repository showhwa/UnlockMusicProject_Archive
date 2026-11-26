package app

import (
	"embed"
	"fmt"
	"log"
	"log/slog"
	"os"

	"git.um-react.app/um/um-conv/app/configdir"
	"git.um-react.app/um/um-conv/app/logger"
	"git.um-react.app/um/um-conv/app/protocol"
	"git.um-react.app/um/um-conv/app/service/appinfo"
	"git.um-react.app/um/um-conv/app/service/convert"
	"git.um-react.app/um/um-conv/app/service/settings"
	"git.um-react.app/um/um-conv/app/settingstore"

	"github.com/wailsapp/wails/v3/pkg/application"
	"github.com/wailsapp/wails/v3/pkg/events"
)

//go:embed assets/icon.png
var appIcon []byte

func init() {
	application.RegisterEvent[protocol.FilesDroppedPayload](protocol.FilesDroppedEvent)
}

func Run(version, commit string, assets *embed.FS) {
	if err := logger.Init(); err != nil {
		log.Printf("logger init failed: %v", err)
	}
	defer logger.Close()

	slog.Info("app starting", "version", version, "commit", commit)

	path, err := configdir.ResolveSettingsPath()
	if err != nil {
		log.Fatal(err)
	}
	slog.Info("settings path resolved", "path", path)

	initial := settingstore.LoadFile(path, settingstore.KnownFormatIDs())
	st := settingstore.New(initial, path)
	settingsSvc := settings.NewSettingsService(st)
	convertSvc := convert.NewConvertService(st)
	appInfoSvc := appinfo.NewAppInfoService(version, commit, supportedFormatGroups())

	app := application.New(application.Options{
		Name:        "音乐解锁 - 音频转换器",
		Description: "Unlock Music GUI - Audio Converter",
		Icon:        appIcon,
		Services: []application.Service{
			application.NewService(appInfoSvc),
			application.NewService(settingsSvc),
			application.NewService(convertSvc),
		},
		Assets: application.AssetOptions{
			Handler: application.AssetFileServerFS(assets),
		},
		Mac: application.MacOptions{
			ApplicationShouldTerminateAfterLastWindowClosed: true,
		},
	})

	win := app.Window.NewWithOptions(application.WebviewWindowOptions{
		Title:            fmt.Sprintf("音乐解锁 - 音频转换器 %s (%s)", version, commit),
		Width:            880,
		Height:           560,
		MinWidth:         760,
		MinHeight:        420,
		BackgroundColour: application.NewRGB(245, 247, 250),
		URL:              "/",
		EnableFileDrop:   true,
	})

	win.OnWindowEvent(events.Common.WindowFilesDropped, func(e *application.WindowEvent) {
		paths := e.Context().DroppedFiles()
		details := e.Context().DropTargetDetails()
		if details == nil || details.ElementID == "" || len(paths) == 0 {
			return
		}

		items := make([]protocol.DroppedItem, 0, len(paths))
		for _, p := range paths {
			if p == "" {
				continue
			}
			info, err := os.Stat(p)
			if err != nil {
				continue
			}
			items = append(items, protocol.DroppedItem{
				Path:  p,
				IsDir: info.IsDir(),
			})
		}
		if len(items) == 0 {
			return
		}

		application.Get().Event.Emit(protocol.FilesDroppedEvent, protocol.FilesDroppedPayload{
			TargetID: details.ElementID,
			Items:    items,
		})
	})

	slog.Info("main window created")
	if err := app.Run(); err != nil {
		slog.Error("app exited with error", "err", err)
		log.Fatal(err)
	}
}
