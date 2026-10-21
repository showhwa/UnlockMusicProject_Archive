#include <libqmpc/common_function/ordinal_12.h>

#include <stc/cstr.h>

cstr qmpc_mmkv_system_id_to_name(const char* system_id) {
  static const char* g_prefixes[] = {"Driver", "Sumary", "tencent", "dllmain", "Mution", "Check", "Desktop"};
  static const char* g_exts[] = {".dat", ".db", ".bak", ".data", ".cah"};

  const char* prefix = g_prefixes[system_id[3] % 7];
  const char* ext = g_exts[system_id[16] % 5];

  char suffix[5] = {};
  for (int i = 0, j = 0; i < 32 && j < 4; i++) {
    const char c = system_id[i];
    // Make it lower and insert, ignore digits.
    if (c > '9') suffix[j++] = c - 'A' + 'a';
  }

  cstr mmkv_name = cstr_with_capacity(16);
  cstr_append(&mmkv_name, prefix);
  cstr_append(&mmkv_name, suffix);
  cstr_append(&mmkv_name, ext);
  return mmkv_name;
}

cstr qmpc_mmkv_system_id_to_key(const char* system_id) {
  // take first 16 characters
  return cstr_with_n(system_id, 16);
}
