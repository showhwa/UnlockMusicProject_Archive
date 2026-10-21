#pragma once

#include <stddef.h>
#include <stdint.h>

/*
 * Derived from kokke/tiny-AES-c <https://github.com/kokke/tiny-AES-c>,
 * Unlicense (public domain). Keep author credit (kokke) and unlicense.txt.
 *
 * Provides: AES-128 ECB — AES_init_ctx, AES_ECB_encrypt, AES_ECB_decrypt.
 * Removed vs upstream: CBC/CTR APIs; AES-192/256; CBC/ECB/CTR and
 * AES128/192/256 ifdefs; Iv in AES_ctx; AES_init_ctx_iv / AES_ctx_set_iv.
 */

#define AES_BLOCKLEN 16
#define AES_KEYLEN 16
#define AES_keyExpSize 176

struct AES_ctx
{
    uint8_t RoundKey[AES_keyExpSize];
};

void AES_init_ctx(struct AES_ctx *ctx, const uint8_t *key);
void AES_ECB_encrypt(const struct AES_ctx *ctx, uint8_t *buf);
void AES_ECB_decrypt(const struct AES_ctx *ctx, uint8_t *buf);
