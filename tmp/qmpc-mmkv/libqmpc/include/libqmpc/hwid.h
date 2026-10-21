#pragma once

#include <libqmpc/export.h>

#include <stc/cstr.h>

/**
 * Get the current system ID (hash of network and disk).
 * This function implements the function 12.
 *
 * On non-Windows platforms this returns a placeholder string of hex zeros.
 *
 * @return The system ID. Return an empty string if fails.
 */
QMPC_API cstr qmpc_hwid_system_id(void);
