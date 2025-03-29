# JOOX-Crypto

Joox 加密处理库。

支持的加密版本：

- `E!04` - 加密版本 v4

## 安装 & 使用 (Install & Usage)

在项目目录加入 `.npmrc`：

```ini
@unlock-music:registry=https://git.unlock-music.dev/api/packages/um/npm/
```

然后安装：

```sh
npm i --save @unlock-music/joox-crypto
```

使用：

```js
const jooxFactory = require('@unlock-music-gh/joox-crypto');

const data = new Uint8Array(...);
const decryptor = jooxFactory(data, '00000000000000000000000000000000');
if (!decryptor) throw new Error('不支持的加密方案或不是 joox 加密的文件。');

/** @type {Uint8Array[]} */
const decrypted = decryptor.decryptFile(data);
```

---

## English

A package to decrypt joox encrypted file.

Supported varient:

- `E!04` - encryption ver 4
