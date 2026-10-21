#pragma once

#include <stc/cstr.h>
#include "stc/cstr.h"

/**
 * Get the first valid MAC address of the system, using Ethernet API.
 * Order: Ethernet(PCI) > Non-Wireless > USB Ethernet > WiFi
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
