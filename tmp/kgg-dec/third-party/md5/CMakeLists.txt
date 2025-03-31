cmake_minimum_required(VERSION 3.10)

project(md5 VERSION 0.0.1 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

set(SOURCES)
if (USE_WIN_CRYPTO)
    message("Using Windows Crypto API for MD5")
    list(APPEND SOURCES md5_win32.cpp)
elseif (USE_OPENSSL)
    message("Using OpenSSL API for MD5")
    find_package(OpenSSL REQUIRED)
    list(APPEND SOURCES md5_openssl.cpp)
else ()
    # Derived from the "RSA Data Security, Inc. MD5 Message-Digest Algorithm":
    # https://github.com/freebsd/freebsd-src/blob/release/14.2.0/sys/kern/md5c.c
    message("Using included MD5 implementation")
    list(APPEND SOURCES md5.cpp)
endif ()

add_library(libmd5 STATIC ${SOURCES})
target_include_directories(libmd5
        PUBLIC
        "$<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}>"
        "$<INSTALL_INTERFACE:${CMAKE_INSTALL_INCLUDEDIR}>"
)

if (USE_WIN_CRYPTO)
    target_link_libraries(libmd5 PRIVATE crypt32)
    target_compile_definitions(libmd5 PRIVATE USE_WIN_CRYPTO=1)
elseif (USE_OPENSSL)
    target_link_libraries(libmd5 PRIVATE OpenSSL::Crypto)
    target_compile_definitions(libmd5 PRIVATE USE_OPENSSL=1)
endif ()
