#include <libqmpc/common_function/cf12.h>
#include <libqmpc/common_function/ordinal_12.h>
#include <libqmpc/log.h>
#include <libqmpc/mmkv/reader.h>

#include <stdio.h>
#include <string.h>

#define CHECK(expr)                                                    \
  do {                                                                 \
    if (!(expr)) {                                                     \
      fprintf(stderr, "line %d: CHECK failed: %s\n", __LINE__, #expr); \
      return 1;                                                        \
    }                                                                  \
  } while (0)

typedef struct {
  const uint8_t* buf;
  size_t len;
  size_t pos;
} mem_stream_t;

static size_t mem_read(void* ctx, uint8_t* buffer, size_t len) {
  mem_stream_t* s = (mem_stream_t*)ctx;
  size_t remain = s->len - s->pos;
  size_t to_read = len < remain ? len : remain;
  if (to_read > 0) {
    memcpy(buffer, s->buf + s->pos, to_read);
    s->pos += to_read;
  }
  return to_read;
}

static bool mem_eof(void* ctx) {
  mem_stream_t* s = (mem_stream_t*)ctx;
  return s->pos >= s->len;
}

static int test_varint(void) {
  // Test valid single-byte varint: 0x01
  {
    uint8_t data[] = {0x01};
    mem_stream_t stream = {.buf = data, .len = sizeof(data)};
    qmpc_mmkv_reader_source_t src = {.ctx_ = &stream, .read_ = mem_read, .eof_ = mem_eof};
    qmpc_mmkv_reader_t r;
    qmpc_mmkv_reader_init(&r, &src);

    uint64_t val = 0;
    isize_t bytes_read = 0;
    CHECK(qmpc_mmkv_reader__read_u64(&r, &val, -1, &bytes_read));
    CHECK(val == 1);
    CHECK(bytes_read == 1);
  }

  // Test valid 10-byte varint for UINT64_MAX:
  // 9 bytes of 0xFF followed by 0x01
  {
    uint8_t data[10] = {0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0x01};
    mem_stream_t stream = {.buf = data, .len = sizeof(data)};
    qmpc_mmkv_reader_source_t src = {.ctx_ = &stream, .read_ = mem_read, .eof_ = mem_eof};
    qmpc_mmkv_reader_t r;
    qmpc_mmkv_reader_init(&r, &src);

    uint64_t val = 0;
    isize_t bytes_read = 0;
    CHECK(qmpc_mmkv_reader__read_u64(&r, &val, -1, &bytes_read));
    CHECK(val == UINT64_MAX);
    CHECK(bytes_read == 10);
  }

  // Test malformed varint: 12 bytes of 0x80 (infinite varint attack)
  // Must return false without UB shift or crash
  {
    uint8_t data[12] = {0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80};
    mem_stream_t stream = {.buf = data, .len = sizeof(data)};
    qmpc_mmkv_reader_source_t src = {.ctx_ = &stream, .read_ = mem_read, .eof_ = mem_eof};
    qmpc_mmkv_reader_t r;
    qmpc_mmkv_reader_init(&r, &src);

    uint64_t val = 0;
    isize_t bytes_read = 0;
    CHECK(!qmpc_mmkv_reader__read_u64(&r, &val, -1, &bytes_read));
  }

  // Test 10th byte overflow (0x02 instead of 0x01)
  {
    uint8_t data[10] = {0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0x02};
    mem_stream_t stream = {.buf = data, .len = sizeof(data)};
    qmpc_mmkv_reader_source_t src = {.ctx_ = &stream, .read_ = mem_read, .eof_ = mem_eof};
    qmpc_mmkv_reader_t r;
    qmpc_mmkv_reader_init(&r, &src);

    uint64_t val = 0;
    CHECK(!qmpc_mmkv_reader__read_u64(&r, &val, -1, NULL));
  }

  puts("MMKV Varint unit tests passed.");
  return 0;
}

static int test_robustness(void) {
  // Test NULL safety in string-to-enum functions
  CHECK(qmpc_logger_string_to_level(NULL) == (qmpc_logger_level_t)0);
  CHECK(qmpc_mmkv_key_method_from_str(NULL) == (qmpc_mmkv_key_method_t)0);

  // Test ordinal_12 robustness
  c_with(cstr name = cstr_init(), cstr_drop(&name)) {
    qmpc_mmkv_system_id_to_name(&name, NULL);
    CHECK(cstr_is_empty(&name));

    qmpc_mmkv_system_id_to_name(&name, "short");
    CHECK(cstr_is_empty(&name));

    // Test lowercase hex input (should convert to valid lowercase ASCII)
    qmpc_mmkv_system_id_to_name(&name, "0123456789abcdef0123456789abcdef");
    CHECK(!cstr_is_empty(&name));
    for (isize_t i = 0; i < cstr_size(&name); ++i) {
      char c = cstr_str(&name)[i];
      CHECK((unsigned char)c < 128);
    }
  }

  c_with(cstr key = cstr_init(), cstr_drop(&key)) {
    qmpc_mmkv_system_id_to_key(&key, NULL);
    CHECK(cstr_is_empty(&key));

    qmpc_mmkv_system_id_to_key(&key, "0123456789abcdef0123456789abcdef");
    CHECK(cstr_size(&key) == 16);
  }

  puts("Robustness unit tests passed.");
  return 0;
}

int main(int argc, char* argv[]) {
  if (argc == 2 && strcmp(argv[1], "varint") == 0) return test_varint();
  if (argc == 2 && strcmp(argv[1], "robustness") == 0) return test_robustness();
  CHECK(argc == 1);
  CHECK(test_varint() == 0);
  CHECK(test_robustness() == 0);
  return 0;
}

