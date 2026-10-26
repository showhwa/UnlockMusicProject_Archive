#include "libqmpc/log.h"
#include "libqmpc_qmpc_fn12_data.h"
#include "libqmpc/common_function/qmpc_fn12.h"
#include "libqmpc/proc.h"
#include "stc/common.h"

#include <memoryapi.h>
#include <minwindef.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>
#include <winnt.h>

#ifdef _MSC_VER
#define QMPC_IGNORE_PTR_CONVERT
#else
#define QMPC_IGNORE_PTR_CONVERT __extension__
#endif

#define QMPC_FN12_RPC_TIMEOUT (10'000 /* 10s */)
#define QMPC_FN12_PAGE_SIZE (0x1000 /* 4kb */)

#define QMPC_FN12_PROCESS_PERMISSION \
  (PROCESS_QUERY_INFORMATION | PROCESS_VM_OPERATION | PROCESS_VM_READ | PROCESS_CREATE_THREAD | PROCESS_VM_WRITE)

typedef struct qmpc_fn12_metadata {
  bool done;
  bool found_process;
  HANDLE process;
  uint8_t* module_copy;
  void* module_addr;
  size_t module_size;
} qmpc_fn12_metadata_t;

#pragma pack(push, 4)
typedef struct {
  char res_mmkv_name[QMPC_FN12_MMKV_NAME_BUFF_LEN];
  char res_mmkv_key[QMPC_FN12_MMKV_KEY_BUF_LEN];
  uint32_t fn12_addr;
  uint32_t ok;
  uint32_t padding[2];
} qmpc_fn12_caller_params_t;
#pragma pack(pop)

#pragma pack(push, 1)
typedef struct {
  qmpc_fn12_caller_params_t caller_params;
  uint8_t code_[QMPC_FN12_PAGE_SIZE - sizeof(qmpc_fn12_caller_params_t)];
} qmpc_fn12_payload_t;
static_assert(sizeof(qmpc_fn12_payload_t) == QMPC_FN12_PAGE_SIZE,
              "qmpc_fn12_payload_t size is not QMPC_FN12_PAGE_SIZE");
#pragma pack(pop)

typedef struct {
  void* fn12;
} qmpc_fn12_find_ord_12_data_t;

static bool qmpc_fn12_find_module(const QMPC_PROC_MODULE_OBJECT me32, void* user_data) {
  qmpc_fn12_metadata_t* meta = user_data;
  qmpc_log_trace("qmpc_fn12_find_module enter (pid=%d, module=%s)", (int)me32->th32ProcessID, me32->szModule);
  if (_stricmp(me32->szModule, "CommonFunction.dll") == 0) {
    qmpc_log_trace("found CommonFunction.dll, attempt to copy...");
    c_with(HANDLE process = OpenProcess(QMPC_FN12_PROCESS_PERMISSION, FALSE, me32->th32ProcessID), process,
           CloseHandle(process)) {
      qmpc_log_trace("OpenProcess OK!");
      c_with(void* module = malloc(me32->modBaseSize), module, free(module)) {
        qmpc_log_trace("alloc OK!");
        SIZE_T bytes_read = 0;
        if (ReadProcessMemory(process, me32->modBaseAddr, module, me32->modBaseSize, &bytes_read) &&
            bytes_read == (SIZE_T)me32->modBaseSize) {
          qmpc_log_verbose("Read CommonFunction.dll OK!");
          meta->module_addr = me32->modBaseAddr;
          meta->module_size = me32->modBaseSize;
          meta->process = process;
          meta->module_copy = module;
          meta->done = true;
          qmpc_log_trace("qmpc_fn12_find_module ok");

          // Skip cleanup: only cleanup when failed
          return true;
        }
        qmpc_log_warning("Failed to read CommonFunction.dll (pid=0x%08x, addr=%p, size=0x%08x, bytes_read=%lu)",
                         (unsigned)me32->th32ProcessID, me32->modBaseAddr, (unsigned)me32->modBaseSize,
                         (unsigned long)bytes_read);
      }
      qmpc_log_warning("failed to allocate 0x%08x bytes", (unsigned)me32->modBaseSize);
    }
    qmpc_log_warning("failed to open process (pid=0x%08x)", (unsigned)me32->th32ProcessID);
  }

  return false;
}

static bool qmpc_fn12_find_process(const QMPC_PROC_PROCESS_OBJECT pe32, void* user_data) {
  qmpc_fn12_metadata_t* metadata = user_data;
  qmpc_log_trace("qmpc_fn12_find_process: found exe %s (pid=0x%08x)", pe32->szExeFile, (unsigned)pe32->th32ProcessID);
  if (_stricmp(pe32->szExeFile, "QQMusic.exe") != 0) {
    return false;
  }

  metadata->found_process = true;
  qmpc_log_trace("found exe (pid=0x%08x), scan modules...", (unsigned)pe32->th32ProcessID);
  qmpc_proc_enum_module(pe32->th32ProcessID, qmpc_fn12_find_module, user_data);
  qmpc_log_trace("scan modules done, ok=%d", metadata->done);
  return metadata->done;
}

