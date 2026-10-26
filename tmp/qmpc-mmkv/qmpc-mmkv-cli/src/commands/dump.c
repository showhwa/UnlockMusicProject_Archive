#include "src/commands.h"
#include "src/utils/file_writer.h"

#include <libqmpc/common_function/cf12.h>
#include <libqmpc/mmkv/cipher.h>
#include <libqmpc/mmkv/reader.h>

#include <stc/cstr.h>

#include <unistd.h>

int qmpc_command_dump(const qmpc_command_args* args) {
  int rc = 0;

  qmpc_log_verbose("Opening output file: %s", args->output);
  c_with(file_writer_t w = {}, file_writer_drop(&w)) {
    if (!file_writer_init_from_path(&w, args->output)) {
      rc = 1;
      qmpc_log_error("Failed to open output file: %s", args->output);
      continue;
    }
    c_with(cstr mmkv_path = cstr_init(), cstr_drop(&mmkv_path)) {
      c_with(cstr mmkv_key = cstr_init(), cstr_drop(&mmkv_key)) {
        // Prioritize command line arguments over cf12.
        if (args->input && args->key) {
          cstr_assign(&mmkv_key, args->key);
          cstr_assign(&mmkv_path, args->input);
        } else {
          c_with(qmpc_cf12_t cf12 = {}, qmpc_cf12_drop(&cf12)) {
            qmpc_cf12_init(&cf12);
            if (!qmpc_cf12_get(&cf12, args->mmkv_key_method)) {
              rc = 6;
              qmpc_log_error("Failed to get cf12");
              continue;
            }

            cstr_assign_sv(&mmkv_key, args->key ? csview_from(args->key) : cstr_sv(&cf12.mmkv_key));
            cstr_assign_sv(&mmkv_path, args->input ? csview_from(args->input) : cstr_sv(&cf12.mmkv_path));
          }  // cf12_t cf12
          if (rc) continue;
        }

        qmpc_log_verbose("Initializing mmkv cipher...");
        c_with(qmpc_mmkv_cipher_reader_t r, qmpc_mmkv_cipher_reader_drop(&r)) {
          if (!qmpc_mmkv_cipher_reader_init_from_path(&r, cstr_sv(&mmkv_path), cstr_sv(&mmkv_key))) {
            rc = 2;
            qmpc_log_error("Failed to initialize mmkv cipher reader");
            continue;
          }

          qmpc_mmkv_reader_source_t mmkv_source = {
              .ctx_ = &r,
              .read_ = (qmpc_mmkv_reader_fn_read_t)qmpc_mmkv_cipher_reader_read,
              .eof_ = (qmpc_mmkv_reader_fn_eof_t)qmpc_mmkv_cipher_reader_eof,
          };

          c_with(mmkv_reader_adapter_t adapter = {}, mmkv_reader_adapter_drop(&adapter)) {
            qmpc_log_verbose("Initializing mmkv reader adapter...");
            if (!mmkv_reader_adapter_init(&adapter, args->adapter_type, &mmkv_source, &w)) {
              rc = 3;
              qmpc_log_error("Failed to initialize mmkv reader adapter");
              continue;
            }
            qmpc_log_verbose("Decrypting mmkv to output...");
            if (!mmkv_reader_adapter_pipe(&adapter)) {
              rc = 4;
              qmpc_log_error("Failed to pipe mmkv to output.");
              continue;
            }
          }

          if (rc == 0) {
            if (!qmpc_mmkv_cipher_reader_crc_valid(&r)) {
              qmpc_log_error("Dump error: CRC mismatch (expected: 0x%08x, actual: 0x%08x)", r.crc32_, r.crc32_rolling_);
              rc = 5;
            }
          }  // if (rc == 0)
        }  // qmpc_mmkv_cipher_reader_t r
      }  // cstr input_path
    }  // cstr key

    if (rc != 0) file_writer_unlink(&w);
  }  // file_writer_t w

  if (rc == 0) {
    qmpc_log_info("Dump completed successfully.");
  } else {
    qmpc_log_error("Dump completed with error (code=%d).", rc);
  }

  return rc;
}
