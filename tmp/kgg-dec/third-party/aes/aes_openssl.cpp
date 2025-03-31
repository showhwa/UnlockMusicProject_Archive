#include <cassert>
#include <cstring>

#include "aes.h"

namespace AES {

bool AES_init_ctx_iv(AES_ctx* ctx, const uint8_t* key, const uint8_t* iv) {
    ctx->cipher_ctx = EVP_CIPHER_CTX_new();
    if (!ctx->cipher_ctx) {
        return false;
    }

    if (EVP_DecryptInit_ex(ctx->cipher_ctx, EVP_aes_128_cbc(), nullptr, key, iv) != 1) {
        AES_cleanup(ctx);
        return false;
    }

    EVP_CIPHER_CTX_set_padding(ctx->cipher_ctx, 0);
    return true;
}

size_t AES_CBC_encrypt_buffer(struct AES_ctx* ctx, uint8_t* buf, size_t length) {
    // not implemented
    return 0;
}

size_t AES_CBC_decrypt_buffer(struct AES_ctx* ctx, uint8_t* buf, size_t length) {
    auto buf_len = static_cast<int>(length);
    EVP_DecryptUpdate(ctx->cipher_ctx, buf, &buf_len, buf, buf_len);
    assert(buf_len == length && "AES_CBC_decrypt_buffer: buffer length mismatch");
    return buf_len;
}

bool AES_cleanup(AES_ctx* ctx) {
    if (ctx->cipher_ctx) {
        EVP_CIPHER_CTX_free(ctx->cipher_ctx);
        ctx->cipher_ctx = nullptr;
    }
    return true;
}

}  // namespace AES
