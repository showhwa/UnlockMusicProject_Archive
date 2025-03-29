#include <openssl/evp.h>
#include <cstring>
#include "md5.h"

bool md5_init(MD5_CTX* ctx) {
    memset(ctx, 0, sizeof(*ctx));

    ctx->md_ctx = EVP_MD_CTX_new();
    if (!ctx->md_ctx) {
        return false;
    }

    return EVP_DigestInit_ex(ctx->md_ctx, EVP_md5(), nullptr) == 1;
}

bool md5_cleanup(MD5_CTX* ctx) {
    if (ctx->md_ctx != nullptr) {
        EVP_MD_CTX_free(ctx->md_ctx);
    }
    memset(ctx, 0xcc, sizeof(*ctx));
    return true;
}

void md5_update(MD5_CTX* ctx, const uint8_t* in, size_t len) {
    EVP_DigestUpdate(ctx->md_ctx, in, len);
}

void md5_final(MD5_CTX* ctx, uint8_t* digest) {
    unsigned int len{MD5_DIGEST_LENGTH};
    EVP_DigestFinal_ex(ctx->md_ctx, digest, &len);
    EVP_MD_CTX_reset(ctx->md_ctx);
}
