#pragma once

#include <stdio.h>
#include <stdbool.h>
#include <stc/cstr.h>

typedef struct {
  FILE* fp;
  bool is_file;
  cstr path;
} file_writer_t;

bool file_writer_init_from_path(file_writer_t* self, const char* path);
bool file_writer_init_from_pipe(file_writer_t* self, FILE* fp);
void file_writer_unlink(file_writer_t* self);
void file_writer_drop(file_writer_t* self);
