#include <string.h>

#include <libqmpc/common_function/qmpc_fn12.h>

bool qmpc_fn12_init([[maybe_unused]] qmpc_fn12_t* self) { return false; }
void qmpc_fn12_drop(qmpc_fn12_t* self) { memset(self, 0, sizeof(*self)); }
bool qmpc_fn12_call([[maybe_unused]] qmpc_fn12_t* self, char* mmkv_name, char* mmkv_key) {
  memset(mmkv_name, 0, QMPC_FN12_MMKV_NAME_BUFF_LEN);
  memset(mmkv_key, 0, QMPC_FN12_MMKV_KEY_BUF_LEN);
  return false;
}
