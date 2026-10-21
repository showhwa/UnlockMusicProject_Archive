#include <libqmpc/hwid.h>

#include <stc/cstr.h>

cstr qmpc_hwid_system_id(void) {
  /* Placeholder: real HWID collection is Windows-only. */
  return cstr_from("00000000000000000000000000000000");
}
