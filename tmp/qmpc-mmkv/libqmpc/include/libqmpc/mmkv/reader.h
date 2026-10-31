#pragma once

#include "libqmpc/export.h"

#include <stc/cstr.h>

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

typedef size_t (*qmpc_mmkv_reader_fn_read_t)(void* ctx, uint8_t* buffer, size_t len);
typedef bool (*qmpc_mmkv_reader_fn_eof_t)(void* ctx);

typedef struct {
  void* ctx_;
  uint32_t expected_size_;
  qmpc_mmkv_reader_fn_read_t read_;
  qmpc_mmkv_reader_fn_eof_t eof_;
} qmpc_mmkv_reader_source_t;

typedef struct {
  qmpc_mmkv_reader_source_t* file_;
  size_t page_offset_;
  size_t page_len_;
  uint8_t page_[4096];
} qmpc_mmkv_reader_t;

/**
 * Initializes a reader.
 * @param self The reader.
 * @param file The file to read from.
 * @return True on success, false on failure.
 */
QMPC_API bool qmpc_mmkv_reader_init(qmpc_mmkv_reader_t* self, qmpc_mmkv_reader_source_t* file);
/**
 * Checks if the reader is at the end of the file.
 * @param self The reader.
 * @return True if the reader is at the end of the file, false otherwise.
 */
static inline bool qmpc_mmkv_reader_eof(qmpc_mmkv_reader_t* self) {
  return self->page_len_ == self->page_offset_ && self->file_->eof_(self->file_->ctx_);
}
/**
 * Drops the reader.
 * @param self The reader.
 */
static inline void qmpc_mmkv_reader_drop(qmpc_mmkv_reader_t* self) {
  if (self) {
    memset(self, 0, sizeof(*self));
  }
}

/**
 * Reads a string from the reader.
 * @param self The reader.
 * @param[out] out The output buffer.
 * @param max_len The maximum length of the string (container length) to read. -1 means unrestricted read.
 * @param[out] bytes_read The number of bytes read. Ignored if NULL.
 * @return True on success, false on failure.
 */
bool qmpc_mmkv_reader_read_string(qmpc_mmkv_reader_t* self, cstr* out, isize_t max_len, isize_t* bytes_read);
/**
 * Reads an optional string from the reader.
 * @param self The reader.
 * @param[out] out The output buffer, can be empty string if the string is not present.
 * @return True on success, false on failure.
 */
bool qmpc_mmkv_reader_read_optional_string(qmpc_mmkv_reader_t* self, cstr* out);
/**
 * Reads a 64-bit unsigned integer from the reader.
 * @param self The reader.
 * @param[out] out The output buffer.
 * @param max_len The maximum length of the integer to read. -1 means unrestricted read.
 * @param[out] bytes_read The number of bytes read. Ignored if NULL.
 * @return True on success, false on failure.
 */
bool qmpc_mmkv_reader__read_u64(qmpc_mmkv_reader_t* self, uint64_t* out, isize_t max_len, isize_t* bytes_read);
/**
 * Reads data from the reader.
 * @param self The reader.
 * @param[out] out The output buffer. Optional to just seek.
 * @param len The number of bytes to read.
 * @return The number of bytes read.
 * @private
 */
size_t qmpc_mmkv_reader__read(qmpc_mmkv_reader_t* self, uint8_t* out, size_t len);
/**
 * Advances the reader by @p len bytes without copying them out.
 * Reuses the internal page buffer; does not allocate.
 * @param self The reader.
 * @param len The number of bytes to skip.
 * @return The number of bytes skipped.
 * @private
 */
static inline size_t qmpc_mmkv_reader__seek(qmpc_mmkv_reader_t* self, size_t len) {
  return qmpc_mmkv_reader__read(self, NULL, len);
}
