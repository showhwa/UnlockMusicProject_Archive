#pragma once

#include <stc/cstr.h>
#include <stdint.h>
#include <stddef.h>

static inline void qmpc_hwid_to_hex_ex(cstr* out, const char* hex_chars, const void* data, isize_t len) {
  const uint8_t* p = (const uint8_t*)data;
  cstr_resize(out, len * 2, 0);
  uint8_t* out_p = (uint8_t*)cstr_data(out);
  for (isize_t i = 0; i < len; i++) {
    *out_p++ = hex_chars[p[i] >> 4];
    *out_p++ = hex_chars[p[i] & 0x0f];
  }
}

/**
 * Convert a binary data to a hex string in lowercase.
 *
 * @param[in] data The input data.
 * @param[in] len The length of the input data.
 * @return The hex string.
 */
static inline void qmpc_hwid_to_hex_lower(cstr* out, const void* data, isize_t len) {
  const char hex_chars[] = "0123456789abcdef";
  qmpc_hwid_to_hex_ex(out, hex_chars, data, len);
}

/**
 * Convert a binary data to a hex string in uppercase.
 *
 * @param[in] data The input data.
 * @param[in] len The length of the input data.
 * @return The hex string.
 */
static inline void qmpc_hwid_to_hex_upper(cstr* out, const void* data, isize_t len) {
  const char hex_chars[] = "0123456789ABCDEF";
  qmpc_hwid_to_hex_ex(out, hex_chars, data, len);
}
