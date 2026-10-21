#pragma once

#include <stddef.h>
#include <stdint.h>

/**
 * Computes a CRC-32/ISO-HDLC hash compatible with ntdll RtlComputeCrc32.
 * @param buffer The memory region to hash (may be NULL when length is 0).
 * @param length The length of the memory region.
 * @param initial_crc The initial CRC32 value; start from 0 for a fresh digest.
 * @return The CRC32 hash of the memory region.
 */
uint32_t qmpc_hash_crc32(const void* buffer, size_t length, uint32_t initial_crc);
