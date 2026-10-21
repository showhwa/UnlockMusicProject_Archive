#include <unistd.h>
#include "../commands.h"
#include "libqmpc/mmkv/cipher.h"
#include "libqmpc/mmkv/reader.h"
#include "src/utils/file_writer.h"

#include <libqmpc/hwid.h>
#include <libqmpc/common_function/ordinal_12.h>

#include <stc/cstr.h>

#include <stdio.h>

#define VERBOSE_PRINT(fmt, ...)                                     \
  do {                                                              \
    if (args->verbose) {                                            \
      fprintf(stderr, "[VERBOSE] " fmt __VA_OPT__(, ) __VA_ARGS__); \
    }                                                               \
  } while (0)

static void load_params(const qmpc_command_args* args, cstr* key, cstr* input_path) {
  VERBOSE_PRINT("Retrieving system id...\n");
  c_with(cstr system_id = qmpc_hwid_system_id(), cstr_drop(&system_id)) {
    VERBOSE_PRINT("system_id: %s\n", cstr_str(&system_id));
    if (args->input) {
      cstr_assign(input_path, args->input);
    } else {
      c_with(cstr name = qmpc_mmkv_system_id_to_name(cstr_str(&system_id)), cstr_drop(&name)) {
        c_with(cstr dirname = qmpc_get_appdata_dir(), cstr_drop(&dirname)) {
          cstr_assign_sv(input_path, cstr_sv(&dirname));
          cstr_append_s(input_path, name);
        }
      }
    }
    VERBOSE_PRINT("     path: %s\n", cstr_str(input_path));

    if (args->key) {
      cstr_assign(key, args->key);
    } else {
      cstr_drop(key);
      *key = qmpc_mmkv_system_id_to_key(cstr_str(&system_id));
    }
    VERBOSE_PRINT("      key: %s\n", cstr_str(key));
  }  // system_id
}

int qmpc_command_dump(const qmpc_command_args* args) {
  int rc = 0;

  VERBOSE_PRINT("Opening output file: %s\n", args->output);
  c_with(file_writer_t w = {}, file_writer_drop(&w)) {
    if (!file_writer_init_from_path(&w, args->output)) {
      rc = 1;
      fprintf(stderr, "[ERROR] Failed to open output file: %s\n", args->output);
      continue;
    }
    c_with(cstr key = cstr_init(), cstr_drop(&key)) {
      c_with(cstr input_path = cstr_init(), cstr_drop(&input_path)) {
        load_params(args, &key, &input_path);

        VERBOSE_PRINT("Initializing mmkv cipher...\n");
        c_with(qmpc_mmkv_cipher_reader_t r, qmpc_mmkv_cipher_reader_drop(&r)) {
          if (!qmpc_mmkv_cipher_reader_init_from_path(&r, cstr_sv(&input_path), cstr_sv(&key))) {
            rc = 2;
            fprintf(stderr, "[ERROR] Failed to initialize mmkv cipher reader\n");
            continue;
          }

          qmpc_mmkv_reader_source_t mmkv_source = {
              .ctx_ = &r,
              .read_ = (qmpc_mmkv_reader_fn_read_t)qmpc_mmkv_cipher_reader_read,
              .eof_ = (qmpc_mmkv_reader_fn_eof_t)qmpc_mmkv_cipher_reader_eof,
          };

          c_with(mmkv_reader_adapter_t adapter = {}, mmkv_reader_adapter_drop(&adapter)) {
            VERBOSE_PRINT("Initializing mmkv reader adapter...\n");
            if (!mmkv_reader_adapter_init(&adapter, args->adapter_type, &mmkv_source, &w)) {
              rc = 3;
              fprintf(stderr, "[ERROR] Failed to initialize mmkv reader adapter\n");
              continue;
            }
            VERBOSE_PRINT("Decrypting mmkv to output...\n");
            if (!mmkv_reader_adapter_pipe(&adapter)) {
              rc = 4;
              fprintf(stderr, "[ERROR] Failed to pipe mmkv to output.\n");
              continue;
            }
          }

          if (rc == 0) {
            if (qmpc_mmkv_cipher_reader_crc_valid(&r)) {
              fprintf(stderr, "[INFO] Dump OK.\n");
            } else {
              fprintf(stderr, "[ERROR] CRC mismatch (expected: 0x%08x, actual: 0x%08x)\n", r.crc32_, r.crc32_rolling_);
              rc = 5;
            }
          }  // if (rc == 0)
        }  // qmpc_mmkv_cipher_reader_t r
      }  // cstr input_path
    }  // cstr key

    if (rc != 0) file_writer_unlink(&w);
  }  // file_writer_t w

  fprintf(stderr, "[INFO] Dump completed %s (code=%d).\n", rc == 0 ? "successfully" : "with error", rc);

  return rc;
}
