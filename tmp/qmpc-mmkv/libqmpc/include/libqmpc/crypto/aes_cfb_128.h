#pragma once

#include <tiny-aes-c.h>

/**
 * AES-128-CFB128, no padding. Decrypts data in place; state is kept in ctx.
 */
typedef struct {
  struct AES_ctx ctx;

  size_t idx;
  uint8_t feedback[AES_BLOCKLEN];
} qmpc_aes_128_cfb_t;

void qmpc_aes_128_cfb_init(qmpc_aes_128_cfb_t* self, const uint8_t* key, const uint8_t* iv);
void qmpc_aes_128_cfb_decrypt(qmpc_aes_128_cfb_t* self, uint8_t* data, size_t len);
void qmpc_aes_128_cfb_drop(qmpc_aes_128_cfb_t* self);