bool qmpc_fn12_init(qmpc_fn12_t* self) {
  memset(self, 0, sizeof(*self));

  qmpc_fn12_metadata_t meta = {};
  qmpc_log_trace("qmpc_fn12_init: scan for process...");
  qmpc_proc_enum_process(qmpc_fn12_find_process, &meta);
  qmpc_log_trace("scan process done, ok=%d", meta.done);
  if (meta.done) {
    self->process = meta.process;
    self->module = meta.module_copy;
    self->module_addr = meta.module_addr;
    self->module_size = meta.module_size;
    return true;
  }

  if (!meta.found_process) qmpc_log_warning("process is not running: QQMusic.exe");

  return false;
}

void qmpc_fn12_drop(qmpc_fn12_t* self) {
  if (self->module) free(self->module);
  if (self->process) CloseHandle(self->process);
  memset(self, 0, sizeof(*self));
}

static bool qmpc_fn12_find_ord_12(const void* address, [[maybe_unused]] const char* name, uint32_t ordinal,
                                  void* user_data) {
  qmpc_fn12_find_ord_12_data_t* data = user_data;
  if (ordinal == 12) {
    data->fn12 = (void*)address;
    qmpc_log_verbose("qmpc_fn12_find_ord_12: found ordinal 12 at %p", address);
    return true;
  }
  return false;
}

bool qmpc_fn12_call(qmpc_fn12_t* self, char* mmkv_name, char* mmkv_key) {
  qmpc_log_trace("qmpc_fn12_call: enter");

  qmpc_fn12_find_ord_12_data_t fn12_search = {};
  qmpc_proc_enum_pe_exports(self->module, qmpc_fn12_find_ord_12, &fn12_search);
  if (!fn12_search.fn12) {
    qmpc_log_error("could not find ordinal 12");
    return false;
  }

  uintptr_t fn12_delta = (uintptr_t)fn12_search.fn12 - (uintptr_t)self->module;
  qmpc_fn12_caller_params_t params = {};
  // Target is 32-bit target, truncate address to 32-bit is ok.
  params.fn12_addr = ((uint32_t)(uintptr_t)self->module_addr) + (uint32_t)fn12_delta;

  bool ok = false;
  c_with(void* p = VirtualAllocEx(self->process, NULL, sizeof(qmpc_fn12_payload_t), MEM_COMMIT, PAGE_EXECUTE_READWRITE),
         p, VirtualFreeEx(self->process, p, 0, MEM_RELEASE)) {
    SIZE_T bytes_written = 0;
    if (!WriteProcessMemory(self->process, p, &params, sizeof(params), &bytes_written) ||
        bytes_written != sizeof(params)) {
      qmpc_log_error("WriteProcessMemory(params) failed (error=0x%08lx)", GetLastError());
      continue;
    }
    void* code_addr = (void*)((uintptr_t)p + offsetof(qmpc_fn12_payload_t, code_));
    if (!WriteProcessMemory(self->process, code_addr, &qmpc_fn12, qmpc_fn12_len, &bytes_written) ||
        bytes_written != qmpc_fn12_len) {
      qmpc_log_error("WriteProcessMemory(shellcode) failed (error=0x%08lx)", GetLastError());
      continue;
    }

    qmpc_log_trace("remote ready, code=%p, arg.1=%p", code_addr, p);

    c_with(HANDLE thread = CreateRemoteThread(self->process, NULL, QMPC_FN12_PAGE_SIZE,
                                              QMPC_IGNORE_PTR_CONVERT((LPTHREAD_START_ROUTINE)code_addr), p, 0, NULL),
           thread, CloseHandle(thread)) {
      if (WaitForSingleObject(thread, QMPC_FN12_RPC_TIMEOUT) == WAIT_TIMEOUT) {
        qmpc_log_error("WaitForSingleObject failed (error=0x%08lx)", GetLastError());
        TerminateThread(thread, 1);
        continue;
      }
      DWORD exit_code = 0;
      if (!GetExitCodeThread(thread, &exit_code)) {
        qmpc_log_error("GetExitCodeThread failed (error=0x%08lx)", GetLastError());
        continue;
      }
      if (exit_code != 0) {
        qmpc_log_error("Thread exit code is non-zero (0x%08lx)", exit_code);
        continue;
      }

      SIZE_T bytes_read = 0;
      if (!ReadProcessMemory(self->process, p, &params, sizeof(params), &bytes_read) || bytes_read != sizeof(params)) {
        qmpc_log_error("ReadProcessMemory failed (code=%08lx)\n", GetLastError());
        continue;
      }
      ok = params.ok == 1;
    }
  }

  if (ok) {
    strncpy_s(mmkv_name, QMPC_FN12_MMKV_NAME_BUFF_LEN, params.res_mmkv_name, QMPC_FN12_MMKV_NAME_BUFF_LEN - 1);
    strncpy_s(mmkv_key, QMPC_FN12_MMKV_KEY_BUF_LEN, params.res_mmkv_key, QMPC_FN12_MMKV_KEY_ACTUAL_LEN);
    qmpc_log_trace("qmpc_fn12_call ok");
  } else {
    memset(mmkv_name, 0, QMPC_FN12_MMKV_NAME_BUFF_LEN);
    memset(mmkv_key, 0, QMPC_FN12_MMKV_KEY_BUF_LEN);
    qmpc_log_trace("qmpc_fn12_call failed");
  }

  return ok;
}
