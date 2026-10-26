#include "hwid/hex_helper.h"
#include "hwid_win/net/internal.h"
#include "libqmpc/log.h"

#include <stc/cstr.h>

#include <windows.h>
#include <iphlpapi.h>
#include <lm.h>

#define QMPC_REG_NETWORK_PATH "System\\CurrentControlSet\\Control\\Network\\{4D36E972-E325-11CE-BFC1-08002BE10318}"
#define QMPC_ADAPTER_LENGTH (0x2880)

enum QMPC_NET_MEDIA_SUBTYPE {
  // MediaSubType Values
  QMPC_NET_MEDIA_SUBTYPE_UNKNOWN = 0,
  QMPC_NET_MEDIA_SUBTYPE_ETHERNET = 1,
  QMPC_NET_MEDIA_SUBTYPE_WIRELESS = 2
};

static bool is_mac_empty(const char* mac) {
  // Check if mac is 6 zeros.
  return c_memcmp(mac, "\0\0\0\0\0", 6) == 0;
}

struct qmpc_net_connections {
  HKEY reg_net_;
  PIP_ADAPTER_INFO curr_;
  void* adapter_buffer_;
};

struct qmpc_net_connection_iter {
  uint32_t rank_;
  uint8_t mac_[6];
  bool is_ethernet_;
};

bool qmpc_net_connections_init(struct qmpc_net_connections* self) {
  memset(self, 0, sizeof(*self));

  ULONG cbSize = QMPC_ADAPTER_LENGTH;
  void* buffer = malloc(cbSize);
  if (buffer == nullptr) {
    return false;
  }

  // Quirk: Do not retry on ERROR_BUFFER_OVERFLOW to simulate QQMusic client behavior.
  if (GetAdaptersInfo((PIP_ADAPTER_INFO)buffer, &cbSize) != ERROR_SUCCESS) {
    free(buffer);
    return false;
  }

  if (ERROR_SUCCESS != RegOpenKeyExA(HKEY_LOCAL_MACHINE, QMPC_REG_NETWORK_PATH, 0, KEY_READ, &self->reg_net_)) {
    free(buffer);
    return false;
  }

  self->adapter_buffer_ = buffer;
  self->curr_ = (PIP_ADAPTER_INFO)buffer;
  return true;
}

static bool qmpc_net_connections_dtor(struct qmpc_net_connections* self) {
  free(self->adapter_buffer_);
  return RegCloseKey(self->reg_net_) == ERROR_SUCCESS;
}

static bool qmpc_net_connections_end(struct qmpc_net_connections* self) { return self->curr_ == NULL; }

static bool reg_read_dword(HKEY reg_key, const char* name, DWORD* out) {
  DWORD reg_type = REG_DWORD;
  DWORD dataLen = sizeof(*out);
  return RegQueryValueExA(reg_key, name, 0, &reg_type, (LPBYTE)out, &dataLen) == ERROR_SUCCESS;
}

static bool reg_read_string(HKEY reg_key, const char* name, char* out, isize_t len) {
  DWORD reg_type = REG_SZ;
  DWORD dataLen = (DWORD)len;
  return RegQueryValueExA(reg_key, name, 0, &reg_type, (LPBYTE)out, &dataLen) == ERROR_SUCCESS;
}

static bool qmpc_net_connections_read(struct qmpc_net_connections* self, struct qmpc_net_connection_iter* iter) {
  if (qmpc_net_connections_end(self)) {
    return false;
  }

  memset(iter, 0, sizeof(*iter));

  uint32_t rank = 3;
  char buf_conn_key[260] = {};
  _snprintf_s(buf_conn_key, sizeof(buf_conn_key), sizeof(buf_conn_key) - 1, "%s\\Connection", self->curr_->AdapterName);
  c_with(HKEY reg_conn, RegOpenKeyExA(self->reg_net_, buf_conn_key, 0, KEY_READ, &reg_conn) == ERROR_SUCCESS,
         RegCloseKey(reg_conn)) {
    DWORD media_sub_type = 0;
    char pnp_instance_id[260] = {};

    // rank: Ethernet(PCI) > Non-Wireless > USB Ethernet > WiFi
    if (reg_read_dword(reg_conn, "MediaSubType", &media_sub_type) &&
        reg_read_string(reg_conn, "PnpInstanceID", pnp_instance_id, sizeof(pnp_instance_id) - 1)) {
      if (media_sub_type == QMPC_NET_MEDIA_SUBTYPE_ETHERNET) {
        rank = strncmp(pnp_instance_id, "PCI", 3) == 0 ? 0 : 2;
      } else {
        rank = media_sub_type != QMPC_NET_MEDIA_SUBTYPE_WIRELESS ? 3 : 1;
      }
      qmpc_log_trace("connection %s: rank=%d, media_sub_type=%d, pnp_instance_id=%s", self->curr_->AdapterName, rank,
                     (int)media_sub_type, pnp_instance_id);
    }
  }

  iter->rank_ = rank;
  iter->is_ethernet_ = self->curr_->Type == MIB_IF_TYPE_ETHERNET;
  memcpy(iter->mac_, self->curr_->Address, sizeof(iter->mac_));

  return true;
}

static bool qmpc_net_connections_next(struct qmpc_net_connections* self) {
  if (qmpc_net_connections_end(self)) {
    return false;
  }
  self->curr_ = self->curr_->Next;
  return true;
}

bool qmpc_hwid_net_ethernet(cstr* out) {
  char mac[6] = {};
  uint32_t rank = 3;
  c_with(struct qmpc_net_connections conns = {}, qmpc_net_connections_init(&conns), qmpc_net_connections_dtor(&conns)) {
    for (struct qmpc_net_connection_iter it = {}; qmpc_net_connections_read(&conns, &it);
         qmpc_net_connections_next(&conns)) {
      if (is_mac_empty(mac) || (it.is_ethernet_ && it.rank_ < rank)) {
        rank = it.rank_;
        memcpy(mac, it.mac_, sizeof(mac));
      }
    }
  }

  if (is_mac_empty(mac)) {
    cstr_clear(out);
    return false;
  }
  qmpc_hwid_to_hex_lower(out, mac, sizeof(mac));
  return true;
}
