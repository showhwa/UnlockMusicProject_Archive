#include <libqmpc/common_function/ordinal_12.h>
#include <libqmpc/utils/wstr.h>

#include <shlobj.h>
#include <windows.h>

cstr qmpc_get_appdata_dir(void) {
  wchar_t szAppData[MAX_PATH + 1] = {};
  if (FAILED(SHGetFolderPathW(nullptr, CSIDL_APPDATA, nullptr, SHGFP_TYPE_CURRENT, szAppData))) {
    return cstr_init();
  }

  cstr appdata_dir = qmpc_wstr2utf8(szAppData, -1);
  cstr_append(&appdata_dir, "\\Tencent\\QQMusic\\");
  return appdata_dir;
}
