// see: ReadPhysicalDriveInNTWithZeroRights

#include "hwid/hdd/hdd_helper.h"
#include "hwid_win/hdd/hdd_types.h"
#include "hwid_win/internal.h"

#include <ctype.h>

static HANDLE open_device(const int drive_id) {
  HANDLE fp;
  c_with(cstr drive_path = cstr_from_fmt("\\\\.\\PhysicalDrive%d", drive_id), cstr_drop(&drive_path)) {
    fp = CreateFileA(cstr_str(&drive_path), 0, FILE_SHARE_READ | FILE_SHARE_WRITE, nullptr, OPEN_EXISTING, 0, NULL);
  }
  return fp;
}

/**
 * Check if the serial number is valid.
 * @param serial The serial number to check.
 */
static bool is_valid_serial(const char* serial) {
  return c_strlen(serial) >= 20 && isalnum(serial[0]) && isalnum(serial[19]);
}

cstr qmpc_hwid_drive_id_zero_rights(const int drive_id) {
  DriveInfoData props = {};
  cstr hwid = cstr_init();
  c_with(HANDLE fp = open_device(drive_id), fp != INVALID_HANDLE_VALUE, CloseHandle(fp)) {
    DWORD bytes_written = 0;
    STORAGE_PROPERTY_QUERY query = {
        .PropertyId = StorageDeviceProperty,
        .QueryType = PropertyStandardQuery,
    };
    if (DeviceIoControl(fp, IOCTL_STORAGE_QUERY_PROPERTY, &query, sizeof(query), &props, sizeof(props), &bytes_written,
                        nullptr)) {
#define WITH_PROP(name, flip) \
  c_with(auto name = qmpc_flip_and_code_bytes((const char*)&props, props.hdr.name##Offset, flip), cstr_drop(&name))
      WITH_PROP(ProductId, false)
      WITH_PROP(ProductRevision, false)
      WITH_PROP(SerialNumber, true) {
        cstr_clear(&hwid);
        if (is_valid_serial(cstr_str(&SerialNumber))) {
          cstr_append_s(&hwid, SerialNumber);
          cstr_append_s(&hwid, ProductId);
          cstr_append_s(&hwid, ProductRevision);
        }
      }  // with prop
#undef WITH_PROP
    }  // with io control
  }  // with open device
  return hwid;
}
