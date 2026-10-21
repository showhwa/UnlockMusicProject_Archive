#pragma once

#include <libqmpc/mmkv/reader.h>

#include "file_writer.h"

typedef enum {
  MMKV_READER_ADAPTER_TYPE_INVALID,
  MMKV_READER_ADAPTER_TYPE_RAW,
  MMKV_READER_ADAPTER_TYPE_PLAINTEXT,
} mmkv_reader_adapter_type_t;

static inline mmkv_reader_adapter_type_t mmkv_reader_adapter_type_from_string(const char* str) {
  if (strcmp(str, "raw") == 0) return MMKV_READER_ADAPTER_TYPE_RAW;
  if (strcmp(str, "plaintext") == 0) return MMKV_READER_ADAPTER_TYPE_PLAINTEXT;
  return MMKV_READER_ADAPTER_TYPE_INVALID;
}

typedef struct mmkv_reader_adapter {
  bool (*pipe)(struct mmkv_reader_adapter* self);
  mmkv_reader_adapter_type_t type_;
  qmpc_mmkv_reader_t mmkv_reader_;
  qmpc_mmkv_reader_source_t* r_;
  file_writer_t* w_;
} mmkv_reader_adapter_t;

bool mmkv_reader_adapter_pipe__raw(mmkv_reader_adapter_t* self);
bool mmkv_reader_adapter_pipe__plaintext(mmkv_reader_adapter_t* self);

static inline bool mmkv_reader_adapter_init(mmkv_reader_adapter_t* self, mmkv_reader_adapter_type_t type,
                                            qmpc_mmkv_reader_source_t* r, file_writer_t* w) {
  memset(self, 0, sizeof(*self));
  self->type_ = type;
  self->r_ = r;
  self->w_ = w;
  switch (self->type_) {
    case MMKV_READER_ADAPTER_TYPE_RAW:
      self->pipe = mmkv_reader_adapter_pipe__raw;
      break;
    case MMKV_READER_ADAPTER_TYPE_PLAINTEXT:
      self->pipe = mmkv_reader_adapter_pipe__plaintext;
      qmpc_mmkv_reader_init(&self->mmkv_reader_, r);
      break;
    default:
      return false;
  }
  return true;
}

static inline bool mmkv_reader_adapter_pipe(mmkv_reader_adapter_t* self) { return self->pipe(self); }

void mmkv_reader_adapter_drop(mmkv_reader_adapter_t* self);
