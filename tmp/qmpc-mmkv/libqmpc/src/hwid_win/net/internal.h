#pragma once

#include <stc/cstr.h>

/**
 * Get the first valid MAC address of the system, using Ethernet API.
 * Order: PCI Ethernet (0) > Wireless (1) > other Ethernet, e.g. USB (2) > unknown/other (3); lower rank wins.
 * Only adapters with Type == MIB_IF_TYPE_ETHERNET can replace the first adapter.
 *
 * @param[out] out The output parameter.
 *                  The output string will be cleared if the function fails.
 * @return True if successful, false otherwise.
 */
bool qmpc_hwid_net_ethernet(cstr* out);

/**
 * Get the first valid MAC address of the system, using NetBIOS API.
 *
 * @param[out] out The output parameter.
 *                  The output string will be cleared if the function fails.
 * @return True if successful, false otherwise.
 */
bool qmpc_hwid_net_netbios(cstr* out);
