# 测试

Windows 本机：

```sh
meson setup build -Dwerror=true
meson compile -C build
meson test -C build --print-errorlogs
```

Linux 上可用 Wine 运行交叉编译出的测试：

```sh
wine build-win/libqmpc/tests/crypto-test.exe
wine build-win/libqmpc/tests/crypto-test.exe hashes
```

单元测试仅在 `default_library=static` 时编译。
