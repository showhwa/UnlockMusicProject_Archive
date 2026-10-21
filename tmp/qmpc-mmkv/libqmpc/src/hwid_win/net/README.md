# 网络设备 ID（出处）

Windows 网卡 / MAC 相关硬件标识，来自对 **QQ 音乐 Windows 客户端** 的逆向，用于与客户端网络信息逻辑对齐。无公开上游源码。

| 本仓库 | 角色 |
|--------|------|
| `ethernet_id.c` | 首个以太网或无线网卡 MAC |
| `netbios_id.c` | NetBIOS 工作站传输枚举（`NetWkstaTransportEnum`） |

## 授权

原始逻辑归属 QQ 音乐客户端；上游许可证与出处不明。本目录为实现对齐而保留的重写代码。
