#pragma once

#include "libqmpc/log.h"
#include "libqmpc/utils/str.h"

#include <stc/cstr.h>

typedef struct {
  cstr mmkv_path;
  cstr mmkv_key;
} qmpc_cf12_t;

typedef enum {
  QMPC_MMKV_KEY_METHOD_HWID = 1,
  QMPC_MMKV_KEY_METHOD_RPC,
} qmpc_mmkv_key_method_t;

inline static qmpc_mmkv_key_method_t qmpc_mmkv_key_method_from_str(const char* str) {
  if (qmpc_str_ieq(str, "hwid")) return QMPC_MMKV_KEY_METHOD_HWID;
  if (qmpc_str_ieq(str, "rpc")) return QMPC_MMKV_KEY_METHOD_RPC;
  return (qmpc_mmkv_key_method_t)0;  // invalid
}

void qmpc_cf12_init(qmpc_cf12_t* self);
void qmpc_cf12_drop(qmpc_cf12_t* self);

bool qmpc_cf12_get_via_hwid(qmpc_cf12_t* self);
bool qmpc_cf12_get_via_rpc(qmpc_cf12_t* self);

static inline bool qmpc_cf12_get(qmpc_cf12_t* self, qmpc_mmkv_key_method_t method) {
  switch (method) {
    case QMPC_MMKV_KEY_METHOD_HWID:
      return qmpc_cf12_get_via_hwid(self);
    case QMPC_MMKV_KEY_METHOD_RPC:
      return qmpc_cf12_get_via_rpc(self);
  }
  qmpc_log_warning("qmpc_cf12_get: invalid method: %d", method);
  return false;
}
