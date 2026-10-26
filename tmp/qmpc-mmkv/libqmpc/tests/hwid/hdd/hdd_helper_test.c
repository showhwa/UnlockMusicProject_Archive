#include <stdio.h>
#include <string.h>

#include <stc/cstr.h>

#include "hwid/hdd/hdd_helper.h"

#define CHECK(expr)                                                    \
  do {                                                                 \
    if (!(expr)) {                                                     \
      fprintf(stderr, "line %d: CHECK failed: %s\n", __LINE__, #expr); \
      return 1;                                                        \
    }                                                                  \
  } while (0)

#define CHECK_CSTR_EQ(actual, expected)                                                      \
  do {                                                                                       \
    const char* _got = cstr_str(&(actual));                                                  \
    if (strcmp(_got, (expected)) != 0) {                                                     \
      fprintf(stderr, "line %d: expected \"%s\", got \"%s\"\n", __LINE__, (expected), _got); \
      return 1;                                                                              \
    }                                                                                        \
  } while (0)

/** Store a logical string at IDENTIFY word `start` as on-disk byte-swapped pairs. */
static void store_identify_field(char* identify, isize_t start, const char* logical, isize_t n_words) {
  char* dst = identify + start * 2;
  const isize_t len = n_words * 2;
  for (isize_t i = 0; i + 1 < len; i += 2) {
    dst[i] = logical[i + 1];
    dst[i + 1] = logical[i];
  }
}

static int test_identify(void) {
  char identify[94] = {0};

  store_identify_field(identify, 10, "WD-WMC1T042596    ", 10);
  store_identify_field(identify, 27, "WDC WD10EZEX-00BN5A0                   ", 20);
  store_identify_field(identify, 23, "01.01A01", 4);

  c_with(cstr s = qmpc_cstr_from_identify(identify, 10, 19), cstr_drop(&s)) { CHECK_CSTR_EQ(s, "WD-WMC1T042596"); }
  c_with(cstr s = qmpc_cstr_from_identify(identify, 27, 46), cstr_drop(&s)) {
    CHECK_CSTR_EQ(s, "WDC WD10EZEX-00BN5A0");
  }
  c_with(cstr s = qmpc_cstr_from_identify(identify, 23, 26), cstr_drop(&s)) { CHECK_CSTR_EQ(s, "01.01A01"); }

  // ConvertToString leaves a lone leading space if the field is all spaces (index > 0).
  char spaces[2] = {' ', ' '};
  c_with(cstr s = qmpc_cstr_from_identify(spaces, 0, 0), cstr_drop(&s)) {
    CHECK(cstr_size(&s) == 1);
    CHECK(cstr_str(&s)[0] == ' ');
  }

  puts("identify (ConvertToString) vectors passed.");
  return 0;
}

static int test_flip_and_code(void) {
  // pos <= 0 → empty (flipAndCodeBytes)
  c_with(cstr s = qmpc_flip_and_code_bytes("ABC", 0, false), cstr_drop(&s)) { CHECK(cstr_is_empty(&s)); }
  c_with(cstr s = qmpc_flip_and_code_bytes("ABC", -1, false), cstr_drop(&s)) { CHECK(cstr_is_empty(&s)); }

  // Hex path: "414243" → "ABC"
  {
    const char buf[] = "xxxx414243";
    c_with(cstr s = qmpc_flip_and_code_bytes(buf, 4, false), cstr_drop(&s)) { CHECK_CSTR_EQ(s, "ABC"); }
  }

  // Hex + flip: "4142" → "AB" → "BA"
  {
    const char buf[] = "xxxx4142";
    c_with(cstr s = qmpc_flip_and_code_bytes(buf, 4, true), cstr_drop(&s)) { CHECK_CSTR_EQ(s, "BA"); }
  }

  // Space in hex treated as '0': "4 1" → 0x40 ('@')
  {
    const char buf[] = "xxxx4 1";
    c_with(cstr s = qmpc_flip_and_code_bytes(buf, 4, false), cstr_drop(&s)) { CHECK_CSTR_EQ(s, "@"); }
  }

  // Non-hex printable fallback: "Hello World"
  {
    const char buf[] = "xxxxHello World";
    c_with(cstr s = qmpc_flip_and_code_bytes(buf, 4, false), cstr_drop(&s)) { CHECK_CSTR_EQ(s, "Hello World"); }
  }

  // Printable + flip + trim (leading/trailing spaces; must not be ambiguous hex).
  // "  ABCD  " → flip → "  BADC  " → trim → "BADC"
  {
    const char buf[] = "xxxx  ABCD  ";
    c_with(cstr s = qmpc_flip_and_code_bytes(buf, 4, true), cstr_drop(&s)) {
      CHECK(cstr_size(&s) == 4);
      CHECK_CSTR_EQ(s, "BADC");
    }
  }

  // qmpc_trim_space via flipAndCodeBytes: leading+trailing spaces only
  {
    const char buf[] = "xxxx  Hello  ";
    c_with(cstr s = qmpc_flip_and_code_bytes(buf, 4, false), cstr_drop(&s)) { CHECK_CSTR_EQ(s, "Hello"); }
  }

  // Non-printable → empty
  {
    const char buf[] = {'x', 'x', 'x', 'x', 'A', '\x01', 'B', '\0'};
    c_with(cstr s = qmpc_flip_and_code_bytes(buf, 4, false), cstr_drop(&s)) { CHECK(cstr_is_empty(&s)); }
  }

  // Hex with embedded NUL truncates like a C string after decode
  {
    const char buf[] = "xxxx410042";
    c_with(cstr s = qmpc_flip_and_code_bytes(buf, 4, false), cstr_drop(&s)) { CHECK_CSTR_EQ(s, "A"); }
  }

  puts("flip_and_code (flipAndCodeBytes) vectors passed.");
  return 0;
}

int main(int argc, char* argv[]) {
  if (argc == 2 && strcmp(argv[1], "identify") == 0) return test_identify();
  if (argc == 2 && strcmp(argv[1], "flip_and_code") == 0) return test_flip_and_code();
  CHECK(argc == 1);
  CHECK(test_identify() == 0);
  CHECK(test_flip_and_code() == 0);
  puts("HDD helper unit tests passed.");
  return 0;
}
