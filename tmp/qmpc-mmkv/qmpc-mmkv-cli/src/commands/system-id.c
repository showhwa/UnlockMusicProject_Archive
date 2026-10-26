#include "src/commands.h"

#include <libqmpc/common_function/cf12.h>
#include <libqmpc/common_function/ordinal_12.h>
#include <libqmpc/log.h>

#include <stc/cstr.h>

#define FMT_QUOTED_TEXT "\"%s\""

static inline void qmpc_print_key_info(qmpc_mmkv_key_method_t method, const char* name) {
  c_with(qmpc_cf12_t cf12 = {}, qmpc_cf12_drop(&cf12)) {
    qmpc_cf12_init(&cf12);
    qmpc_log_info("[Key info via %s]", name);
    if (qmpc_cf12_get(&cf12, method)) {
      qmpc_log_trace("CF12 init ok");
      qmpc_log_info("path = " FMT_QUOTED_TEXT, cstr_str(&cf12.mmkv_path));
      qmpc_log_info("key = " FMT_QUOTED_TEXT, cstr_str(&cf12.mmkv_key));
    } else {
      qmpc_log_error("CF12 get failed.");
    }  // if(qmpc_cf12_get())
  }  // c_with(cf12)
}

int qmpc_command_system_id([[maybe_unused]] const qmpc_command_args* args) {
  qmpc_log_info("[System Property]");
  c_with(cstr appdata_dir = qmpc_get_appdata_dir(), cstr_drop(&appdata_dir)) {
    qmpc_log_info("data-dir = " FMT_QUOTED_TEXT, cstr_data(&appdata_dir));
  }

  qmpc_print_key_info(QMPC_MMKV_KEY_METHOD_HWID, "HWID");
  qmpc_print_key_info(QMPC_MMKV_KEY_METHOD_RPC, "RPC");

  return 0;
}
