#pragma once

#include <windows.h>

#include <ntdddisk.h>
#include <ntddstor.h>

#define QMPC_IDE_ATAPI_IDENTIFY (0xA1)
#define QMPC_IDE_ATA_IDENTIFY (0xEC)

#pragma pack(push, 1)
typedef struct {
  ULONG cBufferSize;
  DRIVERSTATUS DriverStatus;
  UCHAR bBuffer[IDENTIFY_BUFFER_SIZE];
} SENDCMDOUT_Identify;

typedef struct {
  STORAGE_DEVICE_DESCRIPTOR hdr;
  char data[0x800 - sizeof(STORAGE_DEVICE_DESCRIPTOR)];
} DriveInfoData;
#pragma pack(pop)