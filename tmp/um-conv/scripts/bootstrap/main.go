// Bootstrap generates the gitignored build/ scaffold via wails3.
package main

import (
	"flag"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"

	"github.com/pelletier/go-toml/v2"
)

type BuildConfig struct {
	Name               string
	BinaryName         string
	Dir                string
	ProductName        string
	ProductCompany     string
	ProductIdentifier  string
	ProductDescription string
	ProductCopyright   string
	ProductComments    string
	ProductVersion     string
}

func readBuildConfig(path string) BuildConfig {
	buildConfig := BuildConfig{
		Name:               "um-conv",
		BinaryName:         "um-conv",
		Dir:                "build",
		ProductName:        "音视频转换器",
		ProductCompany:     "um-conv",
		ProductIdentifier:  "com.um.conv",
		ProductDescription: "音视频转换器最小示例",
		ProductCopyright:   "(c) 2026",
		ProductComments:    "Wails v3 + React + ffmpeg",
		ProductVersion:     "0.1.0",
	}
	content, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			// Use default config as it is, if file does not exist
			return buildConfig
		}
		fatalf("read config: %v", err)
	}
	if err := toml.Unmarshal(content, &buildConfig); err != nil {
		fatalf("unmarshal config: %v", err)
	}
	return buildConfig
}

func isBootstrapped(root string) bool {
	configPath := filepath.Join(root, "build", "config.yml")
	_, err := os.Stat(configPath)
	return err == nil
}

func main() {
	force := flag.Bool("force", false, "regenerate build/ even if it already exists")
	config := flag.String("config", "build.toml", "path to build.toml")
	flag.Parse()

	root, err := os.Getwd()
	if err != nil {
		fatalf("getwd: %v", err)
	}

	if _, err := exec.LookPath("wails3"); err != nil {
		fmt.Fprintln(os.Stderr, "未找到 wails3，请先安装：")
		fmt.Fprintln(os.Stderr, "  go install github.com/wailsapp/wails/v3/cmd/wails3@latest")
		os.Exit(1)
	}

	if isBootstrapped(root) && !*force {
		fmt.Println("SKIP: Already bootstrapped.")
		return
	}

	fmt.Println(">> 生成 build/ 脚手架…")
	buildDir := filepath.Join(root, "build")
	if err := os.RemoveAll(buildDir); err != nil {
		fatalf("remove build/: %v", err)
	}

	// Read off build.toml from project root, or `-config`
	buildConfig := readBuildConfig(filepath.Join(root, *config))

	cmd := exec.Command("wails3", "generate",
		"build-assets",
		"-name", buildConfig.Name,
		"-binaryname", buildConfig.BinaryName,
		"-dir", buildConfig.Dir,
		"-productname", buildConfig.ProductName,
		"-productcompany", buildConfig.ProductCompany,
		"-productidentifier", buildConfig.ProductIdentifier,
		"-productdescription", buildConfig.ProductDescription,
		"-productcopyright", buildConfig.ProductCopyright,
		"-productcomments", buildConfig.ProductComments,
		"-productversion", buildConfig.ProductVersion,
	)
	cmd.Dir = root
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		fatalf("wails3 generate build-assets: %v", err)
	}

	fmt.Println(">> 完成。接着可以：")
	fmt.Println("   just dev")
	fmt.Println("   just build-prod-win32")
}

func fatalf(format string, args ...any) {
	fmt.Fprintf(os.Stderr, format+"\n", args...)
	os.Exit(1)
}
