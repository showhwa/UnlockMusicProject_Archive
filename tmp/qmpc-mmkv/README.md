# qmpc-mmkv

[![Build Status](https://git.um-react.app/um/qmpc-mmkv/actions/workflows/build.yaml/badge.svg)](https://git.um-react.app/um/qmpc-mmkv/actions?workflow=build.yaml)

用 C23 + Meson 实现的 QQ 音乐 MMKV 相关工具，提供下述组件：

- 核心库 `libqmpc`
- 命令行 `qmpc-mmkv-cli`
- Win32 图形界面 `qmpc-mmkv-gui` （空壳）

编译的目标平台为 Windows x64，Linux 可原生编译库与 CLI（缺少 CF 12 号函数模拟或调用）。

## 使用指南

预构建的二进制文件可以在[发布页]下载。

[发布页]: https://git.um-react.app/um/qmpc-mmkv/releases

```powershell
# 查看 CLI 帮助
.\qmpc-mmkv-cli.exe --help

# 双击或不带参数运行: 按本机 HWID 推导路径与密钥，写出 qmpc-mmkv-v1.mmkv
.\qmpc-mmkv-cli.exe

# 远程调用当前运行的 QQ 音乐客户端来获取文件路径与密钥。
# 在 hwid 模式失败的时候可以尝试，但可能会被检测。
.\qmpc-mmkv-cli.exe -m rpc

# 打印 system-id / MMKV 路径与密钥
.\qmpc-mmkv-cli.exe -c system-id

# 手动指定加密 mmkv 文件与对应的 16 字符密钥
.\qmpc-mmkv-cli.exe -i path\to\file.dat -k 0123456789ABCDEF

# 解密并输出到终端（第一行输出文件名，第二行输出密钥）
.\qmpc-mmkv-cli.exe -f plaintext -o -
```

## 技术文档

| 文档                       | 说明                                                      |
| -------------------------- | --------------------------------------------------------- |
| [编译](docs/build.md)      | 容器 / MinGW 交叉编译与产物位置                           |
| [开发](docs/developing.md) | 系统依赖、uv 工具链与 prek 格式化 hooks                   |
| [测试](docs/testing.md)    | 本机与 Wine 下的单元测试                                  |
| [CF12](docs/cf12.md)       | CommonFunction.dll ordinal 12 与 `qmpc_cf12_get_via_hwid` |
