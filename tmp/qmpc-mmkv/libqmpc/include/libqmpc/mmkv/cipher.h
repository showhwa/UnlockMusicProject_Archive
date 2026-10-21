#pragma once

#include "libqmpc/crypto/aes_cfb_128.h"
#include "libqmpc/export.h"
#include "libqmpc/utils/mmap.h"

#include <stdint.h>
#include <stdio.h>
#include <stc/csview.h>

typedef struct {
  qmpc_mmap_t map_;
  const uint8_t* mmkv_view_;
  uint32_t crc32_;
  size_t mmkv_len_;

  size_t offset_;
  uint32_t crc32_rolling_;

  qmpc_aes_128_cfb_t aes_;
} qmpc_mmkv_cipher_reader_t;

#pragma pack(push, 1)
typedef struct {
  // CRC32 of the encrypted payload
  uint32_t crc32;
  uint32_t _unused_1;
  uint32_t _unused_2;
  uint8_t iv[16];  // aes-cfb-128 iv
  uint32_t real_size;
  uint32_t _unused_3;
  uint32_t _unused_4;
} qmpc_mmkv_crc_hdr_t;
#pragma pack(pop)

QMPC_API bool qmpc_mmkv_cipher_reader_init_from_path(qmpc_mmkv_cipher_reader_t* self, csview file_path, csview key);
QMPC_API void qmpc_mmkv_cipher_reader_drop(qmpc_mmkv_cipher_reader_t* self);
QMPC_API size_t qmpc_mmkv_cipher_reader_read(qmpc_mmkv_cipher_reader_t* self, uint8_t* buffer, size_t len);
static inline bool qmpc_mmkv_cipher_reader_eof(qmpc_mmkv_cipher_reader_t* self) {
  return self->offset_ == self->mmkv_len_;
}
static inline bool qmpc_mmkv_cipher_reader_crc_valid(qmpc_mmkv_cipher_reader_t* self) {
  return self->crc32_rolling_ == self->crc32_;
}
