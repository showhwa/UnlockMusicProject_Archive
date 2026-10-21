#pragma once

#include <libqmpc/export.h>

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

/**
 * Memory mapping of a file (read-only or writable).
 */
typedef struct {
  uint8_t* data;
  size_t size;
  bool writeable_;
#ifdef _WIN32
  void* os_file_;    /* HANDLE */
  void* os_mapping_; /* HANDLE */
#else
  int os_file_; /* fd; -1 if none */
#endif
} qmpc_mmap_t;

/**
 * Map `path` read-only into `self`.
 * @return true on success; on failure `self` is left dropped/zeroed.
 */
QMPC_API bool qmpc_mmap_init(qmpc_mmap_t* self, const char* path);

/**
 * Create/truncate `path` and map it writable (shared) for `size` bytes.
 * @return true on success; on failure `self` is left dropped/zeroed.
 */
QMPC_API bool qmpc_mmap_init_writable(qmpc_mmap_t* self, const char* path, size_t size);

/**
 * Sync dirty pages of a writable map back to the file.
 * No-op (and succeeds) for a read-only or empty map.
 * @return true on success.
 */
QMPC_API bool qmpc_mmap_flush(qmpc_mmap_t* self);

/** Flush (if writable), then unmap and release OS resources. Safe on zeroed/dropped. */
QMPC_API void qmpc_mmap_drop(qmpc_mmap_t* self);
