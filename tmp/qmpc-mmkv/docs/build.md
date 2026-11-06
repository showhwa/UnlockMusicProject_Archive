# 编译指南

## 使用容器编译

推荐的方式，支持 [podman]（推荐） 与 [docker w/ BuildKit][docker]。

[podman]: https://podman.io/
[docker]: https://docs.docker.com/build/buildkit/

使用 `docker` 时将下方的的 `podman` 修改为 `docker` 即可。

```sh
podman build --output type=local,dest=dist .
```

编译时提供当前构建哈希：

```sh
podman build \
  --build-arg COMMIT="$(git rev-parse --short HEAD)" \
  --output type=local,dest=dist .
```

在 Debian 容器内完成 Windows 交叉编译，产物写出到 `dist/*.exe`。

## Linux 下交叉编译

需要提前安装有 Meson 与 MinGW-w64，参考开发指南的[安装依赖](./developing.md#安装依赖)区。

```sh
meson setup build-win --cross-file toolchains/mingw-w64.ini --buildtype=release
meson compile -C build-win
```

### 自定义工具链目录

复制 `toolchains/local.ini.example` 为 `toolchains/local.ini`，然后修改 `toolchain_bin` 指向的目录。

重新编译：

```sh
meson setup build-custom \
  --cross-file toolchains/mingw-w64.ini \
  --cross-file toolchains/local.ini \
  --buildtype=release
meson compile -C build-custom
```

### 静态 / 动态库

```sh
meson setup builddir --cross-file toolchains/mingw-w64.ini   # 默认 static
meson configure builddir -Ddefault_library=shared            # 或 both
meson compile -C builddir
```

动态构建时，请将 `libqmpc` 及依赖 DLL（构建目录下 `libqmpc/`、`subprojects/STC-*/` 等）与 EXE 同目录。

旧构建目录若残留过期的子项目选项，可新建目录避免干扰。

## 运行

产物用法见仓库根目录 [README · 使用指南](../README.md#使用指南)。
