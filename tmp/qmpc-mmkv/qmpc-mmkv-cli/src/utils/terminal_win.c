#include "utils/terminal.h"

#include <windows.h>

void qmpc_terminal_init() {
  SetConsoleOutputCP(CP_UTF8);
  SetConsoleCP(CP_UTF8);
}
