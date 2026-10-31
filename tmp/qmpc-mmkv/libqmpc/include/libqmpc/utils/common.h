#pragma once

#include <stdint.h>

#define QMPC_MIN(a, b) (((a) < (b)) ? (a) : (b))
#define QMPC_MAX(a, b) (((a) > (b)) ? (a) : (b))

#define QMPC_STR_EQ(a, b) (strcmp(a, b) == 0)
#define QMPC_STR_EQ_N(a, b, n) (strncmp(a, b, n) == 0)

#if defined(_WIN32)
#define QMPC_LITTLE_ENDIAN (1)
#elif defined(__BYTE_ORDER__) && defined(__ORDER_LITTLE_ENDIAN__) && (__BYTE_ORDER__ == __ORDER_LITTLE_ENDIAN__)
#define QMPC_LITTLE_ENDIAN (1)
#elif defined(__BYTE_ORDER__) && defined(__ORDER_BIG_ENDIAN__) && (__BYTE_ORDER__ == __ORDER_BIG_ENDIAN__)
#define QMPC_LITTLE_ENDIAN (0)
#else
#error "Unsupported byte order"
#endif

static inline uint32_t qmpc_htole32(uint32_t value) { return QMPC_LITTLE_ENDIAN ? value : __builtin_bswap32(value); }
static inline uint32_t qmpc_letoh32(uint32_t value) { return QMPC_LITTLE_ENDIAN ? __builtin_bswap32(value) : value; }
