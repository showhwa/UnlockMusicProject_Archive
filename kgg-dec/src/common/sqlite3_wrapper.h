#pragma once

#if __has_include(<sqlite3.h>)
#include <sqlite3.h>
#else
#include <winsqlite/winsqlite3.h>
#endif
