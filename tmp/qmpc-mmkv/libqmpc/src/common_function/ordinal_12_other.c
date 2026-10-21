#include <libqmpc/common_function/ordinal_12.h>

#include <stdlib.h>
#include <stc/cstr.h>

cstr qmpc_get_appdata_dir(void) {
  const char* home = getenv("HOME");
  if (home == NULL || home[0] == '\0') {
    return cstr_init();
  }

  cstr appdata_dir = cstr_from(home);
  cstr_append(&appdata_dir, "/.config/Tencent/QQMusic/");
  return appdata_dir;
}
