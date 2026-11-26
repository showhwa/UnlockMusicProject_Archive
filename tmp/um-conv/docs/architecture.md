# 项目结构与架构说明

## 目录结构

```text
um-conv/
├── main.go                       # 应用入口：嵌入 frontend/dist 并启动 app.Run
├── go.mod / go.sum
├── justfile                      # 项目任务编排入口
├── Taskfile.yml                  # Wails 任务定义（依赖 just bootstrap 生成的 build/）
├── AGENTS.md / skills-lock.json  # 仓库规则与外部 skill 锁定信息
├── app/
│   ├── formats.go                # 汇总关于页展示的输入格式分组（supportedFormatGroups）
│   ├── loader.go                 # 初始化日志、配置路径、Store、Wails 服务、窗口及文件拖放
│   ├── adb/                      # ADB 客户端封装：设备列举与 su | gzip | base64 root 文件读取
│   ├── algo/
│   │   ├── kgm/                  # 酷狗音频（.kgm/.vpr/.kgg/.kgma 及 .kgm.flac/.kgg.flac）探测、本地密钥库与 ADB MMKV 密钥读取及解密
│   │   ├── kwm/                  # 酷我音频（.kwm，以及 kuwo -I 认领的 .flac）探测、ADB MMKV 密钥读取及 v1/v2 解密
│   │   ├── ncm/                  # 网易云（.ncm）解密与元信息/封面提取
│   │   └── qmc/                  # QQ 音乐 QMC2（.mflac/.mgg 及一位 0-9/a-z 后缀、其 .flac 形式、.mmp4）解密、qmpc-mmkv-cli 与 ADB 数据库密钥查询
│   ├── assets/                   # 应用图标源文件（icon.svg / icon.png / icon.ico）
│   ├── avconv/                   # FFmpeg 编解码参数、媒体探测与 -progress pipe:1 进度解析
│   ├── cmd/                      # 子进程执行封装
│   ├── configdir/                # 便携模式与系统配置目录下的 um-conv.toml 路径解析
│   ├── logger/                   # slog 日志初始化（输出至 um-conv.log 与 stderr）
│   ├── probe/                    # 外部工具路径解析与版本/编码器探测
│   ├── protocol/                 # 跨层共享数据结构、设置校验/修复、输出预设与事件常量
│   ├── service/
│   │   ├── appinfo/              # AppInfoService：暴露应用版本、项目地址与输入格式列表
│   │   ├── convert/              # ConvertService：队列管理、解密转码调度与状态快照推送
│   │   └── settings/             # SettingsService：读写、Patch 与外部工具探测入口
│   ├── settingstore/             # 权威设置状态、输出预设目录、TOML 持久化与 JSON Merge Patch
│   └── utils/
│       ├── adbkeys/              # 多设备 ADB root 文件拉取与密钥表合并
│       ├── fileopen/             # 跨平台调用系统默认程序打开文件或在文件管理器中定位文件
│       └── ...                   # 跨平台辅助（如 Windows 隐藏子进程控制台窗口并设置 IDLE_PRIORITY_CLASS）
├── containers/
│   ├── win32-prod.Dockerfile     # Windows 生产包多阶段交叉编译镜像定义
│   └── windows.manifest          # Windows 应用清单
├── docs/                         # 开发者文档
├── frontend/
│   ├── AGENTS.md                 # 前端开发规范
│   ├── .node-version             # Node.js 版本声明
│   ├── package.json / vite.config.ts
│   ├── bindings/                 # wails3 自动生成的 TS 绑定（不入库）
│   ├── dist/                     # 前端构建产物（不入库）
│   └── src/
│       ├── components/           # 页面组件（转换主界面、文件列表、设置分区等）
│       ├── hooks/                # Store 订阅、工具探测、乐观设置、拖放路由等 hooks
│       ├── i18n/                 # 国际化配置与文案
│       ├── lib/                  # 状态同步与文件拖放分发
│       ├── pages/                # ConvertPage / SettingsPage
│       ├── settings/             # 设置页面选项标签与分区定义
│       └── types/                # 前端辅助类型
├── scripts/
│   ├── adb-dump/                 # 调试脚本：通过 ADB 从已 root 设备拉取并检查酷狗 / 酷我 / QQ 音乐密钥数据
│   ├── bootstrap/                # 生成 gitignore 的 build/ 脚手架
│   ├── build-prod-win32/         # 调用 Podman/Docker 交叉编译并提取产物到 dist/
│   └── prepare-icon/             # 将 app/assets/icon.png 复制到 build/appicon.png
└── build/                        # 本地生成，不入库（.gitignore）
```

## 核心设计

### 权威状态与 Revision 同步

- Go 端拥有所有持久化设置、输出预设列表以及转换队列/任务状态的权威定义：
  - [`app/settingstore/store.go`](../app/settingstore/store.go) 持有 `Settings` 与单调递增的 `revision`，支持全量校验保存（`Save`）与 RFC 7396 JSON Merge Patch 局部更新（`PatchState`），并在提交成功后触发变更信号。
  - [`app/service/convert/service.go`](../app/service/convert/service.go) 持有文件队列与 `JobState`，当文件列表、任务进度变更或收到 `Store.Changes()` 通知时，通过 Wails 事件 `convert:state` 向前端广播完整 `AppSnapshot`。
