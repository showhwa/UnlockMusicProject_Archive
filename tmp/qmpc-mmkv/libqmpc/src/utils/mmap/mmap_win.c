#include <libqmpc/utils/mmap.h>
#include <libqmpc/utils/fs.h>

#include <string.h>
#include <windows.h>

#include "libqmpc/log.h"

bool qmpc_mmap_init(qmpc_mmap_t* self, const char* path) {
  memset(self, 0, sizeof(*self));

  HANDLE file = CreateFileU8(path, GENERIC_READ, FILE_SHARE_READ, NULL, OPEN_EXISTING, FILE_ATTRIBUTE_NORMAL, NULL);
  if (file == INVALID_HANDLE_VALUE) {
    qmpc_log_error("qmpc_mmap_init: CreateFileA(%s) failed (error=%lu)", path, GetLastError());
    return false;
  }

  LARGE_INTEGER file_size = {};
  if (GetFileSizeEx(file, &file_size) == FALSE || file_size.QuadPart < 0) {
    qmpc_log_error("qmpc_mmap_init: GetFileSizeEx(%s) failed (error=%lu)", path, GetLastError());
    CloseHandle(file);
    return false;
  }

  HANDLE mapping = NULL;
  uint8_t* view = NULL;
  if (file_size.QuadPart > 0) {
    mapping = CreateFileMappingA(file, NULL, PAGE_READONLY, 0, 0, NULL);
    if (mapping == NULL) {
      qmpc_log_error("qmpc_mmap_init: CreateFileMappingA(%s) failed (error=%lu)", path, GetLastError());
      CloseHandle(file);
      return false;
    }
    view = (uint8_t*)MapViewOfFile(mapping, FILE_MAP_READ, 0, 0, 0);
    if (view == NULL) {
      qmpc_log_error("qmpc_mmap_init: MapViewOfFile(%s) failed (error=%lu)", path, GetLastError());
      CloseHandle(mapping);
      CloseHandle(file);
      return false;
    }
  }

  self->data = view;
  self->size = (size_t)file_size.QuadPart;
  self->writeable_ = false;
  self->os_file_ = file;
  self->os_mapping_ = mapping;
  qmpc_log_trace("qmpc_mmap_init: init ok (file=%s, size=%lu)", path, (unsigned long)self->size);
  return true;
}

bool qmpc_mmap_init_writable(qmpc_mmap_t* self, const char* path, size_t size) {
  memset(self, 0, sizeof(*self));

  HANDLE file = CreateFileU8(path, GENERIC_READ | GENERIC_WRITE, 0, NULL, CREATE_ALWAYS, FILE_ATTRIBUTE_NORMAL, NULL);
  if (file == INVALID_HANDLE_VALUE) {
    qmpc_log_error("qmpc_mmap_init_writable: CreateFileA(%s) failed (error=%lu)", path, GetLastError());
    return false;
  }

  HANDLE mapping = NULL;
  uint8_t* view = NULL;
  if (size > 0) {
    const DWORD size_high = (DWORD)((uint64_t)size >> 32);
    const DWORD size_low = (DWORD)(uint64_t)size;
    mapping = CreateFileMappingA(file, NULL, PAGE_READWRITE, size_high, size_low, NULL);
    if (mapping == NULL) {
      qmpc_log_error("qmpc_mmap_init_writable: MapViewOfFile(%s) failed (error=%lu)", path, GetLastError());
      CloseHandle(file);
      return false;
    }
    view = (uint8_t*)MapViewOfFile(mapping, FILE_MAP_WRITE, 0, 0, size);
    if (view == NULL) {
      qmpc_log_error("qmpc_mmap_init_writable: MapViewOfFile(%s) failed (error=%lu)", path, GetLastError());
      CloseHandle(mapping);
      CloseHandle(file);
      return false;
    }
  }

  self->data = view;
  self->size = size;
  self->writeable_ = true;
  self->os_file_ = file;
  self->os_mapping_ = mapping;
  qmpc_log_trace("qmpc_mmap_init_writable: init ok (file=%s, size=%lu)", path, (unsigned long)self->size);
  return true;
}

bool qmpc_mmap_flush(qmpc_mmap_t* self) {
  if (!self->writeable_ || self->data == NULL || self->size == 0) {
    return true;
  }

  if (FlushViewOfFile(self->data, self->size) == FALSE) {
    qmpc_log_error("qmpc_mmap_flush: FlushViewOfFile failed (error=%lu)", GetLastError());
    return false;
  }
  if (self->os_file_ != NULL && FlushFileBuffers(self->os_file_) == FALSE) {
    qmpc_log_error("qmpc_mmap_flush: FlushFileBuffers failed (error=%lu)", GetLastError());
    return false;
  }
  return true;
}

void qmpc_mmap_drop(qmpc_mmap_t* self) {
  (void)qmpc_mmap_flush(self);

  if (self->data != NULL) {
    UnmapViewOfFile(self->data);
  }
  if (self->os_mapping_ != NULL) {
    CloseHandle(self->os_mapping_);
  }
  if (self->os_file_ != NULL) {
    CloseHandle(self->os_file_);
  }
  memset(self, 0, sizeof(*self));
}
