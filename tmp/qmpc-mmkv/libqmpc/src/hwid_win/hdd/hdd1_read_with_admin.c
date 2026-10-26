// see: ReadPhysicalDriveInNTWithAdminRights

#include "hwid/hdd/hdd_helper.h"
#include "hwid_win/hdd/hdd_types.h"
#include "hwid_win/internal.h"
#include "libqmpc/log.h"

static bool is_atapi_device(const uint32_t device_map, const int drive_id) {
  return (device_map & (1 << (drive_id + 4))) != 0;
}

cstr qmpc_hwid_drive_id_as_admin(const int drive_id) {
  cstr hwid = cstr_init();
  c_with(cstr drive_path = cstr_from_fmt("\\\\.\\PhysicalDrive%d", drive_id), cstr_drop(&drive_path)) {
    qmpc_log_trace("qmpc_hwid_drive_id_as_admin: open drive %s", cstr_str(&drive_path));
    c_with(HANDLE fp = CreateFileA(cstr_str(&drive_path), GENERIC_READ | GENERIC_WRITE,
                                   FILE_SHARE_READ | FILE_SHARE_WRITE, nullptr, OPEN_EXISTING, 0, NULL),
           fp != INVALID_HANDLE_VALUE, CloseHandle(fp)) {
      GETVERSIONINPARAMS version_params = {};
      DWORD cbBytesReturned = 0;
      if (!DeviceIoControl(fp, SMART_GET_VERSION, nullptr, 0, &version_params, sizeof(version_params), &cbBytesReturned,
                           nullptr))
        continue;
      const bool is_atapi = is_atapi_device(version_params.bIDEDeviceMap, drive_id);
      SENDCMDINPARAMS scip = {
          .cBufferSize = IDENTIFY_BUFFER_SIZE,
          .irDriveRegs =
              {
                  .bFeaturesReg = 0,
                  .bSectorCountReg = 1,
                  .bCylLowReg = 0,
                  .bCylHighReg = 0,
                  .bDriveHeadReg = 0xA0 | ((drive_id & 1) << 4),
                  .bCommandReg = is_atapi ? QMPC_IDE_ATAPI_IDENTIFY : QMPC_IDE_ATA_IDENTIFY,
              },
      };
      SENDCMDOUT_Identify scop = {};
      if (!DeviceIoControl(fp, SMART_RCV_DRIVE_DATA, &scip, sizeof(scip), &scop, sizeof(scop), &cbBytesReturned,
                           nullptr))
        continue;
      if (scop.cBufferSize <= 46) continue;

      const char* buffer = (const char*)scop.bBuffer;
      c_with(cstr serial_number = qmpc_cstr_from_identify(buffer, 10, 19), cstr_drop(&serial_number))
          cstr_append_s(&hwid, serial_number);
      c_with(cstr model_number = qmpc_cstr_from_identify(buffer, 27, 46), cstr_drop(&model_number))
          cstr_append_s(&hwid, model_number);
      c_with(cstr revision_number = qmpc_cstr_from_identify(buffer, 23, 26), cstr_drop(&revision_number))
          cstr_append_s(&hwid, revision_number);

      qmpc_log_debug("hwid(%s): %s", cstr_str(&drive_path), cstr_str(&hwid));
    }
  }
  return hwid;
}
