#include "commands.h"

#include <stdio.h>
#include <string.h>

#include <stc/coption.h>
#include <stc/cstr.h>

#ifndef QMPC_VERSION
#define QMPC_VERSION "0.0.0"
#define QMPC_COMMIT "dev"
#endif

static void banner(FILE* stream) {
  fputs(
      "#\n"
      "# This software is provided as is, without any warranty.\n"
      "# If you would like to support the artists,              \n"
      "#   please consider purchasing their music directly.     \n"
      "#\n"
      "# For more information, see:\n"
      "#   https://git.um-react.app/um/qmpc-mmkv-cli\n"
      "\n",
      stream);
}

void usage(const char* program) {
  fprintf(stderr, "usage: %s [options]\n", program);
  fputs(
      "\n"
      "options:\n"
      "  -h, --help\t\tshow this help message and exit\n"
      "  -v, --verbose\t\tenable verbose output\n"
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

int main(int argc, char* argv[]) {
  fprintf(stderr, "# QMPC MMKV Cli by LSR@UnlockMusic (v%s-%s)\n", QMPC_VERSION, QMPC_COMMIT);
  const char* command = "dump";
  const char* output = "qmpc-mmkv-v1.mmkv";
  const char* adapter_type = "raw";
  const char* input = NULL;
  const char* key = NULL;
  bool verbose = false;
  coption_long longopts[] = {{"verbose", coption_no_argument, 'v'},
                             {"command", coption_required_argument, 'c'},
                             {"input", coption_required_argument, 'i'},
                             {"key", coption_required_argument, 'k'},
                             {"output", coption_required_argument, 'o'},
                             {"format", coption_required_argument, 'f'},
                             {}};
  const char* shortopts = "hvc:i:k:o:f:";
  coption opt = coption_init();
  int c;
  while ((c = coption_get(&opt, argc, argv, shortopts, longopts)) != -1) {
    switch (c) {
      case 'h':
        banner(stderr);
        usage(argv[0]);
        return 0;
      case '?':
        printf("error: unknown option: %s\n", opt.optstr);
        usage(argv[0]);
        return 1;
      case ':':
        printf("error: missing argument for %s\n", opt.optstr);
        usage(argv[0]);
        return 1;
      case 'v':
        verbose = true;
        break;
      case 'c':
        command = opt.arg;
        break;
      case 'o':
        output = opt.arg;
        break;
      case 'i':
        input = opt.arg;
        break;
      case 'k':
        key = opt.arg;
        break;
      case 'f':
        adapter_type = opt.arg;
        break;
      default:
        fprintf(stderr, "error: unhandled option: %c-%s\n", c, opt.optstr);
        return 1;
    }
  }

  if (verbose) banner(stdout);

  qmpc_command_args args = {
      .input = input,
      .key = key,
      .output = output,
      .verbose = verbose,
      .adapter_type = mmkv_reader_adapter_type_from_string(adapter_type),
  };

  if (strcmp(command, "dump") == 0) {
    return qmpc_command_dump(&args);
  } else if (strcmp(command, "system-id") == 0) {
    return qmpc_command_system_id(&args);
  } else {
    printf("unknown command: %s\n", command);
    return 1;
  }

  return 0;
}
