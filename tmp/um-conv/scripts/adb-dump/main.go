// Command adb-dump pulls the device payloads um-conv already knows how to read.
// The device must be rooted: the same su | gzip | base64 shell used by decryption.
package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"maps"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"runtime"
	"slices"
	"strings"

	"git.um-react.app/um/um-conv/app/adb"
	"git.um-react.app/um/um-conv/app/algo/kgm"
	"git.um-react.app/um/um-conv/app/algo/kwm"
	"git.um-react.app/um/um-conv/app/algo/qmc"
)

func main() {
	if err := run(os.Args[1:]); err != nil {
		fmt.Fprintf(os.Stderr, "adb-dump: %v\n", err)
		os.Exit(1)
	}
}

type stringList []string

func (s *stringList) String() string {
	if s == nil {
		return ""
	}
	return strings.Join(*s, ",")
}

func (s *stringList) Set(value string) error {
	*s = append(*s, value)
	return nil
}

func run(args []string) error {
	var modes stringList
	fs := flag.NewFlagSet("adb-dump", flag.ContinueOnError)
	fs.SetOutput(os.Stderr)
	adbPath := fs.String("adb", "", "adb 可执行文件路径；省略时查找 ./bin/adb 再查找 PATH")
	deviceID := fs.String("s", "", "只拉取这一台设备；省略则拉取每台状态为 device 的设备")
	outDir := fs.String("out", "", "把原始字节写入该目录，文件名为 <device>-<kgm|kwm|qmc>.bin")
	full := fs.Bool("full", false, "打印完整 value；省略时只打印长度和前 8 个字符")
	fs.Var(&modes, "m", "要拉取的数据源：kgm、kwm、qmc 或 all，可重复。省略等同于 -m all")
	fs.Usage = func() {
		fmt.Fprintf(fs.Output(), "用法: adb-dump [-adb path] [-s device] [-m kgm|kwm|qmc|all]... [-out dir] [-full]\n\n")
		fs.PrintDefaults()
	}
	if err := fs.Parse(args); err != nil {
		if errors.Is(err, flag.ErrHelp) {
			return nil
		}
		return err
	}
	if fs.NArg() != 0 {
		return fmt.Errorf("不接受位置参数: %s", strings.Join(fs.Args(), " "))
	}

	sources, err := selectSources(modes)
	if err != nil {
		return err
	}
	resolved, err := resolveAdb(*adbPath)
	if err != nil {
		return err
	}
	if *outDir != "" {
		if err := os.MkdirAll(*outDir, 0o755); err != nil {
			return fmt.Errorf("无法创建输出目录: %w", err)
		}
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt)
	defer stop()

	client := adb.Client{Path: resolved}
	devices, err := targetDevices(ctx, client, *deviceID)
	if err != nil {
		return err
	}

	attempts, failures := 0, 0
	for i, device := range devices {
		if i > 0 {
			fmt.Println()
		}
		fmt.Printf("device %s\n", device)
		for _, source := range sources {
			if err := ctx.Err(); err != nil {
				return err
			}
			attempts++
			if err := dumpSource(ctx, client, device, source, *outDir, *full); err != nil {
				if ctx.Err() != nil {
					return ctx.Err()
				}
				failures++
				fmt.Printf("  %s  fail  %v\n", source.Name, err)
			}
		}
	}
	if attempts > 0 && failures == attempts {
		return errors.New("选中的数据源全部读取失败")
	}
	return nil
}

type source struct {
	Name  string
	Path  string
	Parse func(context.Context, []byte) (map[string]string, error)
}

func supportedSources() []source {
	return []source{
		{Name: "kgm", Path: kgm.DeviceKeyPath, Parse: func(_ context.Context, data []byte) (map[string]string, error) {
			return kgm.ParseDeviceKeys(data)
		}},
		{Name: "kwm", Path: kwm.DeviceKeyPath, Parse: func(_ context.Context, data []byte) (map[string]string, error) {
			return kwm.ParseDeviceKeys(data)
		}},
		{Name: "qmc", Path: qmc.DeviceDBPath, Parse: func(ctx context.Context, data []byte) (map[string]string, error) {
			return qmc.ParseDeviceDatabase(ctx, "", data)
		}},
	}
}

