#include <libqmpc/crypto/aes_cfb_128.h>
#include <libqmpc/crypto/crc32.h>
#include <stdio.h>
#include <string.h>

#define CHECK(expr)                                                    \
  do {                                                                 \
    if (!(expr)) {                                                     \
      fprintf(stderr, "line %d: CHECK failed: %s\n", __LINE__, #expr); \
      return 1;                                                        \
    }                                                                  \
  } while (0)

static int test_aes(void) {
  /* NIST SP 800-38A F.3.13 AES-128-CFB128, plus all partial prefixes. */
  const uint8_t key[] = {
      0x2b, 0x7e, 0x15, 0x16, 0x28, 0xae, 0xd2, 0xa6, 0xab, 0xf7, 0x15, 0x88, 0x09, 0xcf, 0x4f, 0x3c,
  };
  const uint8_t iv[] = {
      0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f,
  };
  const uint8_t plain[] = {
      0x6b, 0xc1, 0xbe, 0xe2, 0x2e, 0x40, 0x9f, 0x96, 0xe9, 0x3d, 0x7e, 0x11, 0x73, 0x93, 0x17, 0x2a,
      0xae, 0x2d, 0x8a, 0x57, 0x1e, 0x03, 0xac, 0x9c, 0x9e, 0xb7, 0x6f, 0xac, 0x45, 0xaf, 0x8e, 0x51,
      0x30, 0xc8, 0x1c, 0x46, 0xa3, 0x5c, 0xe4, 0x11, 0xe5, 0xfb, 0xc1, 0x19, 0x1a, 0x0a, 0x52, 0xef,
      0xf6, 0x9f, 0x24, 0x45, 0xdf, 0x4f, 0x9b, 0x17, 0xad, 0x2b, 0x41, 0x7b, 0xe6, 0x6c, 0x37, 0x10,
  };
  const uint8_t cipher[] = {
      0x3b, 0x3f, 0xd9, 0x2e, 0xb7, 0x2d, 0xad, 0x20, 0x33, 0x34, 0x49, 0xf8, 0xe8, 0x3c, 0xfb, 0x4a,
      0xc8, 0xa6, 0x45, 0x37, 0xa0, 0xb3, 0xa9, 0x3f, 0xcd, 0xe3, 0xcd, 0xad, 0x9f, 0x1c, 0xe5, 0x8b,
      0x26, 0x75, 0x1f, 0x67, 0xa3, 0xcb, 0xb1, 0x40, 0xb1, 0x80, 0x8c, 0xf1, 0x87, 0xa4, 0xf4, 0xdf,
      0xc0, 0x4b, 0x05, 0x35, 0x7c, 0x5d, 0x1c, 0x0e, 0xea, 0xc4, 0xc6, 0x6f, 0x9f, 0xf7, 0xf2, 0xe6,
  };
  uint8_t data[66];
  qmpc_aes_128_cfb_t aes;

  /* One-shot decrypt for every prefix length. */
  for (size_t n = 0; n <= sizeof(cipher); ++n) {
    memset(data, 0xa5, sizeof(data));
    memcpy(data + 1, cipher, n);
    qmpc_aes_128_cfb_init(&aes, key, iv);
    qmpc_aes_128_cfb_decrypt(&aes, data + 1, n);
    qmpc_aes_128_cfb_drop(&aes);
    CHECK(memcmp(data + 1, plain, n) == 0);
    CHECK(data[0] == 0xa5 && data[n + 1] == 0xa5);
  }

  /* Streaming: feed ciphertext in irregular chunk sizes on one context. */
  static const size_t chunks[] = {1, 3, 7, 16, 17, 20};
  for (size_t ci = 0; ci < sizeof(chunks) / sizeof(chunks[0]); ++ci) {
    size_t chunk = chunks[ci];
    memset(data, 0xa5, sizeof(data));
    memcpy(data + 1, cipher, sizeof(cipher));
    qmpc_aes_128_cfb_init(&aes, key, iv);
    for (size_t off = 0; off < sizeof(cipher);) {
      size_t n = chunk;
      if (off + n > sizeof(cipher)) n = sizeof(cipher) - off;
      qmpc_aes_128_cfb_decrypt(&aes, data + 1 + off, n);
      off += n;
    }
    qmpc_aes_128_cfb_drop(&aes);
    CHECK(memcmp(data + 1, plain, sizeof(plain)) == 0);
    CHECK(data[0] == 0xa5 && data[sizeof(cipher) + 1] == 0xa5);
  }

  /* Empty update is a no-op. */
  qmpc_aes_128_cfb_init(&aes, key, iv);
  qmpc_aes_128_cfb_decrypt(&aes, data, 0);
  qmpc_aes_128_cfb_drop(&aes);
  return 0;
}

static int test_hashes(void) {
  uint8_t binary[1024];
  for (size_t i = 0; i < sizeof(binary); ++i) binary[i] = (uint8_t)i;

  /* CRC-32/ISO-HDLC; matches ntdll RtlComputeCrc32 with initial=0. */
  CHECK(qmpc_hash_crc32(NULL, 0, 0) == 0);
  CHECK(qmpc_hash_crc32("123456789", 9, 0) == UINT32_C(0xcbf43926));
  CHECK(qmpc_hash_crc32(binary, 55, 0) == UINT32_C(0xfd4fdad4));
  CHECK(qmpc_hash_crc32(binary, 56, 0) == UINT32_C(0xebfc1395));
  CHECK(qmpc_hash_crc32(binary, 63, 0) == UINT32_C(0xdbdea683));
  CHECK(qmpc_hash_crc32(binary, 64, 0) == UINT32_C(0x100ece8c));
  CHECK(qmpc_hash_crc32(binary, 65, 0) == UINT32_C(0x40c06fd8));
  CHECK(qmpc_hash_crc32(binary, 1024, 0) == UINT32_C(0xb70b4c26));
  puts("CRC32 vectors passed.");
  return 0;
}

int main(int argc, char* argv[]) {
  if (argc == 2 && strcmp(argv[1], "hashes") == 0) return test_hashes();
  if (argc == 2 && strcmp(argv[1], "aes") == 0) return test_aes();
  CHECK(argc == 1);
  CHECK(test_hashes() == 0);
  CHECK(test_aes() == 0);
  puts("AES-CFB128 and CRC32 vectors passed.");
  return 0;
}
