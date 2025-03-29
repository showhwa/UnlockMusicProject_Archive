cmake_minimum_required(VERSION 3.10)

project(sqlite VERSION 0.0.1 LANGUAGES C)

# SQLite3 is in the public domain, see https://www.sqlite.org/copyright.html
add_library(sqlite3 STATIC sqlite-amalgamation-3470200/sqlite3.c)
target_include_directories(sqlite3
        PUBLIC
        "$<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/sqlite-amalgamation-3470200>"
        "$<INSTALL_INTERFACE:${CMAKE_INSTALL_INCLUDEDIR}>"
)
