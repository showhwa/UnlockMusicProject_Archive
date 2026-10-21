#pragma once

#define QMPC_MIN(a, b) (((a) < (b)) ? (a) : (b))
#define QMPC_MAX(a, b) (((a) > (b)) ? (a) : (b))

#define QMPC_STR_EQ(a, b) (strcmp(a, b) == 0)
#define QMPC_STR_EQ_N(a, b, n) (strncmp(a, b, n) == 0)
