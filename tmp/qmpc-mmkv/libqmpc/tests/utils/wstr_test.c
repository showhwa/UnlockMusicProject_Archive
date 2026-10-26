#include <stdio.h>
#include <string.h>
#include <wchar.h>

#include <libqmpc/utils/wstr.h>

#define CHECK(expr)                                                    \
  do {                                                                 \
    if (!(expr)) {                                                     \
      fprintf(stderr, "line %d: CHECK failed: %s\n", __LINE__, #expr); \
      return 1;                                                        \
    }                                                                  \
  } while (0)

/** Assert UTF-8 content and that cstr_size excludes the STC terminator. */
static int expect_utf8(cstr* s, const char* expected, isize_t expected_size) {
  CHECK(cstr_size(s) == expected_size);
  CHECK(strcmp(cstr_str(s), expected) == 0);
  /* STC always keeps a terminator past the logical size. */
  CHECK(cstr_str(s)[expected_size] == '\0');
  /* No embedded extra NUL inside the logical payload. */
  for (isize_t i = 0; i < expected_size; ++i) CHECK(cstr_str(s)[i] != '\0');
  return 0;
}

static int test_wstr2utf8(void) {
  c_with(cstr s = qmpc_wstr2utf8(L"hi", 2), cstr_drop(&s)) {
    if (expect_utf8(&s, "hi", 2) != 0) return 1;
  }

  c_with(cstr s = qmpc_wstr2utf8(L"hi", -1), cstr_drop(&s)) {
    if (expect_utf8(&s, "hi", 2) != 0) return 1;
  }

  c_with(cstr s = qmpc_wstr2utf8(L"", 0), cstr_drop(&s)) {
    CHECK(cstr_size(&s) == 0);
    CHECK(cstr_str(&s)[0] == '\0');
  }

  c_with(cstr s = qmpc_wstr2utf8(L"", -1), cstr_drop(&s)) {
    CHECK(cstr_size(&s) == 0);
    CHECK(cstr_str(&s)[0] == '\0');
  }

  /* Explicit length ignores a trailing wide NUL in the buffer. */
  {
    const wchar_t buf[] = {L'a', L'b', L'\0', L'x'};
    c_with(cstr s = qmpc_wstr2utf8(buf, 2), cstr_drop(&s)) {
      if (expect_utf8(&s, "ab", 2) != 0) return 1;
    }
  }

  /* Multi-byte UTF-8: size is byte length, still no extra NUL in size. */
  c_with(cstr s = qmpc_wstr2utf8(L"\u4f60\u597d", -1), cstr_drop(&s)) {
    if (expect_utf8(&s, "\xe4\xbd\xa0\xe5\xa5\xbd", 6) != 0) return 1;
  }

  puts("qmpc_wstr2utf8 vectors passed.");
  return 0;
}

int main(int argc, char* argv[]) {
  if (argc == 2 && strcmp(argv[1], "wstr2utf8") == 0) return test_wstr2utf8();
  CHECK(argc == 1);
  return test_wstr2utf8();
}
