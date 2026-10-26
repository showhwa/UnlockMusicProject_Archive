#pragma once

#include <libqmpc/export.h>

#include <stc/cstr.h>
#include "stc/cstr.h"

/**
 * Convert a system ID to a MMKV name.
 * @param system_id The system ID to convert.
 * @return The MMKV name.
 */
QMPC_API void qmpc_mmkv_system_id_to_name(cstr* out, const char* system_id);

/**
 * Convert a system ID to a MMKV key.
 * @param system_id The system ID to convert.
 * @return The MMKV key.
 */
QMPC_API void qmpc_mmkv_system_id_to_key(cstr* out, const char* system_id);

/**
 * Get the QQMusic appdata directory.
 * Windows: `%APPDATA%\\Tencent\\QQMusic\\`
 * Other: `$HOME/.config/Tencent/QQMusic/`
 * @return The appdata directory, or empty on failure.
 */
QMPC_API cstr qmpc_get_appdata_dir(void);

/**
 * Get the default MMKV path for a given filename.
 * @param filename The filename to get the default path for.
 * @return The default MMKV path, or empty on failure.
 */
static inline cstr qmpc_get_appdata_file_path(const char* filename) {
  cstr path = qmpc_get_appdata_dir();
  cstr_append(&path, filename);
  return path;
}
