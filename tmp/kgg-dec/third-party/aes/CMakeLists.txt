cmake_minimum_required(VERSION 3.10)

project(libaes VERSION 0.0.1 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

set(SOURCES)
if (USE_WIN_CRYPTO)
    message("Using Windows Crypto API for AES-CBC-128")
    list(APPEND SOURCES aes_win32.cpp)
elseif (USE_OPENSSL)
    message("Using OpenSSL API for AES-CBC-128")
    find_package(OpenSSL REQUIRED)    
    list(APPEND SOURCES aes_openssl.cpp)
else ()
    # Tiny AES in C (https://github.com/kokke/tiny-AES-c/)
    #   is licensed under the Unlicense license.
    message("Using included AES-CBC-128 implementation")
    list(APPEND SOURCES aes.cpp)
endif ()

add_library(libaes STATIC ${SOURCES})
target_include_directories(libaes
        PUBLIC
        "$<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}>"
        "$<INSTALL_INTERFACE:${CMAKE_INSTALL_INCLUDEDIR}>"
)
if (USE_WIN_CRYPTO)
    target_link_libraries(libaes PRIVATE bcrypt)
    target_compile_definitions(libaes PRIVATE USE_WIN_CRYPTO=1)
elseif (USE_OPENSSL)
    target_link_libraries(libaes PRIVATE OpenSSL::Crypto)
    target_compile_definitions(libaes PRIVATE USE_OPENSSL=1)
endif ()
