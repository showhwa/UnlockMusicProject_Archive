#include "libqmpc/crypto/aes_cfb_128.h"
#include "libqmpc/utils/common.h"

#include <tiny-aes-c.h>
#include <string.h>

void qmpc_aes_128_cfb_init(qmpc_aes_128_cfb_t* self, const uint8_t* key, const uint8_t* iv) {
  AES_init_ctx(&self->ctx, key);
  memcpy(self->feedback, iv, sizeof(self->feedback));
  /* Force encrypt-on-first-byte so feedback starts as E(K, IV). */
  self->idx = sizeof(self->feedback);
}

void qmpc_aes_128_cfb_decrypt(qmpc_aes_128_cfb_t* self, uint8_t* data, size_t len) {
  while (len) {
    if (self->idx == sizeof(self->feedback)) {
      AES_ECB_encrypt(&self->ctx, self->feedback);
      self->idx = 0;
    }
    size_t block_len = QMPC_MIN(len, sizeof(self->feedback) - self->idx);
    for (size_t i = 0; i < block_len; ++i) {
      uint8_t ciphertext = data[i];
      data[i] ^= self->feedback[self->idx];
      self->feedback[self->idx] = ciphertext;
      ++self->idx;
    }
    data += block_len;
    len -= block_len;
  }
}

void qmpc_aes_128_cfb_drop(qmpc_aes_128_cfb_t* self) { memset(self, 0, sizeof(*self)); }
