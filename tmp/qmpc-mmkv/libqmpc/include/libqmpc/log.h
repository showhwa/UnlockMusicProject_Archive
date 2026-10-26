#pragma once

#include <stdio.h>
#include <stdarg.h>

typedef enum qmpc_logger_level {
  QMPC_LOGGER_LEVEL_TRACE = 1,
  QMPC_LOGGER_LEVEL_DEBUG,
  QMPC_LOGGER_LEVEL_VERBOSE,
  QMPC_LOGGER_LEVEL_INFO,
  QMPC_LOGGER_LEVEL_WARNING,
  QMPC_LOGGER_LEVEL_ERROR,
  QMPC_LOGGER_LEVEL_FATAL,
} qmpc_logger_level_t;

#define QMPC_LOGGER_LEVEL_MAX QMPC_LOGGER_LEVEL_FATAL
#define QMPC_LOGGER_LEVEL_DEFAULT QMPC_LOGGER_LEVEL_INFO
#define QMPC_LOGGER_LEVEL_MIN QMPC_LOGGER_LEVEL_TRACE

const char* qmpc_logger_level_to_string(qmpc_logger_level_t level);
qmpc_logger_level_t qmpc_logger_string_to_level(const char* str);

#if defined(_MSC_VER)
#include <sal.h>
#define QMPC_LOGGER_FORMAT_STRING _Printf_format_string_
#define QMPC_LOGGER_FORMAT_CHECK(a, b)
#else
#define QMPC_LOGGER_FORMAT_STRING
#define QMPC_LOGGER_FORMAT_CHECK(a, b) __attribute__((format(printf, a, b)))
#endif

typedef void (*qmpc_logger_fn_t)(qmpc_logger_level_t level, const char* fmt, va_list args);

/**
 * Set the logger function.
 * @param fn The logger function. Default is qmpc_logger_default.
 */
void qmpc_logger_set_logger(qmpc_logger_fn_t fn);

/**
 * Set the filter level. Only message with level greater than or equal to the filter level will be logged.
 * The default filter level is QMPC_LOGGER_LEVEL_INFO.
 * @param level The filter level.
 */
void qmpc_logger_set_filter_level(qmpc_logger_level_t level);

/**
 * Set the default file logger.
 * Default is `NULL`, which means to not log anything.
 * @param file The file to log to, can be `stderr`. NULL to disable the default file logger.
 */
void qmpc_logger_set_default_file_logger(FILE* file);

#ifdef QMPC_DISABLE_ALL_LOGGING
static inline void qmpc_log([[maybe_unused]] qmpc_logger_level_t level, [[maybe_unused]] const char* fmt, ...) {
  // Function is empty on purpose.
}
#else
/**
 * Log a message.
 * @param level The level of the message.
 * @param fmt The format string.
 * @param ... The arguments.
 */
void qmpc_log(qmpc_logger_level_t level, QMPC_LOGGER_FORMAT_STRING const char* fmt, ...) QMPC_LOGGER_FORMAT_CHECK(2, 3);
#endif

// Forward the format string and arguments together, including calls with no format arguments.
#define qmpc_log_trace(...) qmpc_log(QMPC_LOGGER_LEVEL_TRACE, __VA_ARGS__)
#define qmpc_log_verbose(...) qmpc_log(QMPC_LOGGER_LEVEL_VERBOSE, __VA_ARGS__)
#define qmpc_log_debug(...) qmpc_log(QMPC_LOGGER_LEVEL_DEBUG, __VA_ARGS__)
#define qmpc_log_info(...) qmpc_log(QMPC_LOGGER_LEVEL_INFO, __VA_ARGS__)
#define qmpc_log_warning(...) qmpc_log(QMPC_LOGGER_LEVEL_WARNING, __VA_ARGS__)
#define qmpc_log_error(...) qmpc_log(QMPC_LOGGER_LEVEL_ERROR, __VA_ARGS__)
#define qmpc_log_fatal(...) qmpc_log(QMPC_LOGGER_LEVEL_FATAL, __VA_ARGS__)

#undef QMPC_LOGGER_FORMAT_CHECK
#undef QMPC_LOGGER_FORMAT_STRING
