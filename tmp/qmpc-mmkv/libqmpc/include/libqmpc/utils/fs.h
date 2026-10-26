#pragma once

#include <stc/csview.h>
#include <stdio.h>

#if defined(_WIN32)
#include <windows.h>
#endif

FILE* fopen_u8_sv(csview path, const char* mode);
inline static FILE* fopen_u8(const char* path, const char* mode) { return fopen_u8_sv(csview_from(path), mode); }

#if defined(_WIN32)
HANDLE CreateFileU8_sv(csview path, DWORD desired_access, DWORD share_mode, LPSECURITY_ATTRIBUTES security_attributes,
                       DWORD creation_disposition, DWORD flags_and_attributes, HANDLE template_file);
inline static HANDLE CreateFileU8(const char* path, DWORD desired_access, DWORD share_mode,
                                  LPSECURITY_ATTRIBUTES security_attributes, DWORD creation_disposition,
                                  DWORD flags_and_attributes, HANDLE template_file) {
  return CreateFileU8_sv(csview_from(path), desired_access, share_mode, security_attributes, creation_disposition,
                         flags_and_attributes, template_file);
}
#endif