- `AppSnapshot` 同时携带任务会话的 `revision` 与设置的 `settingsRevision`，前端据此丢弃过期或乱序到达的快照、事件与异步响应；乐观更新在收到后端确认或失败结果后与权威状态对齐。

### 外部工具解析与探测

- [`app/probe/resolve.go`](../app/probe/resolve.go) 统一处理外部可执行文件解析：
  - 若配置值为绝对路径，则直接校验该文件是否存在且非目录；
  - 若留空或仅提供名称，则依次查找应用可执行文件同级的 `bin/` 目录（Windows 自动补全 `.exe`）与系统 `PATH`。
- 设置页通过 `SettingsService.ProbeExecutable` 探测 `ffmpeg`（包含版本与可用音频编码器列表）、`um_cli_rs`、`qmpc-mmkv-cli` 和 `adb`。

### 原生文件拖放

- [`app/loader.go`](../app/loader.go) 在窗口启用 `EnableFileDrop` 并监听 `events.Common.WindowFilesDropped`，结合目标元素的 `ElementID` 与文件系统类型判定，通过事件 `files:dropped`（`protocol.FilesDroppedEvent`）将路径列表发往前端。
- 前端 [`frontend/src/lib/fileDrop.ts`](../frontend/src/lib/fileDrop.ts) 按 `targetId` 分发到文件列表（批量添加文件/目录）、输出目录、临时目录或外部工具路径输入框。

### 解密与转码管线

1. **启动前检查（Preflight）**：[`app/service/convert/preflight.go`](../app/service/convert/preflight.go) 始终解析 `ffmpeg`（用于探测原格式），当队列中有文件被解密算法认领时额外解析 `um_cli_rs`（普通 `.flac` 不认领；`kuwo -I` 成功的 `.flac` 会认领）；若输出目标为自定义目录，校验路径非空。
2. **工人池调度、取消与进度汇总**：预检完成后按 `protocol.ResolveParallel` 启动并行工人（`enableParallel` 默认开启，`parallel <= 0` 取 CPU 核心数、上限 256；这两项设置仅位于设置页「常规」，不进入 `QuickSettings`）。同一会话共享同一个 `algoRegistry` 实例，保证 ADB 与本地密钥库每会话仍最多加载一次。用户取消仅置位而不取消在飞任务的 `ctx`，在飞文件执行完毕，未领取文件保持 `pending`，`JobState.Status` 新增 `cancelled`。总进度文案使用「已处理 x/y 个文件，成功 a，跳过 b，错误 z」汇总模板（不再显示当前文件名），总百分比按各文件进度分数之和除以队列长度计算。
3. **解密阶段**：[`app/service/convert/registry.go`](../app/service/convert/registry.go) 按注册顺序调用 `DeepProbe`，分发到 `ncm`、`qmc`、`kgm` 或 `kwm`，将解密产物写入临时目录（可返回音频、封面与元信息临时文件）。后缀算法只匹配自己的扩展名；`kwm` 对 `.flac` 调用 `um_cli_rs kuwo -I`，命令失败则继续当普通 FLAC 转码。各解密器的密钥获取与版本支持如下：
   - `qmc`：`PCv1`/`QTag` 使用内嵌 ekey；`MusicEx` 优先内嵌 ekey，否则调用 `qmpc-mmkv-cli`；`STag` 在开启 `allow_adb_keys` 时经 `app/adb` 与 `app/utils/adbkeys` 拉取 Android `player_process_db` 并由 [`app/algo/qmc/qmcdb.go`](../app/algo/qmc/qmcdb.go) 用 SQLite 读取。
   - `kgm`：v2/v3 直接解密；v5 先经 [`app/algo/kgm/keys.go`](../app/algo/kgm/keys.go) 调用 `um_cli_rs` 探测/解密本地 `KGMusicV3.db` 并用 SQLite 查询，缺失且开启 `allow_adb_keys` 时回退至 [`app/algo/kgm/adb.go`](../app/algo/kgm/adb.go) 通过 ADB 读取酷狗 MMKV 密钥并用 `go-mmkv` 解析。
   - `kwm`：通过 `um_cli_rs kuwo -I` 探测版本（含伪装 `.flac`）；v1 直接解密，v2 在开启 `allow_adb_keys` 时经 [`app/algo/kwm/adb.go`](../app/algo/kwm/adb.go) 通过 ADB 读取酷我 MMKV 密钥（剥离 `sec_ekey#` 前缀，按 `<resourceId>-<formatName>` 查找）。
4. **转码与输出**：[`app/avconv/encode.go`](../app/avconv/encode.go) 根据 `OutputProfile`、音质与编码器设置执行转码（使用 `-progress pipe:1` 上报实时进度，并在转码时混入 NCM 等提取的封面与元信息）。输出路径通过 [`app/service/convert/output_registry.go`](../app/service/convert/output_registry.go) 的会话输出登记表加锁预约，避免并发写入冲突：若目标路径已被本会话其他任务占用，`skip` 模式直接跳过，`rename` 模式顺延编号重命名，`overwrite` 模式报错并拒绝覆盖本会话已写文件。单文件结束后自动清理临时文件，并按设置处理源文件删除。Windows 上 [`HideConsoleWindow`](../app/utils/hide_console_windows.go) 同时为子进程设置 `IDLE_PRIORITY_CLASS`。
