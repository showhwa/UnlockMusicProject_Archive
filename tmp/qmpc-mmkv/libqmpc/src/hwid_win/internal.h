#pragma once

#include <stc/cstr.h>

/** Internal: disk serial/model fingerprint used by system ID. */
cstr qmpc_hwid_disk(void);

/** Internal: network interface fingerprint used by system ID. */
cstr qmpc_hwid_network(void);

cstr qmpc_hwid_drive_id_as_admin(int drive_id);
cstr qmpc_hwid_drive_id_zero_rights(int drive_id);
