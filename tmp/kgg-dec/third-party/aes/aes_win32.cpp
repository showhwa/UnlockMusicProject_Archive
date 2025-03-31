#include <algorithm>
#include <cassert>
#include <cstring>

#include "aes.h"

namespace AES {
// ReSharper disable CppCStyleCast

bool AES_init_ctx_iv(AES_ctx* ctx, const uint8_t* key, const uint8_t* iv) {
    memset(ctx, 0, sizeof(AES_ctx));

    if (BCryptOpenAlgorithmProvider(&ctx->hAlg, BCRYPT_AES_ALGORITHM, nullptr, 0) != 0) {
        return false;
    }

    if (BCryptSetProperty(ctx->hAlg, BCRYPT_CHAINING_MODE, (PUCHAR)BCRYPT_CHAIN_MODE_CBC, sizeof(BCRYPT_CHAIN_MODE_CBC),
                          0) != 0) {
        BCryptCloseAlgorithmProvider(ctx->hAlg, 0);
        return false;
    }

    if (BCryptGenerateSymmetricKey(ctx->hAlg, &ctx->hKey, nullptr, 0, (PUCHAR)key, 0x10, 0) != 0) {
        BCryptCloseAlgorithmProvider(ctx->hAlg, 0);
        return false;
    }

    std::copy_n(iv, 0x10, ctx->iv);
    return true;
}

// buffer size MUST be mutile of AES_BLOCKLEN;
// Suggest https://en.wikipedia.org/wiki/Padding_(cryptography)#PKCS7 for padding scheme
// NOTES: you need to set IV in ctx via AES_init_ctx_iv() or AES_ctx_set_iv()
//        no IV should ever be reused with the same key
size_t AES_CBC_encrypt_buffer(struct AES_ctx* ctx, uint8_t* buf, size_t length) {
    // not implemented
    return 0;
}
size_t AES_CBC_decrypt_buffer(struct AES_ctx* ctx, uint8_t* buf, size_t length) {
    ULONG cbData{0};
    const auto len = static_cast<ULONG>(length);
    if (BCryptDecrypt(ctx->hKey, buf, len, nullptr, ctx->iv, sizeof(ctx->iv), buf, len, &cbData, 0) != 0) {
        assert(false && "BCryptDecrypt failed");
        return 0;
    }

    assert(cbData == len && "AES_CBC_decrypt_buffer: cbData != length");
    return cbData;
}

bool AES_cleanup(AES_ctx* ctx) {
    BCryptDestroyKey(ctx->hKey);
    BCryptCloseAlgorithmProvider(ctx->hAlg, 0);
    memset(ctx, 0, sizeof(AES_ctx));
    return true;
}

}  // namespace AES
