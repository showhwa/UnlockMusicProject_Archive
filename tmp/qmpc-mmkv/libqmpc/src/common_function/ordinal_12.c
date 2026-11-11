#include <libqmpc/common_function/ordinal_12.h>

#include <ctype.h>
#include <string.h>
#include <stc/cstr.h>

void qmpc_mmkv_system_id_to_name(cstr* out, const char* system_id) {
  cstr_clear(out);
  if (system_id == NULL) return;

  size_t len = strlen(system_id);
  if (len < 17) return;

  static const char* g_prefixes[] = {"Driver", "Sumary", "tencent", "dllmain", "Mution", "Check", "Desktop"};
  static const char* g_exts[] = {".dat", ".db", ".bak", ".data", ".cah"};

  const char* prefix = g_prefixes[(unsigned char)system_id[3] % 7];
  const char* ext = g_exts[(unsigned char)system_id[16] % 5];

  char suffix[5] = {};
  for (int i = 0, j = 0; i < 32 && system_id[i] != '\0' && j < 4; i++) {
    const unsigned char c = (unsigned char)system_id[i];
    // Make it lower and insert, ignore digits.
    if (c > '9') suffix[j++] = (char)tolower(c);
  }

  cstr_assign(out, prefix);
  cstr_append(out, suffix);
  cstr_append(out, ext);
}

void qmpc_mmkv_system_id_to_key(cstr* out, const char* system_id) {
  if (system_id == NULL) {
    cstr_clear(out);
    return;
  }
  // take first 16 characters
  cstr_assign_n(out, system_id, 16);
}
