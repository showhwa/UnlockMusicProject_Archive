# 华为音乐密钥 dump & 解密脚本

请善用大语言模型以及搜索引擎。

## 初始化

- 安卓端
  - 有线连接到电脑，并激活 `adb` 连接
  - 安装 `frida-server` 到安卓设备
  - 以 `root` 启动 `frida-server`
- 电脑端
  - 安装 Python
  - 设置 VirtualEnv 并激活
  - 安装依赖 `pip install -r requirements.txt`
  - 运行对应脚本

## 获取密钥

获取音频文件密钥并导出到 `csv` 档案。

```sh
python dump_keys.py
```

## 解密音频

使用 `adb` 或其它方法将文件拷贝到电脑，然后：

```sh
python decrypt.py -i "输入文件路径" -o "输出文件路径" -k "密钥" -I "iv"
```

其中：

- `-i`: 输入文件路径
- `-o`: 输出文件路径
- `-k`: AES 解密密钥，对应 CSV 中 `key` 列的值
- `-I`: AES 解密 IV，对应 CSV 中 `iv` 列的值

## 常见问题

- 问：为什么不自动化
  - 答：建议根据自己的使用场景手动适配。
- 问：为什么需要 `root` 权限 / `frida`
  - 答：因为密钥存储在 [Android Keystore](https://developer.android.com/privacy-and-security/keystore#ExtractionPrevention) 中，无法直接获取。需要借助 `frida` 假装应用程序请求系统解密数据。

## License

MIT License
