#pragma once

#include <stc/cstr.h>

#define i_pro_key cstr
#include <stc/vec.h>

/**
 * Convert the command line arguments to UTF-8.
 * @param argc The number of arguments (unused in Windows).
 * @param argv The arguments (unused in Windows).
 * @return The UTF-8 arguments in a `vec_cstr`.
 */
vec_cstr qmpc_argv_u8(int argc, char** argv);
