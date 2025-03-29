cmake_minimum_required(VERSION 3.14)

project(kgg-dec VERSION 0.6.1 LANGUAGES CXX)

option(USE_SYSTEM_SQLITE3 "Use system SQLite3 (if not using WinSQLite3)" ON)
option(USE_OPENSSL "Use OpenSSL API (if not using WinCrypto API)" ON)

if(WIN32)
    option(USE_WIN_SQLITE3 "Use Windows SQLite3 (MSVC Only)" ${MSVC})
    option(USE_WIN_CRYPTO "Use Windows Crypto API" ${WIN32})
else()
    set(USE_WIN_SQLITE3 OFF)
    set(USE_WIN_CRYPTO OFF)
endif()

# Setup CryptoAPI
if (NOT USE_WIN_CRYPTO AND USE_OPENSSL)
    find_package(OpenSSL REQUIRED)
endif()

include(cmake/SetupSQLite3.cmake)
add_subdirectory(third-party/aes)
add_subdirectory(third-party/md5)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

add_executable(kgg-dec
        src/main.cpp
        src/common/base64.cpp
        src/infra/infra.cpp
        src/tc_tea/tc_tea.cpp
        src/qmc2/ekey.cpp
        src/qmc2/qmc2_factory.cpp
        src/qmc2/qmc2_map.cpp
        src/qmc2/qmc2_rc4.cpp
        src/utils/cli.cpp
)

target_include_directories(kgg-dec
        PRIVATE
        src/common
        src/tc_tea
)

# Base crypto implementations
target_link_libraries(kgg-dec PRIVATE libaes libmd5)
if (USE_WIN_CRYPTO)
    target_compile_definitions(kgg-dec PRIVATE USE_WIN_CRYPTO=1)
elseif(USE_OPENSSL)
    target_compile_definitions(kgg-dec PRIVATE USE_OPENSSL=1)
endif ()

# Win32 specific
if (WIN32)
    target_link_libraries(kgg-dec PRIVATE shell32 ole32)
    target_compile_definitions(kgg-dec PRIVATE NOMINMAX)
endif ()

# SQLite3
if (WinSQLite3_Found)
    target_link_libraries(kgg-dec PRIVATE WinSQLite3)
    target_include_directories(kgg-dec PRIVATE ${WindowsKitInclude})
elseif(SQLite3_FOUND)
    target_link_libraries(kgg-dec PRIVATE SQLite::SQLite3)
else ()
    target_link_libraries(kgg-dec PRIVATE sqlite3)
endif ()

# Extra definitions
target_compile_definitions(kgg-dec PRIVATE KGGDEC_PROJECT_VERSION="${PROJECT_VERSION}")
