#include <libqmpc/hwid.h>
#include <libqmpc/log.h>
#include <libqmpc/utils/common.h>

#include "hwid/hex_helper.h"
#include "hwid_win/internal.h"
#include "hwid_win/net/internal.h"

#include <md5.h>
#include <stdint.h>
#include <stc/cstr.h>

cstr qmpc_hwid_disk(void) {
  for (int i = 0; i < 16; i++) {
    c_with(cstr hdd_id = qmpc_hwid_drive_id_as_admin(i), !cstr_is_empty(&hdd_id), cstr_drop(&hdd_id)) { return hdd_id; }
  }

  for (int i = 0; i < 16; i++) {
    c_with(cstr hdd_id = qmpc_hwid_drive_id_zero_rights(i), !cstr_is_empty(&hdd_id), cstr_drop(&hdd_id)) {
      return hdd_id;
    }
  }

  qmpc_log_warning("No valid HDD id found.");

  return cstr_init();
}

cstr qmpc_hwid_network(void) {
  cstr out = cstr_init();
  if (qmpc_hwid_net_ethernet(&out) && !cstr_is_empty(&out)) {
    qmpc_log_verbose("Using Ethernet ID: %s", cstr_data(&out));
    return out;
  }
  if (qmpc_hwid_net_netbios(&out) && !cstr_is_empty(&out)) {
    qmpc_log_verbose("Using NetBIOS ID: %s", cstr_data(&out));
    return out;
  }
  cstr_clear(&out);
  qmpc_log_warning("No valid network id found.");
  return out;
}

#pragma pack(push, 1)
typedef struct {
  uint32_t data1;
  uint16_t data2;
  uint16_t data3;
  uint8_t data4[8];
} qmpc_hwid_digest_t;
#pragma pack(pop)

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
  qmpc_hwid_digest_t* digest = (qmpc_hwid_digest_t*)ctx_md5.digest;
  digest->data1 = qmpc_htobe32(digest->data1);
  digest->data2 = qmpc_htobe16(digest->data2);
  digest->data3 = qmpc_htobe16(digest->data3);

  cstr hwid_hex = cstr_init();
  qmpc_hwid_to_hex_upper(&hwid_hex, ctx_md5.digest, sizeof(ctx_md5.digest));
  return hwid_hex;
}
