# 开发与构建指南

## 技术栈

- **后端**：Go 1.26 + [Wails v3](https://v3.wails.io/)（`v3.1.0`），配合 `go-toml/v2`、`json-patch/v5`、`ncruces/go-sqlite3`（纯 Go/WASM SQLite，用于读取酷狗与 QQ 音乐密钥数据库）与 `unlock-music/go-mmkv`（用于解析酷狗 Android MMKV 密钥数据）。
- **前端**：React 19 + Fluent UI v9 + Zustand 5 + Vite 8 + TypeScript 5.9 + Vitest 5（生产构建 `vite build` 跳过 `tsc`，类型检查需运行 `npm run typecheck`）。
- **转换与解密**：外部 `ffmpeg`（通过 `-progress pipe:1` 上报转码进度）、`um_cli_rs`、`qmpc-mmkv-cli`，以及可选的 `adb`（从已 root 的 Android 设备读取密钥）。

## 环境依赖

- **Go**：`1.26+`（参见 [`go.mod`](../go.mod)）。
- **Node.js**：版本以 [`frontend/.node-version`](../frontend/.node-version)（当前 `v26.13.0`）为准，推荐使用 `fnm` 管理版本；包管理器仅使用 `npm` 并保留 [`frontend/package-lock.json`](../frontend/package-lock.json)。
- **just**：项目任务编排工具（<https://github.com/casey/just#installation>，Windows 示例：`winget install Casey.Just`）。
- **wails3 CLI**：

  ```bash
  go install github.com/wailsapp/wails/v3/cmd/wails3@v3.1.0
  export PATH="$(go env GOPATH)/bin:$PATH"
  ```

  安装完成后可执行 `wails3 doctor` 验证本机 Wails 环境。
- **平台开发依赖**：
  - **Windows**：[WebView2](https://developer.microsoft.com/microsoft-edge/webview2/)（Windows 10/11 通常已自带）。
  - **Arch Linux**：Wails v3 默认依赖 GTK4 + WebKitGTK 6.0：

    ```bash
    sudo pacman -S --needed base-devel gtk4 webkitgtk-6.0
    ```

- **可选工具**：
  - 本地运行调试及依赖真实命令的测试需要 `ffmpeg`（以及按需准备 `um_cli_rs`、`qmpc-mmkv-cli`、`adb`）。
  - 仅在执行 `just icons` 重新生成应用图标时需要 ImageMagick（`magick`）。

## 初始化项目

`build/` 与 `frontend/bindings/` 均**不入库**（见 [`.gitignore`](../.gitignore)）。克隆仓库后，在执行 `wails3 build` 或 `wails3 task` 前必须先初始化依赖并生成 `build/` 脚手架：

```bash
just tidy
just frontend-deps
just bootstrap
# 强制重建 build/：just force=true bootstrap
```

[`scripts/bootstrap/main.go`](../scripts/bootstrap/main.go) 会调用 `wails3 generate build-assets` 生成 `build/`；若仓库根目录存在 `build.toml`，则会从中读取覆盖默认产品元信息的配置。

## 本地开发与绑定生成

```bash
just dev          # 自动执行 bootstrap 和 frontend-deps，再启动 wails3 task dev
```

开发模式默认使用 Vite 端口 `9245`（可通过环境变量 `WAILS_VITE_PORT` 覆盖，参见 [`Taskfile.yml`](../Taskfile.yml) 与 [`frontend/vite.config.ts`](../frontend/vite.config.ts)）。

当 Go 协议或服务签名变更稳定后，在仓库根目录重新生成 TypeScript 绑定：

```bash
just binding
# 等价于：wails3 generate bindings -clean=true -time-type=Date -ts ./...
```

如需一次性安装前端依赖、构建前端产物并刷新绑定，可执行：

```bash
just frontend
```

## 测试、类型检查与格式化

- **Go**：

  ```bash
  go test ./...
  gofmt -w <changed-go-files...>
  go vet ./...
  ```

  修改 Windows `HideConsoleWindow` / `SysProcAttr` 时，可在非 Windows 上交叉编译验证：

  ```bash
  CGO_ENABLED=0 GOOS=windows GOARCH=amd64 go test -c -o /tmp/um-conv-utils-windows.test ./app/utils
  ```

  子进程空闲优先级只能在 Windows 上手动确认（任务管理器或 `Get-Process … | Select-Object PriorityClass`）。

- **前端**（在 `frontend/` 下运行，确保 Node 版本匹配 `.node-version`）：

  ```bash
  cd frontend
  npm run typecheck
  npm test
  npm run build
  npm run format:check
  # 仅格式化改动文件：
  npm exec -- prettier --write <changed-files...>
  ```

## 构建与打包

### 本机构建

```bash
just build        # 内部先执行 bootstrap，再调用 wails3 build
```

[`Taskfile.yml`](../Taskfile.yml) 中的 `prepare:icon` 会调用 [`scripts/prepare-icon/main.go`](../scripts/prepare-icon/main.go) 将 `app/assets/icon.png` 写入 `build/appicon.png`。

如需从 `app/assets/icon.svg` 重新生成 `icon.png` 与 `icon.ico`：

```bash
just icons
```

### 发布用 Windows 可执行文件（容器交叉编译）

使用容器构建可避免将本机路径写入发布二进制，具体配方见 [`containers/win32-prod.Dockerfile`](../containers/win32-prod.Dockerfile) 与 [`scripts/build-prod-win32/main.go`](../scripts/build-prod-win32/main.go)：

```bash
just build-prod-win32
# 默认使用 podman build --output type=local,dest=dist
# Windows 下或指定 extract=true 时会自动采用 build -> create -> cp -> rm 导出：
just extract=true build-prod-win32
# 改用 Docker：
just container=docker build-prod-win32
```

多阶段构建流程如下：

1. `bindings`（`golang:1.26-bookworm`）：安装 `wails3@v3.1.0`，生成 TypeScript bindings 与 `wails_windows_amd64.syso`（嵌入图标与 [`containers/windows.manifest`](../containers/windows.manifest)）。
2. `frontend`（`node:22-bookworm`）：执行 `npm ci` 与 `npm run build`。
3. `build`（`golang:1.26-bookworm`）：使用 `CGO_ENABLED=0 GOOS=windows GOARCH=amd64` 与 `-tags production -trimpath -buildvcs=false -ldflags="-w -s -H windowsgui -X main.AppVersion=… -X main.AppCommit=…"` 交叉编译。镜像构建上下文不含 `.git`，版本由宿主机在调用容器前算好，经 `APP_VERSION` / `APP_COMMIT` 两个 build-arg 传入。
4. `artifacts`（`scratch`）：导出产物至 `dist/um-conv-windows-amd64.exe`。

`just build-prod-win32` 与 CI 构建均通过 `git describe --tags --always --dirty` 和 `git rev-parse --short HEAD` 获取版本与提交号：

- 当前提交正好是 `v1.0.0`、短哈希是 `abcdef1` 时，写入 `v1.0.0` 与 `abcdef1`。
- 比某个 tag 超前若干提交时，写入诸如 `v1.0.0-3-gabcdef1` 与短哈希；仓库尚无任何 tag 时，版本回退为短哈希。
- 工作区相对 HEAD 有已跟踪文件改动时，版本追加 `-dirty` 后缀（例如 `v1.0.0-dirty`），提交号仍是短哈希。未跟踪文件不算 dirty。
- 不是 git 仓库或找不到 git 时，回退写入 `v0.0.0` 与 `custom`。

`just dev` 与 `just build` 不查 git，沿用 [`main.go`](../main.go) 里的默认值 `v0.0.0` / `custom`。自定义 Go 构建仍可通过 `-ldflags` 覆盖：

- `-X main.AppVersion=<version>`
- `-X main.AppCommit=<commit>`

## 常用命令速查

```bash
just tidy                   # 整理 Go 模块依赖
just frontend-deps          # 按需安装前端依赖（不存在 node_modules 时执行 fnm use && npm ci）
just bootstrap              # 生成 build/ 脚手架（force=true 可强制重建）
just binding                # 重新生成 frontend/bindings/
just frontend               # 安装前端依赖、构建前端并刷新 bindings
just dev                    # 启动开发环境
just build                  # 当前平台本机构建
just icons                  # 从 icon.svg 重新生成 icon.png 与 icon.ico
just build-prod-win32       # 容器交叉编译 Windows exe 到 dist/
```
