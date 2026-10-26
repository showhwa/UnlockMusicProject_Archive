#include "libqmpc/utils/fs.h"

#include <stc/cstr.h>

FILE* fopen_u8_sv(csview path, const char* mode) {
  FILE* fp;
  c_with(cstr p = cstr_from_sv(path), cstr_drop(&p)) fp = fopen(cstr_str(&p), mode);
  return fp;
}
