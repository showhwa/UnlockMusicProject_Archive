#include "utils/args_u8.h"

vec_cstr qmpc_argv_u8(int argc, char** argv) {
  vec_cstr argv_u8 = vec_cstr_with_capacity(argc);
  for (int i = 0; i < argc; i++) {
    vec_cstr_emplace(&argv_u8, argv[i]);
  }
  return argv_u8;
}
