#include "md5.h"

bool md5_init(MD5_CTX* ctx) {
    if (!CryptAcquireContext(&ctx->hProv, nullptr, nullptr, PROV_RSA_FULL, CRYPT_VERIFYCONTEXT)) {
        return false;
    }

    // Create the hash object
    if (!CryptCreateHash(ctx->hProv, CALG_MD5, 0, 0, &ctx->hHash)) {
        CryptReleaseContext(ctx->hProv, 0);
        return false;
    }

    return true;
}

void md5_update(MD5_CTX* ctx, const uint8_t* in, size_t len) {
    CryptHashData(ctx->hHash, in, static_cast<DWORD>(len), 0);
}

void md5_final(MD5_CTX* ctx, uint8_t* digest) {
    DWORD dataLen = MD5_DIGEST_LENGTH;
    CryptGetHashParam(ctx->hHash, HP_HASHVAL, digest, &dataLen, 0);
    CryptDestroyHash(ctx->hHash);
    ctx->hHash = 0;
}

bool md5_cleanup(MD5_CTX* ctx) {
    if (ctx->hHash) {
        CryptDestroyHash(ctx->hHash);
    }
    CryptReleaseContext(ctx->hProv, 0);
    memset(ctx, 0, sizeof(MD5_CTX));
    return true;
}
