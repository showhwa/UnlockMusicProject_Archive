#include "file_writer.h"

#include <libqmpc/utils/fs.h>
#if defined(_WIN32)
#include <libqmpc/utils/wstr.h>
#include <windows.h>
#endif

#include <stdio.h>
#include <stdbool.h>

bool file_writer_init_from_path(file_writer_t* self, const char* path) {
  if (path == NULL || (path[0] == '-' && path[1] == '\0')) {
    return file_writer_init_from_pipe(self, stdout);
  }
  self->fp = fopen_u8(path, "wb");
  if (self->fp == NULL) {
    return false;
  }
  self->is_file = true;
  self->path = cstr_from(path);
  return true;
}

bool file_writer_init_from_pipe(file_writer_t* self, FILE* fp) {
  self->fp = fp;
  self->is_file = false;
  return true;
}

void file_writer_drop(file_writer_t* self) {
  if (self->is_file && self->fp != NULL) {
    fclose(self->fp);
  }
  cstr_drop(&self->path);
  memset(self, 0, sizeof(*self));
}

void file_writer_unlink(file_writer_t* self) {
  if (self->is_file) {
    if (self->fp != NULL) {
      fclose(self->fp);
      self->fp = NULL;
    }
#if defined(_WIN32)
    c_with(vec_wstr p = qmpc_utf82wstr(cstr_sv(&self->path)), vec_wstr_drop(&p)) {
      if (vec_wstr_size(&p) > 0) {
        DeleteFileW(vec_wstr_at(&p, 0));
      }
    }
#else
    remove(cstr_str(&self->path));
#endif
    self->is_file = false;
  }
}
