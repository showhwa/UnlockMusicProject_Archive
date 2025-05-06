# Unlock Music 音乐解锁 (React)

[![Build Status](https://ci.unlock-music.dev/api/badges/um/um-react/status.svg)](https://ci.unlock-music.dev/um/um-react)

- 在浏览器中解锁加密的音乐文件。 Unlock encrypted music file in the browser.
  - 查看[原基于 Vue 的 Unlock Music 项目][um-vue]
- Unlock Music 项目是以学习和技术研究的初衷创建的，修改、再分发时请遵循[授权协议]。
- Unlock Music 的 CLI 版本可以在 [unlock-music/cli] 找到，大批量转换建议使用 CLI 版本。
- 我们新建了 Telegram 群组 [`@unlock_music_chat`] ，欢迎加入！
- CI 自动构建已经部署，可以在 [Actions][um-react-actions] 寻找对应的<ruby>构建产物<rp>(</rp><rt>Artifact</rt><rp>)</rp> </ruby>下载。
- [常见问题参考](./docs/faq_zh-hans.md)

> **WARNING**
> 在本站 fork 不会起到备份的作用，只会浪费服务器储存空间。如无必要请勿 fork 该仓库。

[授权协议]: https://git.unlock-music.dev/um/um-react/src/branch/main/LICENSE
[um-vue]: https://git.unlock-music.dev/um/web
[unlock-music/cli]: https://git.unlock-music.dev/um/cli
[`@unlock_music_chat`]: https://t.me/unlock_music_chat
[um-react-actions]: https://git.unlock-music.dev/um/um-react/actions

⚠️ 手机端浏览器支持有限，请使用最新版本的 Chrome 或 Firefox 官方浏览器。

## 支持的格式

- [x] QQ 音乐 QMCv1 (`.qmc3` / `.qmcflac` 等)
- [x] QQ 音乐 QMCv2
  - PC 客户端 (`.mflac` / `.mgg` 等) [^qm-key-pc]
  - 安卓客户端 (`.mflac0` / `.mgg1` / `.mggl` 等) [^qm-key-android]
  - iOS 客户端 (`.mgalaxy` 等) [^qm-key-ios]
  - Mac 客户端 (`.mflach` 等) [^qm-key-mac]
- [x] 网易云音乐 (`.ncm`)
- [x] 虾米音乐 (`.xm`)
- [x] 酷我音乐 (`.kwm`)
- [x] 酷狗音乐 (`.kgm` / `.vpr` / `.kgg`)
  - PC / 安卓客户端的 `kgg` 文件需要提供密钥数据库。
- [x] 喜马拉雅 (`.x2m` / `.x3m` / `.xm`)
- [x] 咪咕音乐格式 (`.mg3d`)
- [x] 蜻蜓 FM (`.qta`)
- [ ] ~~<ruby>QQ 音乐海外版<rt>JOOX Music</rt></ruby> (`.ofl_en`)~~

[^qm-key-pc]: PC 客户端仅支持 v19.43 或更低版本。

[^qm-key-android]: 需要获取超级管理员权限后提取密钥数据库，并导入后使用。

[^qm-key-ios]: 需要越狱获取密钥数据库，或对设备进行完整备份后提取密钥数据库，并导入后使用。

[^qm-key-mac]: 需要导入密钥数据库。

## 错误报告

有不支持的格式？请提交样本（加密文件）与客户端信息版本信息（如系统版本、下载渠道），或一并上传其安装包到[仓库的问题追踪区][project-issues]。

⚠️ 如果文件太大，请上传到不需要登入下载的网盘，如 [mega.nz](https://mega.nz)、[OneDrive](https://www.onedrive.com/) 等。

遇到解密出错的情况，请一并携带错误信息（诊断信息）并简单描述错误的重现过程。

待实现的算法支持可[追踪 `crypto` 标签](https://git.unlock-music.dev/um/um-react/issues?labels=67)。

[project-issues]: https://git.unlock-music.dev/um/um-react/issues/new

## 使用 Docker 构建、部署 (Linux)

首先克隆仓库并进入目录：

```sh
git clone https://git.unlock-music.dev/um/um-react.git
cd um-react
```

构建 Docker 镜像：

```sh
docker build \
  -t um-react \
  --build-arg GIT_COMMIT_FULL="$(git describe --long --dirty --tags --always)" \
  --build-arg GIT_COMMIT="$(git rev-parse --short HEAD)" \
  .
```

在后台运行 Docker 容器：

```sh
docker run -d -p 8080:80 --name um-react um-react
```

然后访问 `http://localhost:8080` 即可。

## 开发相关

从源码运行或编译生产版本，请参考文档「[新手上路](./docs/getting-started.zh.md)」。

### 解密库开发

⚠️ 如果只是进行前端方面的更改，你可以跳过该节。

请参考文档「[面向 `@unlock-music/crypto` 开发](./docs/develop-with-um_crypto.zh.md)」。

### 架构

- 浏览器主线程: 渲染界面，处理 UI 更新
- Web Worker: 负责计算方面的内容，如内容解密。

数据传输: 生成 blob url (`URL.createObjectURL`) 然后透过 `postMessage` 传递给线程，线程利用 `fetch` API 来获取文件信息。

### 贡献代码

欢迎贡献代码。请确保：

- 单元测试的覆盖率不低于主分支的覆盖率；
- 提交前请使用 Prettier 对代码进行格式化；
- 提交前请确保 ESLint 不会报告 warning / error；

满足上述条件后发起 Pull Request，仓库管理员审阅后将合并到主分支。

## 相关项目

- [Unlock Music (Web)](https://git.unlock-music.dev/um/web) - 原始项目
- [Unlock Music (Cli)](https://git.unlock-music.dev/um/cli) - 命令行批量处理版
- [lib_um_crypto_rust](https://git.unlock-music.dev/um/lib_um_crypto_rust) - 项目引入的解密算法实现
  - [NPM 包](https://git.unlock-music.dev/um/-/packages/npm/@unlock-music%2Fcrypto)
- [um-react (Electron 前端)](https://github.com/CarlGao4/um-react-electron) - 使用 Electron 框架封装的本地可执行文件。
  - [GitHub 下载](https://github.com/CarlGao4/um-react-electron/releases/latest) | [仓库镜像](https://git.unlock-music.dev/CarlGao4/um-react-electron)
- [um-react-wry](https://git.unlock-music.dev/um/um-react-wry) - 使用 WRY 框架封装的 Win64 单文件 (
  需要[安装 Edge WebView2 运行时][webview2_redist]，Win10+ 操作系统自带)
  - [本地下载](https://git.unlock-music.dev/um/um-react/releases/latest) | 寻找文件名为 `um-react-win64-` 开头的附件

[webview2_redist]: https://go.microsoft.com/fwlink/p/?LinkId=2124703

有新的项目提交？欢迎[提交 issue][project-issues]，请带上项目名称和链接。
