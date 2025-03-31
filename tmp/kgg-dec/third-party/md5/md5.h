#pragma once

#include <cstdint>

#if USE_WIN_CRYPTO
#include <windows.h>

#include <wincrypt.h>
#elif USE_OPENSSL
#include <openssl/evp.h>
#endif

#define MD5_DIGEST_LENGTH 16

struct MD5_CTX {
#if USE_WIN_CRYPTO
    HCRYPTPROV hProv;
    HCRYPTHASH hHash;
#elif USE_OPENSSL
    EVP_MD_CTX* md_ctx;
#else
    uint64_t count;           /* number of bits, modulo 2^64 (lsb first) */
    uint32_t state[4];        /* state (ABCD) */
    unsigned char buffer[64]; /* input buffer */
#endif
};

#if USE_WIN_CRYPTO || USE_OPENSSL
bool md5_init(MD5_CTX* ctx);
bool md5_cleanup(MD5_CTX* ctx);
#else
/* MD5 initialization. Begins an MD5 operation, writing a new context. */
inline bool md5_init(MD5_CTX* context) {
    context->count = 0;

    /* Load magic initialization constants.  */
    context->state[0] = 0x67452301;
    context->state[1] = 0xefcdab89;
    context->state[2] = 0x98badcfe;
    context->state[3] = 0x10325476;

    return true;
}

inline bool md5_cleanup(MD5_CTX* ctx) {
    return true;
}
#endif

void md5_update(MD5_CTX* ctx, const uint8_t* in, size_t len);
void md5_final(MD5_CTX* ctx, uint8_t* digest);

inline void md5(uint8_t* digest, const uint8_t* in, const size_t len) {
    MD5_CTX ctx{};
    md5_init(&ctx);
    md5_update(&ctx, in, len);
    md5_final(&ctx, digest);
    md5_cleanup(&ctx);
}

inline void md5(uint8_t* digest, const uint8_t* in, const size_t len, const uint8_t* in2, size_t len2) {
    MD5_CTX ctx{};
    md5_init(&ctx);
    md5_update(&ctx, in, len);
    md5_update(&ctx, in2, len2);
    md5_final(&ctx, digest);
    md5_cleanup(&ctx);
}
