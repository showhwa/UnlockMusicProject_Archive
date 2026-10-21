#pragma once

/* QMPC_BUILDING: compiling shared libqmpc (MSVC export). QMPC_STATIC: static link. */
#if defined(_MSC_VER)
#  if defined(QMPC_STATIC)
#    define QMPC_API
#  elif defined(QMPC_BUILDING)
#    define QMPC_API __declspec(dllexport)
#  else
#    define QMPC_API __declspec(dllimport)
#  endif
#elif defined(__GNUC__)
#  define QMPC_API __attribute__((visibility("default")))
#else
#  define QMPC_API
#endif
