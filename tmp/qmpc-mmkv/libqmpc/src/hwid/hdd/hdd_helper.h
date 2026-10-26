#pragma once

// INTERNAL API: Helper functions for disk.c
#include <stc/cstr.h>
#include <stc/types.h>

/**
 * Swap hi/lo bytes of each 16-bit word in a string.
 * @param str String source
 */
void qmpc_flip_string(cstr* str);

/**
 * Trim space (checked by `isspace`) and null-terminator at both ends of string.
 * @param str input string
 */
void qmpc_trim_space(cstr* str);

/**
 * Scan hex characters from string and append them in `result`.
 * Caveats:
 *   - Space char (e.g. `\\s\\t\\n`) will be treated as `'0'`.
 *   - When string length is odd, last hex char will be discarded and return `true`.
 *   - When string contains non-hex characters, it will clear the string and return `false`.
 *   - When unhex uncovered non-printable chars (except \0), it will clear the string and return `false`.
 *   - It keeps "\0" in the cstr string.
 * @param result Output buffer to append decoded hex chars to
 * @param str The string to scan from
 * @return
 */
bool scan_printable_chars_from_hex(cstr* result, csview str);

/**
 * Scan characters from string and append them in `result`.
 * Caveats:
 *   - When there exists an non-printable character, it will clear `result`.
 * @param result Output buffer to append printable chars to
 * @param str The string to scan from
 * @return
 */
bool scan_printable_chars(cstr* result, csview str);

/**
 * ConvertToString (diskid32.cpp): decode an ATA IDENTIFY string field.
 * `start`/`end` are inclusive word indices into the IDENTIFY sector (e.g. 10..19 serial).
 * Reads the raw byte buffer (no DWORD hop), flips adjacent pairs, trims trailing spaces
 * (first byte is never cleared, matching the reference).
 */
cstr qmpc_cstr_from_identify(const char* str, isize_t start, isize_t end);

/**
 * flipAndCodeBytes (diskid32.cpp): decode a STORAGE_DEVICE_DESCRIPTOR string at `pos`.
 * Tries hex-digit pairs first, then printable ASCII; optional adjacent-byte flip; trims spaces.
 * @param str Base of the descriptor buffer (null-terminated field at `pos`)
 * @param pos Byte offset; `pos <= 0` yields an empty string
 * @param flip When true, swap adjacent bytes after decoding (serial numbers)
 */
cstr qmpc_flip_and_code_bytes(const char* str, isize_t pos, bool flip);
