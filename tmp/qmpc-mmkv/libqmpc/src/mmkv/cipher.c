#include "libqmpc/mmkv/cipher.h"
#include "libqmpc/crypto/aes_cfb_128.h"
#include "libqmpc/crypto/crc32.h"
#include "libqmpc/log.h"
#include "libqmpc/utils/common.h"
#include "libqmpc/utils/fs.h"
#include "libqmpc/utils/mmap.h"

#include <stc/cstr.h>
#include <string.h>

static inline bool load_mmkv_metadata(qmpc_mmkv_crc_hdr_t* hdr, csview file_path) {
  bool ok = false;
  c_with(cstr metadata_path = cstr_from_sv(file_path), cstr_drop(&metadata_path)) {
    cstr_append_n(&metadata_path, ".crc", 4);
    c_with(FILE* fp = fopen_u8_sv(cstr_sv(&metadata_path), "rb"), fclose(fp)) {
      if (fp != NULL) {
        ok = fread(hdr, sizeof(*hdr), 1, fp) == 1;
        if (!ok) {
          qmpc_log_verbose("load_mmkv_metadata: fread(%s) failed", cstr_str(&metadata_path));
        }
      } else {
        qmpc_log_verbose("load_mmkv_metadata: fopen(%s) failed", cstr_str(&metadata_path));
      }
    }
  }
  return ok;
}

bool qmpc_mmkv_cipher_reader_init_from_path(qmpc_mmkv_cipher_reader_t* self, csview file_path, csview key) {
  memset(self, 0, sizeof(*self));

  qmpc_mmkv_crc_hdr_t hdr;
  if (!load_mmkv_metadata(&hdr, file_path)) {
    qmpc_log_error("qmpc_mmkv_cipher_reader: init metadata failed (file=%s)", file_path.buf);
    return false;
  }

  self->crc32_rolling_ = 0;
  self->crc32_ = hdr.crc32;
  self->offset_ = sizeof(uint32_t);
  self->mmkv_len_ = hdr.real_size + sizeof(uint32_t);
  qmpc_aes_128_cfb_init(&self->aes_, (const uint8_t*)key.buf, hdr.iv);

  bool ok = false;
  c_with(cstr path = cstr_from_sv(file_path), cstr_drop(&path)) {
    if (qmpc_mmap_init(&self->map_, cstr_str(&path))) {
      self->mmkv_len_ = QMPC_MIN(self->mmkv_len_, self->map_.size);
      self->mmkv_view_ = self->map_.data;
      ok = true;
    } else {
      qmpc_log_error("qmpc_mmkv_cipher_reader: init mmap failed (file=%s)", cstr_str(&path));
    }
  }

  if (!ok) {
    qmpc_mmkv_cipher_reader_drop(self);
  }

  return ok;
}

void qmpc_mmkv_cipher_reader_drop(qmpc_mmkv_cipher_reader_t* self) {
  qmpc_mmap_drop(&self->map_);
  qmpc_aes_128_cfb_drop(&self->aes_);
  memset(self, 0, sizeof(*self));
}

size_t qmpc_mmkv_cipher_reader_read(qmpc_mmkv_cipher_reader_t* self, uint8_t* buffer, size_t len) {
  if (self->mmkv_view_ == NULL) return 0;

  len = QMPC_MIN(len, self->mmkv_len_ - self->offset_);
  memcpy(buffer, self->mmkv_view_ + self->offset_, len);
  self->offset_ += len;
  self->crc32_rolling_ = qmpc_hash_crc32(buffer, len, self->crc32_rolling_);
  qmpc_aes_128_cfb_decrypt(&self->aes_, buffer, len);
  return len;
}
