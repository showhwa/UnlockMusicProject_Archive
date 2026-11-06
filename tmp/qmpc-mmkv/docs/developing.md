# 开发指南

本仓库以 C23 + Meson 为主；Python 工具链仅用于脚本与本地 hooks。

## 系统依赖

| 依赖                             | 用途                                                       |
| -------------------------------- | ---------------------------------------------------------- |
| [uv](https://docs.astral.sh/uv/) | 管理项目 Python 环境与开发工具                             |
| Python ≥ 3.13                    | 满足 `pyproject.toml` 的 `requires-python`（可由 uv 拉取） |
| [nasm](https://www.nasm.us/)     | [`scripts/asm2c.py`](../scripts/asm2c.py) 将汇编汇编为字节 |

### 安装依赖

- Ubuntu 26.04 & Debian 13+

```sh
sudo apt install \
  nasm \
  meson \
  ninja-build \
  {gcc,binutils}-mingw-w64-x86-64

# uv: follow guide from `astral.sh`
#     https://docs.astral.sh/uv/getting-started/installation/
```

- Arch Linux

```sh
sudo pacman -S --needed \
  uv \
  nasm \
  meson \
  ninja \
  mingw-w64-{gcc,binutils}
```

## 初始化

在仓库根目录：

```sh
uv sync
uv run prek install
```

安装 [prek](https://prek.j178.dev/) 后，每次进行 git 提交都会跑一遍代码检查与格式化。

## 日常命令

```sh
# 对当前暂存区跑 hooks（与 git commit 时相同）
uv run prek run

# 对仓库内匹配文件全量跑一遍
uv run prek run --all-files
```

## Hooks 覆盖范围

| 类型              | 工具                           |
| ----------------- | ------------------------------ |
| `.c` / `.h`       | clang-format                   |
| `.md`             | rumdl 格式化                   |
| `.py`             | ruff 格式化                    |
| `.json`           | prek 自带 `pretty-format-json` |
| `.yaml` / `.toml` | prek 自带语法检查              |

- 排除 `subprojects/`、`build*/`、`dist/` 等常用构建目录
- `.vscode/` 下多为 JSONC，不跑 `pretty-format-json`。

## 仓库结构

| 目录             | 说明                                     |
| ---------------- | ---------------------------------------- |
| `docs/`          | 开发参考文档。                           |
| `libqmpc/`       | 公共库（头文件 `include/`，实现 `src/`） |
| `qmpc-mmkv-cli/` | 命令行入口                               |
| `qmpc-mmkv-gui/` | Win32 图形界面                           |
| `subprojects/`   | Meson wrap 依赖                          |
| `toolchains/`    | MinGW-w64 交叉配置                       |

## 项目依赖

拉取 `subprojects/*.wrap` 指定的项目依赖：

| 库                                                | 用途          |
| ------------------------------------------------- | ------------- |
| [STC](https://github.com/stclib/STC)              | 容器 / 字符串 |
| [tiny-AES-c](https://github.com/kokke/tiny-AES-c) | AES           |
| [md5-c](https://github.com/Zunawe/md5-c)          | MD5           |

### 代码参考

- 硬盘序列号算法参考 [DiskId32](libqmpc/src/hwid_win/hdd/README.md)
- `libqmpc` 的 MMKV 代码只覆盖腾讯 [MMKV](https://github.com/Tencent/MMKV) 的读取与解密（`.crc` 元数据、AES-128-CFB、protobuf varint 与长度前缀字符串），详见 [libqmpc/src/mmkv/README.md](libqmpc/src/mmkv/README.md)。
