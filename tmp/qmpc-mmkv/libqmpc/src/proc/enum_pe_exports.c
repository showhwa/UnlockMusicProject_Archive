#include <stdint.h>
#include <stdio.h>
#include "libqmpc/proc.h"

#define i_type u16set, uint16_t
#include <stc/hset.h>

#define QMPC_PROC_VA(type, m, offset) ((type)(((uint8_t*)m) + (uintptr_t)(offset)))

#define QMPC_PROC_TO_EXPORT_DIR(type, m, pe) \
  QMPC_PROC_VA(type, m, (pe)->OptionalHeader.DataDirectory[IMAGE_DIRECTORY_ENTRY_EXPORT].VirtualAddress)

static inline PIMAGE_EXPORT_DIRECTORY qmpc_proc_to_export_dir(const void* m, const PIMAGE_NT_HEADERS pe) {
  if (pe->FileHeader.Machine == IMAGE_FILE_MACHINE_I386) {
    return QMPC_PROC_TO_EXPORT_DIR(PIMAGE_EXPORT_DIRECTORY, m, (PIMAGE_NT_HEADERS32)pe);
  } else if (pe->FileHeader.Machine == IMAGE_FILE_MACHINE_AMD64) {
    return QMPC_PROC_TO_EXPORT_DIR(PIMAGE_EXPORT_DIRECTORY, m, (PIMAGE_NT_HEADERS64)pe);
  } else {
    return nullptr;
  }
}

void qmpc_proc_enum_pe_exports(const void* module, qmpc_proc_enum_callback_t callback, void* user_data) {
  auto m = (const uint8_t*)module;
  auto dos_header = (PIMAGE_DOS_HEADER)(m);
  if (dos_header->e_magic != IMAGE_DOS_SIGNATURE) {
    return;
  }
  auto nt = (PIMAGE_NT_HEADERS)(m + dos_header->e_lfanew);
  if (nt->Signature != IMAGE_NT_SIGNATURE) {
    return;
  }

  auto export_dir = qmpc_proc_to_export_dir(m, nt);
  if (!export_dir) {
    return;
  }

  auto names = QMPC_PROC_VA(const uint32_t*, m, export_dir->AddressOfNames);
  auto ordinals = QMPC_PROC_VA(const uint16_t*, m, export_dir->AddressOfNameOrdinals);
  auto functions = QMPC_PROC_VA(const uint32_t*, m, export_dir->AddressOfFunctions);
  auto ord_base = (uint32_t)export_dir->Base;

  u16set s = u16set_init();
  for (size_t i = 0, n = export_dir->NumberOfNames; i < n; i++) {
    auto ord = ordinals[i];
    auto name = QMPC_PROC_VA(const char*, m, names[i]);
    auto addr = QMPC_PROC_VA(const void*, m, functions[ord]);
    if (callback(addr, name, ord_base + ord, user_data)) {
      u16set_drop(&s);
      return;
    }
    u16set_insert(&s, ord);
  }

  for (size_t i = 0, n = export_dir->NumberOfFunctions; i < n; i++) {
    auto ord = i;
    if (u16set_contains(&s, ord)) continue;

    auto addr = QMPC_PROC_VA(const void*, m, functions[ord]);
    if (callback(addr, nullptr, ord_base + ord, user_data)) {
      u16set_drop(&s);
      return;
    }
  }
  u16set_drop(&s);
}
