#include <libqmpc/utils/wstr.h>
#include "utils/args_u8.h"

#include <windows.h>

vec_cstr qmpc_argv_u8([[maybe_unused]] int argc, [[maybe_unused]] char** argv) {
  int arg_count;
  LPWSTR* szArglist = CommandLineToArgvW(GetCommandLineW(), &arg_count);
  if (NULL == szArglist) {
    return vec_cstr_init();
  }

  vec_cstr argv_u8 = vec_cstr_with_capacity(arg_count);
  for (int i = 0; i < arg_count; i++) {
    vec_cstr_push(&argv_u8, qmpc_wstr2utf8(szArglist[i], -1));
  }
  LocalFree(szArglist);
  return argv_u8;
}
