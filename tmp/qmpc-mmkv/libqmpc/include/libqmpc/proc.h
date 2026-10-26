#pragma once

#include <stdbool.h>
#include <stdint.h>

#ifdef _WIN32
#include <windows.h>
#include <tlhelp32.h>

#define QMPC_PROC_PROCESS_OBJECT PPROCESSENTRY32
#define QMPC_PROC_MODULE_OBJECT PMODULEENTRY32
#else
#define QMPC_PROC_PROCESS_OBJECT void*
#define QMPC_PROC_MODULE_OBJECT void*
#endif

typedef bool (*qmpc_fn12_process_filter_fn)(const QMPC_PROC_PROCESS_OBJECT pe32, void* user_data);
typedef bool (*qmpc_fn12_module_filter_fn)(const QMPC_PROC_MODULE_OBJECT pe32, void* user_data);

void qmpc_proc_enum_process(qmpc_fn12_process_filter_fn filter, void* user_data);
void qmpc_proc_enum_module(uint32_t pid, qmpc_fn12_module_filter_fn filter, void* user_data);

typedef bool (*qmpc_proc_enum_callback_t)(const void* address, const char* name, uint32_t ordinal, void* user_data);
void qmpc_proc_enum_pe_exports(const void* module, qmpc_proc_enum_callback_t callback, void* user_data);
