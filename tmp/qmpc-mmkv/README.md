# qmpc-mmkv

用 C23 + Meson 实现的 QQ 音乐 MMKV 相关工具：核心库 `libqmpc`，命令行 `qmpc-mmkv-cli`，以及仅 Windows 的 Win32 GUI `qmpc-mmkv-gui`。目标平台为 Windows x64；Linux 可原生编译库与 CLI（硬件 ID 为占位），GUI 需 MinGW 交叉或 Windows 本机构建。

## 仓库结构

| 目录             | 说明                                     |
| ---------------- | ---------------------------------------- |
| `libqmpc/`       | 公共库（头文件 `include/`，实现 `src/`） |
| `qmpc-mmkv-cli/` | 命令行入口                               |
| `qmpc-mmkv-gui/` | Win32 图形界面                           |
| `subprojects/`   | Meson wrap 依赖                          |
| `toolchains/`    | MinGW-w64 交叉配置                       |

## 依赖

经 `subprojects/*.wrap` 拉取（首次配置需访问 GitHub；离线可将源码包放入 `subprojects/packagecache/`）：

| 库                                                | 用途                              |
| ------------------------------------------------- | --------------------------------- |
| [STC](https://github.com/stclib/STC)              | 容器 / 字符串（`libqmpc` 与 CLI） |
| [tiny-AES-c](https://github.com/kokke/tiny-AES-c) | AES                               |
| [md5-c](https://github.com/Zunawe/md5-c)          | MD5                               |

硬盘序列号算法参考 [DiskId32](https://web.archive.org/web/*/https://www.winsim.com/diskid32/diskid32.cpp)（[libqmpc/src/hwid_win/hdd/README.md](libqmpc/src/hwid_win/hdd/README.md)）。

`libqmpc` 的 MMKV 代码只覆盖腾讯 [MMKV](https://github.com/Tencent/MMKV) 的读取与解密（`.crc` 元数据、AES-128-CFB、protobuf varint 与长度前缀字符串），详见 [libqmpc/src/mmkv/README.md](libqmpc/src/mmkv/README.md)。

## 编译

### Docker（推荐）

需启用 BuildKit：

```sh
docker build --output type=local,dest=dist .
```

写入当前 git 短哈希为 Meson `commit` 选项（编译进 `QMPC_COMMIT`，默认 `dev`）：

```sh
docker build \
  --build-arg COMMIT="$(git rev-parse --short HEAD)" \
  --output type=local,dest=dist .
```

在 Debian 容器内完成 Windows 交叉编译，产物为 `dist/qmpc-mmkv-cli.exe` 与 `dist/qmpc-mmkv-gui.exe`。

### Linux 交叉编译

Meson ≥ 1.3，MinGW-w64，以及 `sh`、基础 Unix 工具（`mktemp`、`cat`、`mv`、`rm`）和 `xxd`：

```sh
# Debian 13+
sudo apt install meson ninja-build gcc-mingw-w64-x86-64 binutils-mingw-w64-x86-64 xxd
# Arch
sudo pacman -S --needed meson ninja mingw-w64-gcc mingw-w64-binutils xxd

meson setup build-win --cross-file toolchains/mingw-w64.ini --buildtype=release
meson compile -C build-win
```

自定义工具链目录：复制 `toolchains/local.ini.example` 为 `toolchains/local.ini`，修改 `toolchain_bin` 后：

```sh
meson setup build-custom \
  --cross-file toolchains/mingw-w64.ini \
  --cross-file toolchains/local.ini \
  --buildtype=release
meson compile -C build-custom
```

后出现的 machine file 覆盖先出现的项（见 [Meson Machine files](https://mesonbuild.com/Machine-files.html)）。

Windows 目标构建会用 `as --32` 汇编 `libqmpc/src/generated/payload32.s`，再通过 `objcopy` 和 `xxd` 生成构建目录下的 `libqmpc/src/generated/payload32.c/.h`。C 文件编入库，库内代码可通过 `#include "generated/payload32.h"` 引用 `qmpc_payload32` 和 `qmpc_payload32_len`；头文件不属于公共 API。示例仅返回 42，替换时须保证提取的 `.text` 自包含且无未解决的重定位。Linux 原生构建不生成这些文件，也不需要这些额外工具。

Windows 本机构建需提供 GNU `as`、`objcopy`（例如 MinGW-w64），并将 `sh`、上述 Unix 工具和 `xxd` 加入 `PATH`（例如通过 MSYS2）。交叉编译时 `as` 和 `objcopy` 使用交叉配置中的路径。

### 静态 / 动态库

```sh
meson setup build-win --cross-file toolchains/mingw-w64.ini   # 默认 static
meson configure build-win -Ddefault_library=shared            # 或 both
meson compile -C build-win
```

动态构建时，请将 `libqmpc` 及依赖 DLL（构建目录下 `libqmpc/`、`subprojects/STC-*/` 等）与 EXE 同目录或加入 `PATH`。旧构建目录若残留过期的子项目选项，可新建目录避免干扰。

## 运行

Docker 产物（PowerShell）：

```powershell
.\dist\qmpc-mmkv-cli.exe --help
.\dist\qmpc-mmkv-gui.exe
```

交叉编译产物分别在 `build-win/qmpc-mmkv-cli/` 与 `build-win/qmpc-mmkv-gui/`。

CLI：`-h` / `--help`；未知选项或多余位置参数以状态码 1 退出。常用子命令见 `--help`（如 `dump`、`system-id`）。

## 测试

Windows 本机：

```sh
meson setup build -Dwerror=true
meson compile -C build
meson test -C build --print-errorlogs
```

Linux 上可用 Wine 运行交叉编译出的测试：

```sh
wine build-win/libqmpc/crypto-test.exe
wine build-win/libqmpc/crypto-test.exe hashes
```

单元测试仅在 `default_library=static` 时编译。
