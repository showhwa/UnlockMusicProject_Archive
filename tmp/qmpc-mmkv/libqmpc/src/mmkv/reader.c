#include "libqmpc/mmkv/reader.h"
#include "libqmpc/utils/common.h"

bool qmpc_mmkv_reader_init(qmpc_mmkv_reader_t* self, qmpc_mmkv_reader_source_t* file) {
  memset(self, 0, sizeof(*self));
  self->file_ = file;
  return true;
}

// Optimized for small buffer reads
size_t qmpc_mmkv_reader__read(qmpc_mmkv_reader_t* self, uint8_t* out, size_t len) {
  size_t total_read = 0;

  while (len && !qmpc_mmkv_reader_eof(self)) {
    // Lazy read: read in next page if needed.
    if (self->page_offset_ == self->page_len_) {
      self->page_offset_ = 0;
      self->page_len_ = self->file_->read_(self->file_->ctx_, self->page_, sizeof(self->page_));

      // No more data => exit early.
      if (self->page_len_ == 0) break;
    }

    size_t copy_len = QMPC_MIN(len, self->page_len_ - self->page_offset_);
    if (copy_len) {
      if (out) {
        memcpy(out, self->page_ + self->page_offset_, copy_len);
      }
      self->page_offset_ += copy_len;
      len -= copy_len;
      total_read += copy_len;
    }
  }

  return total_read;
}

bool qmpc_mmkv_reader__read_u64(qmpc_mmkv_reader_t* self, uint64_t* out, isize container_len, isize* bytes_read) {
  const bool unrestricted_read = container_len < 0;
  bool completed = false;
  uint64_t result = 0;
  uint32_t shift = 0;
  isize count = 0;

  while (unrestricted_read || container_len) {
    uint8_t next_byte;
    if (qmpc_mmkv_reader__read(self, &next_byte, 1) != 1) {
      if (bytes_read) *bytes_read = count;
      return false;
    }

    ++count;
    if (!unrestricted_read) container_len--;
    result |= (next_byte & 0x7F) << shift;
    shift += 7;

    // When high bit is 0, we've completed the read.
    if ((next_byte & 0x80) == 0) {
      completed = true;
      break;
    }
  }

  if (bytes_read) *bytes_read = count;
  *out = result;
  return completed;
}

bool qmpc_mmkv_reader_read_string(qmpc_mmkv_reader_t* self, cstr* out, isize max_len, isize* bytes_read) {
  const bool unrestricted_read = max_len < 0;
  uint64_t str_len, read_len;
  isize u64_bytes_read = 0;
  if (!qmpc_mmkv_reader__read_u64(self, &str_len, max_len, &u64_bytes_read)) return false;

  if (unrestricted_read) {
    read_len = str_len;
  } else {
    read_len = QMPC_MIN(str_len, (uint64_t)max_len - u64_bytes_read);
  }
  if (bytes_read) *bytes_read = u64_bytes_read + (isize)read_len;

  cstr_resize(out, read_len, '\0');
  if (qmpc_mmkv_reader__read(self, (uint8_t*)cstr_data(out), read_len) != read_len) {
    cstr_clear(out);
    return false;
  }

  return true;
}

bool qmpc_mmkv_reader_read_optional_string(qmpc_mmkv_reader_t* self, cstr* out) {
  uint64_t container_len;
  if (!qmpc_mmkv_reader__read_u64(self, &container_len, -1, NULL)) return false;
  if (container_len == 0) {
    cstr_clear(out);
    return true;
  }

  isize bytes_read = 0;
  if (!qmpc_mmkv_reader_read_string(self, out, container_len, &bytes_read)) return false;

  // Seek until the end of the string.
  auto seek = container_len - bytes_read;
  return seek == 0 || qmpc_mmkv_reader__seek(self, seek) == seek;
}