func selectSources(modes []string) ([]source, error) {
	catalog := supportedSources()
	if len(modes) == 0 {
		return catalog, nil
	}
	names := sourceNames(catalog)
	wantAll := false
	want := make(map[string]struct{}, len(modes))
	for _, mode := range modes {
		mode = strings.TrimSpace(mode)
		if mode == "" {
			return nil, fmt.Errorf("数据源名称不能为空，可选: all, %s", names)
		}
		if mode == "all" {
			wantAll = true
			continue
		}
		if !knownSource(catalog, mode) {
			return nil, fmt.Errorf("未知数据源 %q，可选: all, %s", mode, names)
		}
		want[mode] = struct{}{}
	}
	if wantAll {
		return catalog, nil
	}
	selected := make([]source, 0, len(want))
	for _, item := range catalog {
		if _, ok := want[item.Name]; ok {
			selected = append(selected, item)
		}
	}
	return selected, nil
}

func knownSource(sources []source, name string) bool {
	for _, item := range sources {
		if item.Name == name {
			return true
		}
	}
	return false
}

func sourceNames(sources []source) string {
	names := make([]string, len(sources))
	for i, item := range sources {
		names[i] = item.Name
	}
	return strings.Join(names, ", ")
}

func resolveAdb(path string) (string, error) {
	path = strings.TrimSpace(path)
	if path != "" {
		info, err := os.Stat(path)
		if err != nil || info.IsDir() {
			return "", fmt.Errorf("adb 路径不可用: %s", path)
		}
		return path, nil
	}
	name := "adb"
	if runtime.GOOS == "windows" {
		name = "adb.exe"
	}
	local := filepath.Join("bin", name)
	if info, err := os.Stat(local); err == nil && !info.IsDir() {
		return local, nil
	}
	resolved, err := exec.LookPath("adb")
	if err != nil {
		return "", errors.New("未找到 adb，请使用 -adb，或将 adb 放入 bin/ 或 PATH")
	}
	return resolved, nil
}

func targetDevices(ctx context.Context, client adb.Client, deviceID string) ([]string, error) {
	deviceID = strings.TrimSpace(deviceID)
	if deviceID != "" {
		return []string{deviceID}, nil
	}
	devices, err := client.Devices(ctx)
	if err != nil {
		return nil, err
	}
	if len(devices) == 0 {
		return nil, errors.New("没有状态为 device 的 adb 设备")
	}
	return devices, nil
}

func dumpSource(ctx context.Context, client adb.Client, device string, item source, outDir string, full bool) error {
	data, err := client.ReadFileAsRoot(ctx, device, item.Path)
	if err != nil {
		return err
	}
	fileNote := ""
	if outDir != "" {
		path, err := writeDump(outDir, device, item.Name, data)
		if err != nil {
			return err
		}
		fileNote = "  file=" + path
	}
	keys, err := item.Parse(ctx, data)
	if err != nil {
		return fmt.Errorf("bytes=%d%s: %w", len(data), fileNote, err)
	}
	fmt.Printf("  %s  ok  bytes=%d  keys=%d%s\n", item.Name, len(data), len(keys), fileNote)
	printKeys(keys, full)
	return nil
}

func writeDump(dir, device, name string, data []byte) (string, error) {
	path := filepath.Join(dir, fileSafe(device)+"-"+name+".bin")
	if err := os.WriteFile(path, data, 0o600); err != nil {
		return "", fmt.Errorf("无法写入 %s: %w", path, err)
	}
	return path, nil
}

func fileSafe(device string) string {
	return strings.Map(func(r rune) rune {
		switch r {
		case ':', '\\', '/', '*', '?', '"', '<', '>', '|':
			return '_'
		default:
			return r
		}
	}, device)
}

func printKeys(keys map[string]string, full bool) {
	names := slices.Sorted(maps.Keys(keys))
	for _, name := range names {
		value := keys[name]
		if full {
			fmt.Printf("    %s  %s\n", name, value)
			continue
		}
		fmt.Printf("    %s  len=%d  key=%s\n", name, len([]rune(value)), valuePrefix(value, 8))
	}
}

func valuePrefix(value string, n int) string {
	runes := []rune(value)
	if len(runes) <= n {
		return value
	}
	return string(runes[:n]) + "..."
}
