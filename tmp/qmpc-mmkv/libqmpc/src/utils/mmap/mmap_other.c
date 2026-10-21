#define _POSIX_C_SOURCE 200809L

#include <libqmpc/utils/mmap.h>

#include <fcntl.h>
#include <string.h>
#include <sys/mman.h>
#include <sys/stat.h>
#include <unistd.h>

bool qmpc_mmap_init(qmpc_mmap_t* self, const char* path) {
  memset(self, 0, sizeof(*self));
  self->os_file_ = -1;

  const int fd = open(path, O_RDONLY);
  if (fd < 0) {
    return false;
  }

  struct stat st;
  if (fstat(fd, &st) != 0 || st.st_size < 0) {
    close(fd);
    return false;
  }

  const size_t size = (size_t)st.st_size;
  uint8_t* view = NULL;
  if (size > 0) {
    void* mapped = mmap(NULL, size, PROT_READ, MAP_PRIVATE, fd, 0);
    close(fd);
    if (mapped == MAP_FAILED) {
      return false;
    }
    view = (uint8_t*)mapped;
  } else {
    close(fd);
  }

  self->data = view;
  self->size = size;
  self->writeable_ = false;
  self->os_file_ = -1;
  return true;
}

bool qmpc_mmap_init_writable(qmpc_mmap_t* self, const char* path, size_t size) {
  memset(self, 0, sizeof(*self));
  self->os_file_ = -1;

  const int fd = open(path, O_RDWR | O_CREAT | O_TRUNC, 0644);
  if (fd < 0) {
    return false;
  }

  if (ftruncate(fd, (off_t)size) != 0) {
    close(fd);
    return false;
  }

  uint8_t* view = NULL;
  if (size > 0) {
    void* mapped = mmap(NULL, size, PROT_READ | PROT_WRITE, MAP_SHARED, fd, 0);
    if (mapped == MAP_FAILED) {
      close(fd);
      return false;
    }
    view = (uint8_t*)mapped;
  }

  self->data = view;
  self->size = size;
  self->writeable_ = true;
  self->os_file_ = fd;
  return true;
}

bool qmpc_mmap_flush(qmpc_mmap_t* self) {
  if (!self->writeable_ || self->data == NULL || self->size == 0) {
    return true;
  }

  if (msync(self->data, self->size, MS_SYNC) != 0) {
    return false;
  }

  if (self->os_file_ >= 0 && fsync(self->os_file_) != 0) {
    return false;
  }
  return true;
}

void qmpc_mmap_drop(qmpc_mmap_t* self) {
  (void)qmpc_mmap_flush(self);

  if (self->data != NULL && self->size > 0) {
    munmap(self->data, self->size);
  }
  if (self->os_file_ >= 0) {
    close(self->os_file_);
  }
  memset(self, 0, sizeof(*self));
  self->os_file_ = -1;
}
