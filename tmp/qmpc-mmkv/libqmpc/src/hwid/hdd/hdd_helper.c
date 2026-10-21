#include "./hdd_helper.h"

#include <ctype.h>
#include <string.h>

#include <stc/csview.h>

void qmpc_flip_string(cstr* str) {
  const isize n = cstr_size(str);
  // Make new str len even
  if (n & 1) cstr_append_n(str, "", 1);

  isize actual_len = 0;

  char* p = cstr_data(str);
  const char* p_end = p + n;

  while (p < p_end) {
    c_swap(&p[0], &p[1]);
    if (p[0] == 0) break;
    ++actual_len;
    if (p[1] == 0) break;
    ++actual_len;
    p += 2;
  }
  cstr_resize(str, actual_len, '\0');
}

void qmpc_trim_space(cstr* str) {
  auto sv = cstr_sv(str);
  // ltrim + rtrim
  while (sv.size && isspace((unsigned char)sv.buf[0])) --sv.size, ++sv.buf;
  while (sv.size && isspace((unsigned char)sv.buf[sv.size - 1])) --sv.size;

  // sv may point into *str; avoid overlapping cstr_assign_sv/memcpy.
  if (sv.buf != cstr_data(str) && sv.size) memmove(cstr_data(str), sv.buf, (size_t)sv.size);
  cstr_resize(str, sv.size, '\0');
}

bool scan_printable_chars_from_hex(cstr* result, csview str) {
  cstr_clear(result);
  bool commit_byte = false;
  uint8_t last_byte = 0;

  while (str.size) {
    str.size--;
    const char chr = *str.buf++;

    if (chr >= '0' && chr <= '9') {
      last_byte |= chr - '0';
    } else if (chr >= 'A' && chr <= 'F') {
      last_byte |= chr - 'A' + 0x0A;
    } else if (chr >= 'a' && chr <= 'f') {
      last_byte |= chr - 'a' + 0x0A;
    } else if (!isspace(chr)) {
      // cleanup
      cstr_clear(result);
      return false;
    }

    // Only handle non-zero char, reject non-printable char.
    if (commit_byte) {
      if (last_byte != 0 && !isprint(last_byte)) {
        // cleanup
        cstr_clear(result);
        return false;
      }
      cstr_append_n(result, (char*)&last_byte, 1);
    }

    last_byte <<= 4;
    commit_byte = !commit_byte;
  }

  return true;
}

bool scan_printable_chars(cstr* result, const csview str) {
  cstr_clear(result);
  for (isize i = 0; i < str.size; i++) {
    if (!isprint(str.buf[i])) {
      cstr_clear(result);
      return false;
    }
  }
  cstr_assign_sv(result, str);
  return true;
}

// ConvertToString (diskid32.cpp): ATA IDENTIFY field by word indices, on the raw byte buffer.
cstr qmpc_cstr_from_identify(const char* str, const isize start, const isize end) {
  // Indices are IDENTIFY word offsets (same as diskid32); each word is 2 LE bytes.
  const isize len = (end - start + 1) * 2;
  cstr result = cstr_with_n(str + start * 2, len);
  qmpc_flip_string(&result);

  // Cut off trailing blanks (ConvertToString: index > 0, so buf[0] is never cleared).
  char* buf = cstr_data(&result);
  isize n = cstr_size(&result);
  for (isize index = n - 1; index > 0 && isspace((unsigned char)buf[index]); --index) --n;
  cstr_resize(&result, n, '\0');
  return result;
}

// flipAndCodeBytes (diskid32.cpp): STORAGE_DEVICE_DESCRIPTOR string fields
static cstr encode_prop_value(const csview str, const bool flip) {
  cstr result = cstr_with_capacity(str.size);
  if (!scan_printable_chars_from_hex(&result, str) && !scan_printable_chars(&result, str)) {
    cstr_clear(&result);
    return result;
  }

  if (flip) qmpc_flip_string(&result);

  // Re-terminate at first null-byte.
  cstr_resize(&result, c_strlen(cstr_str(&result)), '\0');
  qmpc_trim_space(&result);
  return result;
}

cstr qmpc_flip_and_code_bytes(const char* str, const isize pos, const bool flip) {
  if (pos <= 0) return cstr_init();
  return encode_prop_value(csview_from(str + pos), flip);
}
