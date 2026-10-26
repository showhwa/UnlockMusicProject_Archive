#include "commands.h"
#include "libqmpc/log.h"
#include "libqmpc/utils/str.h"
#include "utils/args_u8.h"
#include "utils/terminal.h"

#include <stdio.h>
#include <string.h>

#include <stc/coption.h>
#include <stc/cstr.h>

#ifndef QMPC_VERSION
#define QMPC_VERSION "0.0.0"
#define QMPC_COMMIT "dev"
#endif

void usage(const char* program) {
  fprintf(stderr, "usage: %s [options]\n", program);
  fputs(
      "\n"
      "options:\n"
      "  -h, --help\t\tshow this help message and exit\n"
      "  -v, --verbose\t\tenable verbose output, short for \"--level verbose\"\n"
      "  -l, --level\t\tset log level, one of [trace, debug, verbose, info, warning, error, fatal] (default: info)\n"
      "  -c, --command\t\tcommand to execute, one of [dump, system-id] (default: dump)\n"
      "\n"
      "When \"command\" is \"dump\", the following options are available:\n"
      "  -i, --input\t\tinput file (default: derived from system-id)\n"
      "  -k, --key\t\tkey (16 chars) (default: derived from system-id)\n"
      "  -o, --output\t\toutput file (default: \"qmpc-mmkv-v1.mmkv\")\n"
      "              \t\tUse \"-\" to write to stdout.\n"
      "  -f, --format\t\tformat to use, one of [raw, plaintext] (default: raw)\n"
      "              \t\tWhen \"format\" is \"plaintext\", it will produce \"key\\nvalue\\n\" pairs.\n"
      "\n",
      stderr);
}

int main_u8(int argc, char* argv[]) {
  qmpc_logger_set_default_file_logger(stderr);

  qmpc_log_info("QMPC MMKV CLI by LSR@UnlockMusic (v%s [%s])", QMPC_VERSION, QMPC_COMMIT);

  const char* command = "dump";
  qmpc_command_args args = {
      .input = nullptr,
      .key = nullptr,
      .output = "qmpc-mmkv-v1.mmkv",
      .level = QMPC_LOGGER_LEVEL_DEFAULT,
      .adapter_type = MMKV_READER_ADAPTER_TYPE_RAW,
      .mmkv_key_method = QMPC_MMKV_KEY_METHOD_HWID,
  };
  coption_long longopts[] = {{"verbose", coption_no_argument, 'v'},
                             {"level", coption_required_argument, 'l'},
                             {"command", coption_required_argument, 'c'},
                             {"input", coption_required_argument, 'i'},
                             {"key", coption_required_argument, 'k'},
                             {"output", coption_required_argument, 'o'},
                             {"format", coption_required_argument, 'f'},
                             {"method", coption_required_argument, 'm'},
                             {}};
  const char* shortopts = "hvc:i:k:o:f:l:m:";
  coption opt = coption_init();
  int c;
  while ((c = coption_get(&opt, argc, argv, shortopts, longopts)) != -1) {
    switch (c) {
      case 'h':
        usage(argv[0]);
        return 0;
      case '?':
        qmpc_log_error("unknown option: %s", opt.optstr);
        usage(argv[0]);
        return 1;
      case ':':
        qmpc_log_error("missing argument for %s", opt.optstr);
        usage(argv[0]);
        return 1;
      case 'v':
        args.level = QMPC_LOGGER_LEVEL_VERBOSE;
        qmpc_logger_set_filter_level(QMPC_LOGGER_LEVEL_VERBOSE);
        break;
      case 'c':
        command = opt.arg;
        break;
      case 'o':
        args.output = opt.arg;
        break;
      case 'i':
        args.input = opt.arg;
        break;
      case 'k':
        args.key = opt.arg;
        break;
      case 'f':
        args.adapter_type = mmkv_reader_adapter_type_from_string(opt.arg);
        break;
      case 'l':
        if (!(args.level = qmpc_logger_string_to_level(opt.arg))) {
          qmpc_log_error("invalid log level (%s), using default level", opt.arg);
          args.level = QMPC_LOGGER_LEVEL_DEFAULT;
        }
        qmpc_logger_set_filter_level(args.level);
        break;
      case 'm':
        if (!(args.mmkv_key_method = qmpc_mmkv_key_method_from_str(opt.arg))) {
          qmpc_log_fatal("invalid mmkv key method (%s).", opt.arg);
          return 1;
        }
        break;
      default:
        qmpc_log_fatal("unhandled option: %c-%s", c, opt.optstr);
        return 1;
    }
  }

  qmpc_log_verbose(
      "\n"
      "This software is provided as is, without any warranty.\n"
      "If you would like to support the artists,              \n"
      "  please consider purchasing their music directly.     \n"
      "\n"
      "For more information, see:\n"
      "  https://git.um-react.app/um/qmpc-mmkv-cli\n");

  {
#define HANDLE_COMMAND(name, handler) \
  if (qmpc_str_ieq(command, name)) return handler(&args);

    // Register commands
    HANDLE_COMMAND("dump", qmpc_command_dump);
    HANDLE_COMMAND("system-id", qmpc_command_system_id);
#undef HANDLE_COMMAND
  }

  qmpc_log_error("unknown command: %s", command);
  return 1;
}

int main(int argc, char* argv[]) {
  qmpc_terminal_init();

  int rc = 0;
#if defined(_WIN32)
  c_with(char** argv_u8 = malloc((argc + 1) * sizeof(char*)), argv_u8, free(argv_u8)) {
    c_with(vec_cstr argv_vec = qmpc_argv_u8(argc, argv), vec_cstr_drop(&argv_vec)) {
      c_with(char** p = argv_u8, (void)0) {
        for (c_each(i, vec_cstr, argv_vec)) *p++ = cstr_data(i.ref);
        rc = main_u8(argc, argv_u8);
      }
    }
  }
#else
  rc = main_u8(argc, argv);
#endif
  return rc;
}
