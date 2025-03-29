# um_crypto

加解密算法实现 (Rust)。

## 项目结构

```text
lib_um_crypto_rust
├── um_cli          用于调试的 CLI 方案。
├── um_crypto/*     子目录存放具体算法的代码。
├── um_wasm         将 um_crypto 包装为能从 JavaScript 层调用的代码。
└── um_wasm_loader  打包 `um_wasm` 到 npm 包的代码。
```

## 授权协议

Apache License 2.0 + MIT 双协议
