#pragma once

#include <cstddef>
#include <cstdint>

#if USE_WIN_CRYPTO
#include <windows.h>

#include <bcrypt.h>
#elif USE_OPENSSL
#include <openssl/evp.h>
#endif

namespace AES {

constexpr size_t kKeyLen = 16;  // Key length in bytes
constexpr size_t kKeyExpansionSize = 176;
constexpr size_t kBlockLen = 16;  // Block length in bytes - AES is 128b block only

struct AES_ctx {
#if USE_WIN_CRYPTO
    BCRYPT_ALG_HANDLE hAlg;
    BCRYPT_KEY_HANDLE hKey;
    uint8_t iv[0x10];
#elif USE_OPENSSL
    EVP_CIPHER_CTX* cipher_ctx;
#else
    uint8_t RoundKey[kKeyExpansionSize];
    uint8_t Iv[16];
#endif
};

bool AES_init_ctx_iv(AES_ctx* ctx, const uint8_t* key, const uint8_t* iv);

// buffer size MUST be mutile of AES_BLOCKLEN;
// Suggest https://en.wikipedia.org/wiki/Padding_(cryptography)#PKCS7 for padding scheme
// NOTES: you need to set IV in ctx via AES_init_ctx_iv() or AES_ctx_set_iv()
//        no IV should ever be reused with the same key
size_t AES_CBC_encrypt_buffer(AES_ctx* ctx, uint8_t* buf, size_t length);
size_t AES_CBC_decrypt_buffer(AES_ctx* ctx, uint8_t* buf, size_t length);

#if USE_WIN_CRYPTO || USE_OPENSSL
bool AES_cleanup(AES_ctx* ctx);
#else
inline bool AES_cleanup(AES_ctx* ctx) {
    return true;
}
#endif

}  // namespace AES
