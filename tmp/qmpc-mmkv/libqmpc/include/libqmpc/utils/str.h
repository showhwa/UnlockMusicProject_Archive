#pragma once

#include <string.h>

#ifdef _WIN32
#define qmpc_str_ieq(x, y) (_stricmp(x, y) == 0)
#define qmpc_str_ieqn(x, y, n) (_strnicmp(x, y, n) == 0)
#else
#include <strings.h>
#define qmpc_str_ieq(x, y) (strcasecmp(x, y) == 0)
#define qmpc_str_ieqn(x, y, n) (strncasecmp(x, y, n) == 0)
#endif

#define qmpc_str_eq(x, y) (strcmp(x, y) == 0)
#define qmpc_str_eqn(x, y, n) (strncmp(x, y, n) == 0)
