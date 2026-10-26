#include "libqmpc/proc.h"

#include <windows.h>

#include <tlhelp32.h>

void qmpc_proc_enum_process(qmpc_fn12_process_filter_fn filter, void* user_data) {
  PROCESSENTRY32 pe32;
  pe32.dwSize = sizeof(pe32);
  HANDLE snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
  if (snapshot != INVALID_HANDLE_VALUE) {
    if (Process32First(snapshot, &pe32)) {
      do {
        if (filter(&pe32, user_data)) break;
      } while (Process32Next(snapshot, &pe32));
    }
    CloseHandle(snapshot);
  }
}

void qmpc_proc_enum_module(uint32_t pid, qmpc_fn12_module_filter_fn filter, void* user_data) {
  MODULEENTRY32 me32;
  me32.dwSize = sizeof(me32);
  HANDLE snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPMODULE | TH32CS_SNAPMODULE32, pid);
  if (snapshot != INVALID_HANDLE_VALUE) {
    if (Module32First(snapshot, &me32)) {
      do {
        if (filter(&me32, user_data)) break;
      } while (Module32Next(snapshot, &me32));
    }
  }
  CloseHandle(snapshot);
}
