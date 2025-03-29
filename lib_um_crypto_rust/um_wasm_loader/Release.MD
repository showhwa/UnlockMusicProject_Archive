## 发包

- 到后台建立一个 API Token，确保有 `Packages` 的写权限：
- 编辑 `~/.npmrc`，加入下述两行并替换 `token` 为新申请的令牌：

  ```text
  //git.unlock-music.dev/api/packages/um/npm/:_authToken=xxxxx123456789xxxxx
  //git.unlock-music.dev/api/packages/npm/:_authToken=xxxxx123456789xxxxx
  ```

- 使用 `publish` 指令发包：

  ```sh
  pnpm publish --access=public
  ```
