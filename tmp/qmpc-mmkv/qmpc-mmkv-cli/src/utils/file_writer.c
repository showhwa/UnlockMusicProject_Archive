#include "file_writer.h"

#include <stdio.h>
#include <stdbool.h>

bool file_writer_init_from_path(file_writer_t* self, const char* path) {
  if (path == NULL || (path[0] == '-' && path[1] == '\0')) {
    return file_writer_init_from_pipe(self, stdout);
  }
  self->fp = fopen(path, "wb");
  self->is_file = true;
  self->path = cstr_from(path);
  return self->fp != NULL;
}

bool file_writer_init_from_pipe(file_writer_t* self, FILE* fp) {
  self->fp = fp;
  self->is_file = false;
  return true;
}

void file_writer_drop(file_writer_t* self) {
  if (self->is_file) {
    fclose(self->fp);
  }
  cstr_drop(&self->path);
  memset(self, 0, sizeof(*self));
}

void file_writer_unlink(file_writer_t* self) {
  if (self->is_file) {
    fclose(self->fp);
    self->fp = NULL;
    remove(cstr_str(&self->path));
    self->is_file = false;
  }
}
