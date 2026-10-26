#include "libqmpc/log.h"
#include "libqmpc/utils/str.h"

#include <stc/cstr.h>
#include <stc/csview.h>

#include <stdarg.h>

void qmpc_logger_default(qmpc_logger_level_t level, const char* fmt, va_list args);

static FILE* qmpc_logger_file = NULL;
static qmpc_logger_fn_t qmpc_logger_fn = qmpc_logger_default;
void qmpc_logger_set_logger(qmpc_logger_fn_t fn) { qmpc_logger_fn = fn; }

static qmpc_logger_level_t qmpc_logger_filter_level = QMPC_LOGGER_LEVEL_DEFAULT;
void qmpc_logger_set_filter_level(qmpc_logger_level_t level) { qmpc_logger_filter_level = level; }

const char* qmpc_logger_level_to_string(qmpc_logger_level_t level) {
  switch (level) {
    case QMPC_LOGGER_LEVEL_TRACE:
      return "TRACE";
    case QMPC_LOGGER_LEVEL_DEBUG:
      return "DEBUG";
    case QMPC_LOGGER_LEVEL_VERBOSE:
      return "VERBOSE";
    case QMPC_LOGGER_LEVEL_INFO:
      return "INFO";
    case QMPC_LOGGER_LEVEL_WARNING:
      return "WARNING";
    case QMPC_LOGGER_LEVEL_ERROR:
      return "ERROR";
    case QMPC_LOGGER_LEVEL_FATAL:
      return "FATAL";
    default:
      return "????";
  }
}

qmpc_logger_level_t qmpc_logger_string_to_level(const char* str) {
  if (qmpc_str_ieq(str, "TRACE")) return QMPC_LOGGER_LEVEL_TRACE;
  if (qmpc_str_ieq(str, "VERBOSE")) return QMPC_LOGGER_LEVEL_VERBOSE;
  if (qmpc_str_ieq(str, "DEBUG")) return QMPC_LOGGER_LEVEL_DEBUG;
  if (qmpc_str_ieq(str, "INFO")) return QMPC_LOGGER_LEVEL_INFO;
  if (qmpc_str_ieq(str, "WARNING")) return QMPC_LOGGER_LEVEL_WARNING;
  if (qmpc_str_ieq(str, "ERROR")) return QMPC_LOGGER_LEVEL_ERROR;
  if (qmpc_str_ieq(str, "FATAL")) return QMPC_LOGGER_LEVEL_FATAL;
  return (qmpc_logger_level_t)0;  // invalid level
}

void qmpc_logger_default(qmpc_logger_level_t level, const char* fmt, va_list args) {
  if (qmpc_logger_file == NULL) return;

  csview newline = csview_from_n("\n", 1);

  c_with(cstr prefix = cstr_from_fmt("[%-7s] ", qmpc_logger_level_to_string(level)), cstr_drop(&prefix)) {
    c_with(cstr msg = cstr_init(), cstr_drop(&msg)) {
      c_with(cstr buf = cstr_with_capacity(cstr_size(&msg) + 32), cstr_drop(&buf)) {
        cstr_vfmt(&msg, cstr_size(&msg), fmt, args);

        csview msg_view = cstr_sv(&msg);
        while (true) {
          cstr_append_sv(&buf, cstr_sv(&prefix));
          isize_t pos = csview_find_sv(msg_view, newline);
          if (pos == c_NPOS) {
            cstr_append_sv(&buf, msg_view);
            cstr_append_sv(&buf, newline);
            break;
          }

          const isize_t len = pos + 1;
          cstr_append_sv(&buf, csview_subview(msg_view, 0, len));
          msg_view.buf += len;
          msg_view.size -= len;
        }
        fputs(cstr_str(&buf), qmpc_logger_file);
      }
    }
  }
}

void qmpc_logger_set_default_file_logger(FILE* file) {
  qmpc_logger_file = file;
  qmpc_logger_fn = qmpc_logger_default;
}

#ifndef QMPC_DISABLE_ALL_LOGGING
void qmpc_log(qmpc_logger_level_t level, const char* fmt, ...) {
  if (level < qmpc_logger_filter_level) return;

  va_list args;
  va_start(args, fmt);
  qmpc_logger_fn(level, fmt, args);
  va_end(args);
}
#endif
