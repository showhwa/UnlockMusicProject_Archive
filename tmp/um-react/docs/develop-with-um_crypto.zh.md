# 面向 `@unlock-music/crypto` 开发

⚠️ 如果只是进行前端方面的更改，你可以跳过该文档。

该文档将假设这两个项目被放置在同级的目录下：

```text
~/Projects/um-projects
    /um-react
    /lib_um_crypto_rust
```

若为不同目录，你需要调整 `LIB_UM_WASM_LOADER_DIR` 环境变量到仓库目录，然后再启动 vite 项目。

## 初次构建

- 进入上层目录：`cd ..`
- 克隆 `lib_um_crypto_rust` 仓库
  - `git clone https://git.unlock-music.dev/um/lib_um_crypto_rust.git`
- 进入 SDK 目录：`cd lib_um_crypto_rust ; cd um_wasm_loader`
- 安装所有 Node 以来：`pnpm i`
- 构建：`pnpm build`

## 做出更改

做出更改后，参考上面的内容进行重新编译。

## 应用 SDK 更改

将构建好的 SDK 直接嵌入到当前前端项目：

```sh
pnpm link ../lib_um_crypto_rust/um_wasm_loader/
```

※ 建立 PR 时，请先提交 SDK PR 并确保你的 SDK 更改已合并。
