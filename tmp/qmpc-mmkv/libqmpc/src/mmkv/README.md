# MMKV 读取（子集）

本目录只实现腾讯 [MMKV](https://github.com/Tencent/MMKV) 的只读子集，用来解开 QQ 音乐落盘的加密库。上游是完整的 mmap key-value 组件（[原理](https://github.com/Tencent/MMKV/wiki/design)，[说明](https://github.com/Tencent/MMKV/blob/master/README_CN.md)）：protobuf 序列化、追加写、空间重整、CRC、多进程。实现在 `libqmpc/src/mmkv/`。

## 本目录做的事

| 头文件     | 行为                                                                                                                                   |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `cipher.h` | 读同名 `.crc` 里的 CRC32、AES IV、`m_actualSize`；从数据文件第 4 字节起用 AES-128-CFB128（无填充）解密；对密文做滚动 CRC，供调用方核对 |
| `reader.h` | 4 KiB 缓冲的顺序读；protobuf 的 varint（`uint64`）和长度前缀字符串                                                                     |

`.crc` 只使用 [`MMKVMetaInfo`](https://github.com/Tencent/MMKV/blob/master/Core/MMKVMetaInfo.hpp) 前部的 `m_crcDigest`、`m_vector`、`m_actualSize`。`m_version`、`m_sequence`、已确认元数据和 `m_flags`（含 key 过期）不参与逻辑。

MMKV 以 [BSD 3-Clause](https://github.com/Tencent/MMKV/blob/master/LICENSE.TXT) 发布。本目录按上述行为重写，不包含上游源码。
