#include "../commands.h"

#include <libqmpc/hwid.h>
#include <libqmpc/common_function/ordinal_12.h>

#include <stc/cstr.h>

int qmpc_command_system_id([[maybe_unused]] const qmpc_command_args* args) {
  auto system_id = qmpc_hwid_system_id();
  auto name = qmpc_mmkv_system_id_to_name(cstr_data(&system_id));
  auto key = qmpc_mmkv_system_id_to_key(cstr_data(&system_id));
  auto appdata_dir = qmpc_get_appdata_dir();

  printf("---- QMPC Cli [System ID] ----\n");
  printf("system-id: %s\n", cstr_data(&system_id));
  printf("     name: %s\n", cstr_data(&name));
  printf("      key: %s\n", cstr_data(&key));
  printf(" data-dir: %s\n", cstr_data(&appdata_dir));

  cstr_drop(&system_id);
  cstr_drop(&name);
  cstr_drop(&key);
  cstr_drop(&appdata_dir);

  return 0;
}
