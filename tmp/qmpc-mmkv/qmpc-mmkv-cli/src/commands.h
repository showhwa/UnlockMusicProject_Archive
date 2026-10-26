#pragma once

#include "libqmpc/common_function/cf12.h"
#include "libqmpc/log.h"
#include "utils/mmkv_reader_adapter.h"

typedef struct {
  const char* input;
  const char* key;
  const char* output;
  qmpc_mmkv_key_method_t mmkv_key_method;
  mmkv_reader_adapter_type_t adapter_type;
  qmpc_logger_level_t level;
} qmpc_command_args;

/**
 * Print the system ID.
 *
 * @return process exit code
 */
int qmpc_command_system_id(const qmpc_command_args* args);

/**
 * Dump the contents of the MMKV database to file.
 *
 * @return process exit code
 */
int qmpc_command_dump(const qmpc_command_args* args);
