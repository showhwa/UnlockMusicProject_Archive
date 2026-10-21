#include <libqmpc/hwid.h>

#include "hwid/hex_helper.h"
#include "hwid_win/internal.h"
#include "hwid_win/net/internal.h"

#include <md5.h>
#include <stdint.h>
#include <stc/cstr.h>

cstr qmpc_hwid_disk(void) {
  for (int i = 0; i < 16; i++) {
    c_with(cstr hdd_id = qmpc_hwid_drive_id_as_admin(i), !cstr_is_empty(&hdd_id), cstr_drop(&hdd_id)) {
      return hdd_id;
    }
  }

  for (int i = 0; i < 16; i++) {
    c_with(cstr hdd_id = qmpc_hwid_drive_id_zero_rights(i), !cstr_is_empty(&hdd_id), cstr_drop(&hdd_id)) {
      return hdd_id;
    }
  }

  return cstr_init();
}

cstr qmpc_hwid_network(void) {
  cstr out = cstr_init();
  if (qmpc_hwid_net_ethernet(&out) && !cstr_is_empty(&out)) return out;
  if (qmpc_hwid_net_netbios(&out) && !cstr_is_empty(&out)) return out;
  cstr_clear(&out);
  return out;
}

cstr qmpc_hwid_system_id(void) {
  MD5Context ctx_md5 = {};

  md5Init(&ctx_md5);
  c_with(auto net_id = qmpc_hwid_network(), !cstr_is_empty(&net_id), cstr_drop(&net_id))
      md5Update(&ctx_md5, cstr_data(&net_id), cstr_size(&net_id));
  c_with(auto hdd_id = qmpc_hwid_disk(), !cstr_is_empty(&hdd_id), cstr_drop(&hdd_id))
      md5Update(&ctx_md5, cstr_data(&hdd_id), cstr_size(&hdd_id));
  md5Update(&ctx_md5, "\x5C\xBD\x98\x7C\x1C\x38\x17\x8E", 8);
  md5Finalize(&ctx_md5);

  // Byteswaps (UUID-style layout of the MD5 digest)
  uint32_t* w0 = (uint32_t*)&ctx_md5.digest[0];
  uint16_t* w1 = (uint16_t*)&ctx_md5.digest[4];
  uint16_t* w2 = (uint16_t*)&ctx_md5.digest[6];
  *w0 = __builtin_bswap32(*w0);
  *w1 = __builtin_bswap16(*w1);
  *w2 = __builtin_bswap16(*w2);

  cstr hwid_hex = cstr_init();
  qmpc_hwid_to_hex_upper(&hwid_hex, ctx_md5.digest, sizeof(ctx_md5.digest));
  return hwid_hex;
}
