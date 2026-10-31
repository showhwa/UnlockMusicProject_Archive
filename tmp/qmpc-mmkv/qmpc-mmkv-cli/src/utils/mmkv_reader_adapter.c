#include "mmkv_reader_adapter.h"
#include "libqmpc/log.h"
#include "libqmpc/mmkv/reader.h"
#include "libqmpc/utils/common.h"

#include <stc/common.h>
#include <stc/cstr.h>

bool mmkv_reader_adapter_pipe__raw(mmkv_reader_adapter_t* self) {
  auto r = self->r_;
  if (r->expected_size_ < 4) {
    qmpc_log_error("Expected mmkv size is too small");
    return false;
  }

  // Write the "content size"
  uint32_t expected_size_le = qmpc_htole32(r->expected_size_ - 4);
  if (fwrite(&expected_size_le, 1, sizeof(expected_size_le), self->w_->fp) != sizeof(expected_size_le)) {
    qmpc_log_error("Failed to write expected mmkv size to output file");
    return false;
  }

  while (!r->eof_(r->ctx_)) {
    uint8_t buffer[4096];
    size_t read_len = r->read_(r->ctx_, buffer, sizeof(buffer));
    size_t write_len = fwrite(buffer, 1, read_len, self->w_->fp);
    if (write_len != read_len) {
      qmpc_log_error("Failed to write mmkv data to output file");
      return false;
    }
  }
  return true;
}

static inline void strip_whitespace_cstr(cstr* str) {
  // Strip all whitespace from the string
  char* buf = cstr_data(str);
  char* clean = buf;

  for (isize_t n = cstr_size(str); n != 0; n--) {
    if (isspace(*buf)) {
      buf++;
      continue;
    }
    *clean++ = *buf++;
  }
  *clean = '\0';
}

bool mmkv_reader_adapter_pipe__plaintext(mmkv_reader_adapter_t* self) {
  cstr key = cstr_with_capacity(32);
  cstr value = cstr_with_capacity(256);
  c_defer(cstr_drop(&key), cstr_drop(&value)) {
    uint64_t _unused;
    if (!qmpc_mmkv_reader__read_u64(&self->mmkv_reader_, &_unused, -1, NULL)) return false;

    while (!qmpc_mmkv_reader_eof(&self->mmkv_reader_)) {
      if (!qmpc_mmkv_reader_read_string(&self->mmkv_reader_, &key, -1, NULL)) return false;
      if (!qmpc_mmkv_reader_read_optional_string(&self->mmkv_reader_, &value)) return false;

      // Strip whitespace from key and value
      strip_whitespace_cstr(&key);
      strip_whitespace_cstr(&value);

      if (fprintf(self->w_->fp, "%s\n%s\n", cstr_str(&key), cstr_str(&value)) <= 0) return false;
    }
  }
  return true;
}

void mmkv_reader_adapter_drop(mmkv_reader_adapter_t* self) {
  switch (self->type_) {
    case MMKV_READER_ADAPTER_TYPE_RAW:
      break;
    case MMKV_READER_ADAPTER_TYPE_PLAINTEXT:
      qmpc_mmkv_reader_drop(&self->mmkv_reader_);
      break;
    default:
      break;
  }
  memset(self, 0, sizeof(*self));
}
