package main

import (
	"crypto/rand"
	"flag"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
)

const (
	outExe         = "um-conv-windows-amd64.exe"
	defaultVersion = "v0.0.0"
	defaultCommit  = "custom"
)

func main() {
	container := flag.String("container", "podman", "container CLI (podman or docker)")
	extract := flag.Bool("extract", false, "use create/cp/rm instead of build --output (auto on Windows)")
	flag.Parse()

	root, err := os.Getwd()
	if err != nil {
		fatalf("getwd: %v", err)
	}

	distDir := filepath.Join(root, "dist")
	if err := os.MkdirAll(distDir, 0o755); err != nil {
		fatalf("mkdir dist/: %v", err)
	}

	if _, err := exec.LookPath(*container); err != nil {
		fatalf("未找到 %s，请安装或设置 -container=…", *container)
	}

	version, commit := readBuildIdentity(root)
	fmt.Printf(">> version %s (%s)\n", version, commit)

	useExtract := *extract || runtime.GOOS == "windows"
	if useExtract {
		if err := buildViaExtract(root, distDir, *container, version, commit); err != nil {
			fatalf("%v", err)
		}
	} else {
		buildViaOutput(root, *container, version, commit)
	}

	exePath := filepath.Join(distDir, outExe)
	if _, err := os.Stat(exePath); err != nil {
		fatalf("missing %s", filepath.ToSlash(filepath.Join("dist", outExe)))
	}
	fmt.Println(">>", filepath.ToSlash(filepath.Join("dist", outExe)))
}

func buildViaOutput(root, container, version, commit string) {
	cmd := exec.Command(container, imageBuildArgs(version, commit, "--output", "type=local,dest=dist")...)
	cmd.Dir = root
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		fatalf("%s build: %v", container, err)
	}
}

// buildViaExtract builds the artifacts image and copies the exe out. It returns
// errors instead of exiting so deferred container/image cleanup always runs.
func buildViaExtract(root, distDir, container, version, commit string) error {
	run := func(args ...string) error {
		cmd := exec.Command(container, args...)
		cmd.Dir = root
		cmd.Stdout = os.Stdout
		cmd.Stderr = os.Stderr
		return cmd.Run()
	}

	suffix := rand.Text()
	imageTag := "localhost/um-conv-win32-artifacts:" + suffix
	extractName := "um-conv-win32-extract-" + suffix

	if err := run(imageBuildArgs(version, commit, "-t", imageTag)...); err != nil {
		return fmt.Errorf("%s build: %w", container, err)
	}
	defer func() {
		_ = exec.Command(container, "rmi", "-f", imageTag).Run()
	}()

	if err := run("create", "--name", extractName, imageTag); err != nil {
		return fmt.Errorf("%s create: %w", container, err)
	}
	defer func() {
		_ = exec.Command(container, "rm", "-f", extractName).Run()
	}()

	hostExe := filepath.Join(distDir, outExe)
	if err := run("cp", extractName+":/"+outExe, hostExe); err != nil {
		return fmt.Errorf("%s cp: %w", container, err)
	}
	return nil
}

func imageBuildArgs(version, commit string, extra ...string) []string {
	args := []string{
		"build",
		"-f", "containers/win32-prod.Dockerfile",
		"--target", "artifacts",
	}
	args = append(args, extra...)
	args = append(args,
		"--build-arg", "APP_VERSION="+version,
		"--build-arg", "APP_COMMIT="+commit,
		".",
	)
	return args
}

// resolveBuildIdentity maps `git describe --tags --always --dirty` output to the
// values injected into the binary. describedOK is false when git is missing or
// the directory is not a repository (falling back to v0.0.0 / custom). A dirty
// worktree is already encoded in described (for example v1.0.0-dirty).
func resolveBuildIdentity(described string, describedOK bool, short string) (version, commit string) {
	described = strings.TrimSpace(described)
	short = strings.TrimSpace(short)
	if !describedOK || described == "" {
		return defaultVersion, defaultCommit
	}
	if short == "" {
		return described, defaultCommit
	}
	return described, short
}

func readBuildIdentity(dir string) (version, commit string) {
	described, err := gitOutput(dir, "describe", "--tags", "--always", "--dirty")
	if err != nil {
		return resolveBuildIdentity("", false, "")
	}
	short, err := gitOutput(dir, "rev-parse", "--short", "HEAD")
	if err != nil {
		return resolveBuildIdentity(described, true, "")
	}
	return resolveBuildIdentity(described, true, short)
}

func gitOutput(dir string, args ...string) (string, error) {
	cmd := exec.Command("git", args...)
	cmd.Dir = dir
	out, err := cmd.Output()
	if err != nil {
		return "", err
	}
	return string(out), nil
}

func fatalf(format string, args ...any) {
	fmt.Fprintf(os.Stderr, format+"\n", args...)
	os.Exit(1)
}
