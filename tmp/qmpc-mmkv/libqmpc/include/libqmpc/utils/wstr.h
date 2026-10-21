#pragma once

#include <wchar.h>
#include <windows.h>

#include <stc/csview.h>
#include "stc/cstr.h"

#define i_type vec_wstr, wchar_t
#include "stc/vec.h"

inline static vec_wstr qmpc_utf82wstr(csview s) {
  isize len = (isize)MultiByteToWideChar(CP_UTF8, 0, s.buf, s.size, NULL, 0);
  vec_wstr buf = vec_wstr_with_size(len + 1, 0);
  MultiByteToWideChar(CP_UTF8, 0, s.buf, s.size, vec_wstr_at_mut(&buf, 0), len);
  return buf;
}

/**
 * Convert a wide string to a UTF-8 `cstr`.
 * @param wstr The wide string to convert.
 * @param len The length of the wide string. Use -1 to automatically determine the length.
 * @return The UTF-8 stored in a `cstr`.
 */
inline static cstr qmpc_wstr2utf8(const wchar_t* wstr, isize len) {
  if (len < 0) len = (isize)wcslen(wstr);
  isize ansi_len = (isize)WideCharToMultiByte(CP_UTF8, 0, wstr, (int)len, NULL, 0, NULL, NULL);
  cstr buf = cstr_with_size(ansi_len, 0);
  WideCharToMultiByte(CP_UTF8, 0, wstr, (int)len, cstr_data(&buf), (int)ansi_len, NULL, NULL);
  return buf;
}
