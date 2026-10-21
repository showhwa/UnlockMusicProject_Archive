# HDD 硬件 ID（出处）

Windows 物理硬盘序列号等，对齐 QQ 音乐硬盘信息组件。算法参考 WinSim Inc. **DiskId32**（Lynn McGuire 等），已重写为 C。

| 本仓库                      | DiskId32 对应函数                      |
| --------------------------- | -------------------------------------- |
| `hdd1_read_with_admin.c`    | `ReadPhysicalDriveInNTWithAdminRights` |
| `hdd3_read_without_admin.c` | `ReadPhysicalDriveInNTWithZeroRights`  |

## 来源

- 原址：<https://www.winsim.com/diskid32/diskid32.cpp>
- 项目页：<https://www.winsim.com/diskid32/diskid32.html>
- 缓存：<https://web.archive.org/web/2013/https://www.winsim.com/diskid32/diskid32.cpp>

## 授权

DiskId32 以 freeware 发布，声明 **NOT warranteed nor supported**。源码无 SPDX/OSI 许可证；站点页脚为 WinSim Inc. 版权。本目录仅作算法参考后的 C 重写。
