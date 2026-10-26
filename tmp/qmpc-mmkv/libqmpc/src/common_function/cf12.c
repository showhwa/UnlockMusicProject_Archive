#include "libqmpc/common_function/cf12.h"
#include "libqmpc/common_function/qmpc_fn12.h"
#include "libqmpc/common_function/ordinal_12.h"
#include "libqmpc/log.h"
#include "libqmpc/hwid.h"

void qmpc_cf12_init(qmpc_cf12_t* result) {
  result->mmkv_path = cstr_init();
  result->mmkv_key = cstr_init();
}

void qmpc_cf12_drop(qmpc_cf12_t* result) {
  cstr_drop(&result->mmkv_path);
  cstr_drop(&result->mmkv_key);
}

bool qmpc_cf12_get_via_hwid(qmpc_cf12_t* self) {
  qmpc_log_trace("qmpc_cf12_via_hwid: start");
  c_with(cstr system_id = qmpc_hwid_system_id(), cstr_drop(&system_id)) {
    c_with(cstr name = cstr_init(), cstr_drop(&name)) {
      qmpc_mmkv_system_id_to_name(&name, cstr_str(&system_id));

      cstr_drop(&self->mmkv_path);
      self->mmkv_path = qmpc_get_appdata_file_path(cstr_str(&name));
    }
    qmpc_mmkv_system_id_to_key(&self->mmkv_key, cstr_str(&system_id));
  }
  qmpc_log_verbose("     path: %s", cstr_str(&self->mmkv_path));
  qmpc_log_verbose("      key: %s", cstr_str(&self->mmkv_key));
  return true;
}

bool qmpc_cf12_get_via_rpc(qmpc_cf12_t* self) {
  qmpc_log_trace("qmpc_cf12_via_rpc: start");

  bool ok = false;
  qmpc_fn12_t fn12 = {};
  char mmkv_name[QMPC_FN12_MMKV_NAME_BUFF_LEN] = {};
  char mmkv_key[QMPC_FN12_MMKV_KEY_BUF_LEN] = {};

  c_defer(qmpc_fn12_drop(&fn12)) {
    if (!qmpc_fn12_init(&fn12)) {
      qmpc_log_error("rpc init failed.");
      continue;
    }
    qmpc_log_trace("rpc init ok");

    if (!qmpc_fn12_call(&fn12, mmkv_name, mmkv_key)) {
      qmpc_log_error("rpc call failed.");
      continue;
    }
    qmpc_log_trace("rpc call ok");

    cstr_drop(&self->mmkv_path);
    self->mmkv_path = qmpc_get_appdata_file_path(mmkv_name);

    cstr_assign(&self->mmkv_key, mmkv_key);
    ok = true;
  }
  qmpc_log_trace("qmpc_cf12_via_rpc end: ok=%d", ok);
  return ok;
}
