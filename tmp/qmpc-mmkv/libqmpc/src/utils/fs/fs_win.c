#include "libqmpc/utils/fs.h"
#include "libqmpc/utils/wstr.h"

#include <stc/cstr.h>

FILE* fopen_u8_sv(csview path, const char* mode) {
  FILE* fp;

  c_with(vec_wstr p = qmpc_utf82wstr(path), vec_wstr_drop(&p)) {
    c_with(vec_wstr m = qmpc_utf82wstr(csview_from(mode)), vec_wstr_drop(&m)) {
      fp = _wfopen(vec_wstr_at(&p, 0), vec_wstr_at(&m, 0));
    }
  }

  return fp;
}

HANDLE CreateFileU8_sv(csview path, DWORD desired_access, DWORD share_mode, LPSECURITY_ATTRIBUTES security_attributes,
                       DWORD creation_disposition, DWORD flags_and_attributes, HANDLE template_file) {
  HANDLE h;
  c_with(vec_wstr p = qmpc_utf82wstr(path), vec_wstr_drop(&p)) {
    h = CreateFileW(vec_wstr_at(&p, 0), desired_access, share_mode, security_attributes, creation_disposition,
                    flags_and_attributes, template_file);
  }
  return h;
}
