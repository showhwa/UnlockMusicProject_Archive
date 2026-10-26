#pragma once

#include <stdbool.h>
#include <stdint.h>

// Buffer length when calling fn12.
#define QMPC_FN12_MMKV_NAME_BUFF_LEN (0x40)
#define QMPC_FN12_MMKV_KEY_BUF_LEN (0x40)

// Actual key length used to truncate to the real key len.
#define QMPC_FN12_MMKV_KEY_ACTUAL_LEN (0x10)

typedef struct {
  /**
   * @brief The handle to the process.
   */
  void* process;
  uint8_t* module;
  void* module_addr;
  size_t module_size;
} qmpc_fn12_t;

bool qmpc_fn12_init(qmpc_fn12_t* self);
void qmpc_fn12_drop(qmpc_fn12_t* self);
bool qmpc_fn12_call(qmpc_fn12_t* self, char* mmkv_name, char* mmkv_key);
