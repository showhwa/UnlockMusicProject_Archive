#include "hwid_win/net/internal.h"

#include <windows.h>
#include <lmwksta.h>

#include <iphlpapi.h>
#include <lm.h>
#include <stc/cstr.h>

static bool hex_w2a(char* result, wchar_t c) {
  if ((c >= L'0' && c <= L'9') || (c >= L'a' && c <= L'f'))
    *result = (char)c;
  else if (c >= L'A' && c <= L'F')
    *result = (char)(c - L'A' + L'a');
  else
    return false;
  return true;
}

static bool parse_mac(cstr* mac, const wchar_t* text) {
  uint8_t sum = 0;
  char mac_hex[12] = {};
  for (isize_t i = 0; i < 12; i += 2) {
    if (!hex_w2a(&mac_hex[i], *text++) || !hex_w2a(&mac_hex[i + 1], *text++)) {
      return false;
    }
    sum |= mac_hex[i] | mac_hex[i + 1];
  }

  // Rejest all zeros
  if (sum == '0') return false;

  cstr_assign_n(mac, mac_hex, 12);
  return true;
}

bool qmpc_hwid_net_netbios(cstr* out) {
  WKSTA_TRANSPORT_INFO_0* p_transports = nullptr;
  DWORD entriesread = 0;
  DWORD totalentries = 0;

  if (NetWkstaTransportEnum(nullptr, 0, (LPBYTE*)&p_transports, MAX_PREFERRED_LENGTH, &entriesread, &totalentries,
                            nullptr) != NERR_Success) {
    return false;
  }

  const WKSTA_TRANSPORT_INFO_0* p = p_transports;
  bool found = false;
  for (DWORD i = 0; i < entriesread; i++, p++) {
    if (parse_mac(out, p->wkti0_transport_address)) {
      found = true;
      break;
    }
  }
  NetApiBufferFree(p_transports);
  return found;
}
