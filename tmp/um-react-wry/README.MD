# um-react-wry

一个利用 [wry](https://github.com/tauri-apps/wry) 框架库制作的 um-react 单文件打包工具。

> **WARNING**
> 这是打包工具的源码与下载。打包好的文件将会在 [um-react 的 Release 页面][um_react_release]提供下载。

[um_react_release]: https://git.unlock-music.dev/um/um-react/releases

## 构建单文件

1. 确保 rust 已经安装。[参考说明](https://www.rust-lang.org/tools/install)。
2. [下载 `um-react.zip`](https://git.unlock-music.dev/um/um-react/releases/latest) 并放入当前目录。
3. 执行 `cargo build --bin um-react-wry-stub --release` 构建模板可执行文件。
4. 执行 `cargo run --bin builder -- -t target/release/um-react-wry-stub.exe -o um-react@v1.2.3.exe` 构建最终的单文件。

## 更新资源文件 `um-react.zip`

1. [下载 `um-react.zip`](https://git.unlock-music.dev/um/um-react/releases/latest) 并放入当前目录。
2. 执行 `cargo run --bin builder` 生产更新的 `um-react.exe`。
