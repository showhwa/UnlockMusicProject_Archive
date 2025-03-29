#pragma once

#include <cstdio>
#include <string>
#include <string_view>

namespace lsr {

#if _WIN32
typedef wchar_t character;
typedef std::wstring string;
typedef std::wstring_view string_view;
#define LSR_STR(x) L##x

inline void write_stderr(const string& msg) {
    fputws(msg.c_str(), stderr);
}
#else
typedef char character;
typedef std::string string;
typedef std::string_view string_view;
#define LSR_STR(x) x

inline void write_stderr(const string& msg) {
    fputs(msg.c_str(), stderr);
}
#endif

}  // namespace lsr

#if _WIN32
#define lsr___fprintf fwprintf
#else
#define lsr___fprintf fprintf
#endif

#define lsr_eprintf(fmt, ...) lsr___fprintf(stderr, LSR_STR(fmt), __VA_ARGS__)
#define lsr_printf(fmt, ...) lsr___fprintf(stdout, LSR_STR(fmt), __VA_ARGS__)
