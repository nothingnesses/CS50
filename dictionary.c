// Implements a dictionary's functionality

#include <stdbool.h>

#include "dictionary.h"
#include <sys/mman.h> // mmap
#include <errno.h> // errno
#include <string.h>   /* memcpy, tolower*/
#include <ctype.h> // tolower
#include <stdio.h> // printf
#include <sys/stat.h>  // open
#include <fcntl.h> // open
#include <unistd.h> // close
#include <strings.h> // strcasecmp

// 144000 for safety because amount of words in dictionary is ~143000.
#define MAX_WORD_COUNT 144000

// Represents a node in a hash table
typedef struct node
{
    int keys_index;
    struct node *next;
}
node;

/*
Use a power of 2 to make bitwise operation in `hash` funciton easier.
We're using 2^27 because it's the largest value that still compiles
*/
// Number of buckets in hash table
const unsigned int N = 134217728;

// Used to store pointers to the words in the `mmap`ed dictionary.
char *keys[MAX_WORD_COUNT];

// Index for nodes
int nodes_index = 0;

// Initialise memory for nodes so we don't have to malloc
node nodes[MAX_WORD_COUNT];

// Number of words
int word_count = 0;

// Hash table
node *table[N];

// Pointer to be used for the `mmap`ed dictionary file later on.
char *dictionary_pointer = NULL;

// Used for `munmap` later in `unload`
struct stat stat_buffer;

// Converts a string to lowercase
void lowercase(char *input, char *buffer, int input_length) {
    for (int word_index = 0; word_index < input_length; ++word_index) {
        buffer[word_index] = tolower(input[word_index]);
    }
    buffer[input_length] = '\0';
}

// Returns true if word is in dictionary else false
bool check(const char *word)
{
    // Convert word to lowercase, hash, etc.
    char lowercase_word[45] = "";
    lowercase((char *)word, lowercase_word, strlen(word));
    // Get the hash digest of the lowercased word
    int digest = hash(lowercase_word);
    // Check if bucket is empty
    if (table[digest] != NULL) {
      // This bucket isn't empty, iterate through linked list to find a match
      for (node *current_node = table[digest]; current_node != NULL; current_node = current_node->next) {
        if (strcasecmp(keys[current_node->keys_index], word) == 0) {
          return true;
        }
      }
      // Found no match
      return false;
    }
    // Bucket is empty
    return false;
}

/*
 * xxHash - Extremely Fast Hash algorithm
 * Copyright (C) 2019-2020 Yann Collet
 * Copyright (C) 2019-2020 Devin Hussey (easyaspi314)
 *
 * BSD 2-Clause License (https://www.opensource.org/licenses/bsd-license.php)
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *    * Redistributions of source code must retain the above copyright
 *      notice, this list of conditions and the following disclaimer.
 *    * Redistributions in binary form must reproduce the above
 *      copyright notice, this list of conditions and the following disclaimer
 *      in the documentation and/or other materials provided with the
 *      distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 * You can contact the author at:
 *   - xxHash homepage: https://www.xxhash.com
 *   - xxHash source repository: https://github.com/Cyan4973/xxHash
 */

/* A compact, 100% standalone reference XXH3_64bits implementation that focuses on clarity.
 * correctness, and portability, instead of dirty speed hacks.
 *
 * This file aims to be 100% compatible with C90 and C++ with the additional requirement of
 * stdint.h and long long.
 *
 * There is no self test at the moment as the official test values have not been updated
 * for the new algorithm. */

#include <stddef.h>   /* size_t */
#include <stdint.h>   /* uint8_t, uint32_t, uint64_t */

typedef uint64_t XXH64_hash_t;

#ifdef __cplusplus
extern "C" {
#endif
#define XXH3_SECRET_SIZE_MIN 136

XXH64_hash_t XXH3_64bits(void const *const input, size_t const length);
XXH64_hash_t XXH3_64bits_withSeed(void const *const input, size_t const length, XXH64_hash_t const seed);
XXH64_hash_t XXH3_64bits_withSecret(void const *const input, size_t const length, void const *const secret, size_t secret_size);

#ifdef __cplusplus
}
#endif

static uint32_t const PRIME32_1 = 0x9E3779B1U;   /* 0b10011110001101110111100110110001 */
static uint32_t const PRIME32_2 = 0x85EBCA77U;   /* 0b10000101111010111100101001110111 */
static uint32_t const PRIME32_3 = 0xC2B2AE3DU;   /* 0b11000010101100101010111000111101 */

static uint64_t const PRIME64_1 = 0x9E3779B185EBCA87ULL;   /* 0b1001111000110111011110011011000110000101111010111100101010000111 */
static uint64_t const PRIME64_2 = 0xC2B2AE3D27D4EB4FULL;   /* 0b1100001010110010101011100011110100100111110101001110101101001111 */
static uint64_t const PRIME64_3 = 0x165667B19E3779F9ULL;   /* 0b0001011001010110011001111011000110011110001101110111100111111001 */
static uint64_t const PRIME64_4 = 0x85EBCA77C2B2AE63ULL;   /* 0b1000010111101011110010100111011111000010101100101010111001100011 */
static uint64_t const PRIME64_5 = 0x27D4EB2F165667C5ULL;   /* 0b0010011111010100111010110010111100010110010101100110011111000101 */

/* Portably reads a 32-bit little endian integer from p. */
static uint32_t XXH_read32(uint8_t const *const p)
{
#if defined(_WIN32) || (defined(__BYTE_ORDER__) && __BYTE_ORDER__==__ORDER_LITTLE_ENDIAN__)
    uint32_t ret;
    memcpy(&ret, p, sizeof(uint32_t));
    return ret;
#else
    return (uint32_t)p[0]
        | ((uint32_t)p[1] << 8)
        | ((uint32_t)p[2] << 16)
        | ((uint32_t)p[3] << 24);
#endif
}

/* Portably reads a 64-bit little endian integer from p. */
static uint64_t XXH_read64(uint8_t const *const p)
{
#if defined(_WIN32) || (defined(__BYTE_ORDER__) && __BYTE_ORDER__==__ORDER_LITTLE_ENDIAN__)
    uint64_t ret;
    memcpy(&ret, p, sizeof(uint64_t));
    return ret;
#else
    return (uint64_t)p[0]
        | ((uint64_t)p[1] << 8)
        | ((uint64_t)p[2] << 16)
        | ((uint64_t)p[3] << 24)
        | ((uint64_t)p[4] << 32)
        | ((uint64_t)p[5] << 40)
        | ((uint64_t)p[6] << 48)
        | ((uint64_t)p[7] << 56);
#endif
}

/* Portably writes a 64-bit little endian integer to p. */
static void XXH_write64(uint8_t *const p, uint64_t val)
{
#if defined(_WIN32) || (defined(__BYTE_ORDER__) && __BYTE_ORDER__==__ORDER_LITTLE_ENDIAN__)
    memcpy(p, &val, sizeof(uint64_t));
#else
    p[0] = (uint8_t)(val >> 0);
    p[1] = (uint8_t)(val >> 8);
    p[2] = (uint8_t)(val >> 16);
    p[3] = (uint8_t)(val >> 24);
    p[4] = (uint8_t)(val >> 32);
    p[5] = (uint8_t)(val >> 40);
    p[6] = (uint8_t)(val >> 48);
    p[7] = (uint8_t)(val >> 56);
#endif
}

/* 32-bit byteswap */
static uint32_t XXH_swap32(uint32_t const x)
{
    return ((x << 24) & 0xff000000)
         | ((x <<  8) & 0x00ff0000)
         | ((x >>  8) & 0x0000ff00)
         | ((x >> 24) & 0x000000ff);
}

/* 32-bit byteswap */
static uint64_t XXH_swap64(uint64_t const x)
{
    return ((x << 56) & 0xff00000000000000ULL)
         | ((x << 40) & 0x00ff000000000000ULL)
         | ((x << 24) & 0x0000ff0000000000ULL)
         | ((x << 8)  & 0x000000ff00000000ULL)
         | ((x >> 8)  & 0x00000000ff000000ULL)
         | ((x >> 24) & 0x0000000000ff0000ULL)
         | ((x >> 40) & 0x000000000000ff00ULL)
         | ((x >> 56) & 0x00000000000000ffULL);
}

/* 64-bit rotate left */
static uint64_t XXH_rotl64(uint64_t const val, unsigned const amt)
{
    return (val << (amt % 64)) | (val >> (64 - amt % 64));
}

#define XXH_SECRET_DEFAULT_SIZE 192   /* minimum XXH3_SECRET_SIZE_MIN */

/* Pseudorandom data taken directly from FARSH */
static uint8_t const kSecret[XXH_SECRET_DEFAULT_SIZE] = {
    0xb8, 0xfe, 0x6c, 0x39, 0x23, 0xa4, 0x4b, 0xbe, 0x7c, 0x01, 0x81, 0x2c, 0xf7, 0x21, 0xad, 0x1c,
    0xde, 0xd4, 0x6d, 0xe9, 0x83, 0x90, 0x97, 0xdb, 0x72, 0x40, 0xa4, 0xa4, 0xb7, 0xb3, 0x67, 0x1f,
    0xcb, 0x79, 0xe6, 0x4e, 0xcc, 0xc0, 0xe5, 0x78, 0x82, 0x5a, 0xd0, 0x7d, 0xcc, 0xff, 0x72, 0x21,
    0xb8, 0x08, 0x46, 0x74, 0xf7, 0x43, 0x24, 0x8e, 0xe0, 0x35, 0x90, 0xe6, 0x81, 0x3a, 0x26, 0x4c,
    0x3c, 0x28, 0x52, 0xbb, 0x91, 0xc3, 0x00, 0xcb, 0x88, 0xd0, 0x65, 0x8b, 0x1b, 0x53, 0x2e, 0xa3,
    0x71, 0x64, 0x48, 0x97, 0xa2, 0x0d, 0xf9, 0x4e, 0x38, 0x19, 0xef, 0x46, 0xa9, 0xde, 0xac, 0xd8,
    0xa8, 0xfa, 0x76, 0x3f, 0xe3, 0x9c, 0x34, 0x3f, 0xf9, 0xdc, 0xbb, 0xc7, 0xc7, 0x0b, 0x4f, 0x1d,
    0x8a, 0x51, 0xe0, 0x4b, 0xcd, 0xb4, 0x59, 0x31, 0xc8, 0x9f, 0x7e, 0xc9, 0xd9, 0x78, 0x73, 0x64,

    0xea, 0xc5, 0xac, 0x83, 0x34, 0xd3, 0xeb, 0xc3, 0xc5, 0x81, 0xa0, 0xff, 0xfa, 0x13, 0x63, 0xeb,
    0x17, 0x0d, 0xdd, 0x51, 0xb7, 0xf0, 0xda, 0x49, 0xd3, 0x16, 0x55, 0x26, 0x29, 0xd4, 0x68, 0x9e,
    0x2b, 0x16, 0xbe, 0x58, 0x7d, 0x47, 0xa1, 0xfc, 0x8f, 0xf8, 0xb8, 0xd1, 0x7a, 0xd0, 0x31, 0xce,
    0x45, 0xcb, 0x3a, 0x8f, 0x95, 0x16, 0x04, 0x28, 0xaf, 0xd7, 0xfb, 0xca, 0xbb, 0x4b, 0x40, 0x7e,
};

/* Calculates a 64-bit to 128-bit unsigned multiply, then xor's the low bits of the product with
 * the high bits for a 64-bit result. */
static uint64_t XXH3_mul128_fold64(uint64_t const lhs, uint64_t const rhs)
{
#if defined(__SIZEOF_INT128__) || (defined(_INTEGRAL_MAX_BITS) && _INTEGRAL_MAX_BITS >= 128)
    __uint128_t product = (__uint128_t) lhs * (__uint128_t) rhs;
    return (uint64_t) (product & 0xFFFFFFFFFFFFFFFFULL) ^ (uint64_t) (product >> 64);

    /* There are other platform-specific versions in the official repo.
     * They would all be left out in favor of the code above, but it is not
     * portable, so we keep the generic version. */

#else /* Portable scalar version */
    /* First calculate all of the cross products. */
    uint64_t const lo_lo = (lhs & 0xFFFFFFFF) * (rhs & 0xFFFFFFFF);
    uint64_t const hi_lo = (lhs >> 32)        * (rhs & 0xFFFFFFFF);
    uint64_t const lo_hi = (lhs & 0xFFFFFFFF) * (rhs >> 32);
    uint64_t const hi_hi = (lhs >> 32)        * (rhs >> 32);

    /* Now add the products together. These will never overflow. */
    uint64_t const cross = (lo_lo >> 32) + (hi_lo & 0xFFFFFFFF) + lo_hi;
    uint64_t const upper = (hi_lo >> 32) + (cross >> 32)        + hi_hi;
    uint64_t const lower = (cross << 32) | (lo_lo & 0xFFFFFFFF);

    return upper ^ lower;
#endif
}

#define STRIPE_LEN 64
#define XXH_SECRET_CONSUME_RATE 8   /* nb of secret bytes consumed at each accumulation */
#define ACC_NB (STRIPE_LEN / sizeof(uint64_t))

/* Mixes up the hash to finalize */
static XXH64_hash_t XXH3_avalanche(uint64_t hash)
{
    hash ^= hash >> 37;
    hash *= 0x165667919E3779F9ULL;
    hash ^= hash >> 32;
    return hash;
}

/* ==========================================
 * Short keys
 * ========================================== */

/* Hashes zero-length keys */
static XXH64_hash_t XXH3_len_0_64b(uint8_t const *const secret, XXH64_hash_t const seed)
{
    uint64_t acc = seed;
    acc += PRIME64_1;
    acc ^= XXH_read64(secret + 56);
    acc ^= XXH_read64(secret + 64);
    return XXH3_avalanche(acc);
}

/* Hashes short keys from 1 to 3 bytes. */
static XXH64_hash_t XXH3_len_1to3_64b(uint8_t const *const input,
                                      size_t  const length,
                                      uint8_t const *const secret,
                                      XXH64_hash_t const seed)
{
    uint8_t  const byte1 = input[0];
    uint8_t  const byte2 = (length > 1) ? input[1] : input[0];
    uint8_t  const byte3 = input[length - 1];

    uint32_t const combined = ((uint32_t)byte1  << 16)
                            | ((uint32_t)byte2  << 24)
                            | ((uint32_t)byte3  <<  0)
                            | ((uint32_t)length <<  8);
    uint64_t acc = (uint64_t)(XXH_read32(secret) ^ XXH_read32(secret + 4));
    acc += seed;
    acc ^= (uint64_t)combined;
    acc *= PRIME64_1;
    return XXH3_avalanche(acc);
}

/* Hashes short keys from 4 to 8 bytes. */
static XXH64_hash_t XXH3_len_4to8_64b(uint8_t const *const input,
                                      size_t  const length,
                                      uint8_t const *const secret,
                                      XXH64_hash_t seed)
{
    uint32_t const input_hi = XXH_read32(input);
    uint32_t const input_lo = XXH_read32(input + length - 4);
    uint64_t const input_64 = (uint64_t)input_lo | ((uint64_t)input_hi << 32);
    uint64_t acc = XXH_read64(secret + 8) ^ XXH_read64(secret + 16);
    seed ^= (uint64_t)XXH_swap32(seed & 0xFFFFFFFF) << 32;
    acc -= seed;
    acc ^= input_64;
    /* rrmxmx mix, skips XXH3_avalanche */
    acc ^= XXH_rotl64(acc, 49) ^ XXH_rotl64(acc, 24);
    acc *= 0x9FB21C651E98DF25ULL;
    acc ^= (acc >> 35) + (uint64_t)length;
    acc *= 0x9FB21C651E98DF25ULL;
    acc ^= (acc >> 28);
    return acc;
}

/* Hashes short keys from 9 to 16 bytes. */
static XXH64_hash_t XXH3_len_9to16_64b(uint8_t const *const input,
                                       size_t  const length,
                                       uint8_t const *const secret,
                                       XXH64_hash_t const seed)
{
    uint64_t input_lo = XXH_read64(secret+24) ^ XXH_read64(secret+32);
    uint64_t input_hi = XXH_read64(secret+40) ^ XXH_read64(secret+48);
    uint64_t acc      = (uint64_t)length;
    input_lo += seed;
    input_hi -= seed;
    input_lo ^= XXH_read64(input);
    input_hi ^= XXH_read64(input + length - 8);
    acc      += XXH_swap64(input_lo);
    acc      += input_hi;
    acc      += XXH3_mul128_fold64(input_lo, input_hi);
    return XXH3_avalanche(acc);
}

/* Hashes short keys that are less than or equal to 16 bytes. */
static XXH64_hash_t XXH3_len_0to16_64b(uint8_t const *const input,
                                       size_t const length,
                                       uint8_t const *const secret,
                                       XXH64_hash_t const seed)
{
    if (length > 8)
        return XXH3_len_9to16_64b(input, length, secret, seed);
    else if (length >= 4)
        return XXH3_len_4to8_64b(input, length, secret, seed);
    else if (length != 0)
        return XXH3_len_1to3_64b(input, length, secret, seed);
    return XXH3_len_0_64b(secret, seed);
}

/* The primary mixer for the midsize hashes */
static uint64_t XXH3_mix16B(uint8_t const *const input,
                            uint8_t const *const secret,
                            XXH64_hash_t seed)
{
    uint64_t lhs = seed;
    uint64_t rhs = 0U - seed;
    lhs += XXH_read64(secret);
    rhs += XXH_read64(secret + 8);
    lhs ^= XXH_read64(input);
    rhs ^= XXH_read64(input + 8);
    return XXH3_mul128_fold64(lhs, rhs);
}

/* Hashes midsize keys from 17 to 128 bytes */
static XXH64_hash_t XXH3_len_17to128_64b(uint8_t const *const input,
                                         size_t const length,
                                         uint8_t const *const secret,
                                         XXH64_hash_t const seed)
{
    int i = (int)((length - 1) / 32);

    uint64_t acc = length * PRIME64_1;

    for (; i >= 0; i--) {
        acc += XXH3_mix16B(input + (16 * i),                secret + (32 * i),      seed);
        acc += XXH3_mix16B(input + length - (16 * (i + 1)), secret + (32 * i) + 16, seed);
    }
    return XXH3_avalanche(acc);
}

#define XXH3_MIDSIZE_MAX 240

/* Hashes midsize keys from 129 to 240 bytes */
static XXH64_hash_t XXH3_len_129to240_64b(uint8_t const *const input,
                                          size_t const length,
                                          uint8_t const *const secret,
                                          XXH64_hash_t const seed)
{

    #define XXH3_MIDSIZE_STARTOFFSET 3
    #define XXH3_MIDSIZE_LASTOFFSET  17

    uint64_t acc = (uint64_t)length * PRIME64_1;
    int const nbRounds = (int)length / 16;
    int i;
    for (i = 0; i < 8; i++) {
        acc += XXH3_mix16B(input + (16 * i), secret + (16 * i), seed);
    }

    acc = XXH3_avalanche(acc);

    for (i = 8; i < nbRounds; i++) {
        acc += XXH3_mix16B(input  + (16 * i),
                           secret + (16 * (i - 8))
                                  + XXH3_MIDSIZE_STARTOFFSET,
                           seed);
    }
    /* last bytes */
    acc += XXH3_mix16B(input + length - 16,
                       secret + XXH3_SECRET_SIZE_MIN
                              - XXH3_MIDSIZE_LASTOFFSET,
                       seed);
    return XXH3_avalanche(acc);
}

/* Hashes a short input, < 240 bytes */
static XXH64_hash_t XXH3_hashShort_64b(uint8_t const *const input,
                                       size_t const length,
                                       uint8_t const *const secret,
                                       XXH64_hash_t const seed)
{
    if (length <= 16)
        return XXH3_len_0to16_64b(input, length, secret, seed);
    if (length <= 128)
        return XXH3_len_17to128_64b(input, length, secret, seed);
    return XXH3_len_129to240_64b(input, length, secret, seed);
}

/* This is the main loop. This is usually written in SIMD code. */
static void XXH3_accumulate_512_64b(uint64_t *const acc,
                                    uint8_t const *const input,
                                    uint8_t const *const secret)
{
    size_t i;
    for (i = 0; i < ACC_NB; i++) {
        uint64_t input_val = XXH_read64(input  + (8 * i));
        acc[i]    += input_val;
        input_val ^= XXH_read64(secret + (8 * i));
        acc[i]    += (uint32_t)input_val * (input_val >> 32);
    }
}

/* Scrambles input. This is usually written in SIMD code, as it is usually part of the main loop. */
static void XXH3_scrambleAcc(uint64_t *const acc, uint8_t const *const secret)
{
    size_t i;
    for (i = 0; i < ACC_NB; i++) {
        acc[i] ^= acc[i] >> 47;
        acc[i] ^= XXH_read64(secret + (8 * i));
        acc[i] *= PRIME32_1;
    }
}

/* Processes a full block. */
static void XXH3_accumulate_64b(uint64_t *const acc,
                                uint8_t const *const input,
                                uint8_t const *const secret,
                                size_t const nb_stripes)
{
    size_t n;
    for (n = 0; n < nb_stripes; n++) {
        XXH3_accumulate_512_64b(acc, input + n * STRIPE_LEN, secret + (8 * n));
    }
}

/* Combines two accumulators with two keys */
static uint64_t XXH3_mix2Accs(uint64_t const *const acc, uint8_t const *const secret)
{
    return XXH3_mul128_fold64(
               acc[0] ^ XXH_read64(secret),
               acc[1] ^ XXH_read64(secret + 8));
}

/* Combines 8 accumulators with keys into 1 finalized 64-bit hash. */
static XXH64_hash_t XXH3_mergeAccs(uint64_t const *const acc, uint8_t const *const key,
                                   uint64_t const start)
{
    uint64_t result64 = start;
    size_t i = 0;
    for (i = 0; i < 4; i++)
         result64 += XXH3_mix2Accs(acc + 2 * i, key + 16 * i);

    return XXH3_avalanche(result64);
}

/* Controls the long hash function. This is used for both XXH3_64 and XXH3_128. */
static XXH64_hash_t XXH3_hashLong_64b(uint8_t const *const input,
                                      size_t const length,
                                      uint8_t const *const secret,
                                      size_t const secret_size)
{
    size_t const nb_rounds = (secret_size - STRIPE_LEN) / XXH_SECRET_CONSUME_RATE;
    size_t const block_len = STRIPE_LEN * nb_rounds;
    size_t const nb_blocks = length / block_len;
    size_t const nb_stripes = (length - (block_len * nb_blocks)) / STRIPE_LEN;
    size_t n;
    uint64_t acc[ACC_NB];

    acc[0] = PRIME32_3;
    acc[1] = PRIME64_1;
    acc[2] = PRIME64_2;
    acc[3] = PRIME64_3;
    acc[4] = PRIME64_4;
    acc[5] = PRIME32_2;
    acc[6] = PRIME64_5;
    acc[7] = PRIME32_1;

    for (n = 0; n < nb_blocks; n++) {
        XXH3_accumulate_64b(acc, input + n * block_len, secret, nb_rounds);
        XXH3_scrambleAcc(acc, secret + secret_size - STRIPE_LEN);
    }

    /* last partial block */
    XXH3_accumulate_64b(acc, input + nb_blocks * block_len, secret, nb_stripes);

    /* last stripe */
    if (length % STRIPE_LEN != 0) {
        uint8_t const *const p = input + length - STRIPE_LEN;
        /* Do not align on 8, so that the secret is different from the scrambler */
#define XXH_SECRET_LASTACC_START 7
        XXH3_accumulate_512_64b(acc, p, secret + secret_size - STRIPE_LEN - XXH_SECRET_LASTACC_START);
    }

#define XXH_SECRET_MERGEACCS_START 11

    /* converge into final hash */
    return XXH3_mergeAccs(acc, secret + XXH_SECRET_MERGEACCS_START, (uint64_t) length * PRIME64_1);
}

/* Hashes a long input, > 240 bytes */
static XXH64_hash_t XXH3_hashLong_64b_withSeed(uint8_t const *const input,
                                               size_t const length,
                                               XXH64_hash_t const seed)
{
    uint8_t secret[XXH_SECRET_DEFAULT_SIZE];
    size_t i;

    for (i = 0; i < XXH_SECRET_DEFAULT_SIZE / 16; i++) {
        XXH_write64(secret + (16 * i),     XXH_read64(kSecret + (16 * i))     + seed);
        XXH_write64(secret + (16 * i) + 8, XXH_read64(kSecret + (16 * i) + 8) - seed);
    }
    return XXH3_hashLong_64b(input, length, secret, sizeof(secret));
}

/* The XXH3_64 seeded hash function.
 * input: The data to hash.
 * length:  The length of input. It is undefined behavior to have length larger than the
 *          capacity of input.
 * seed:    A 64-bit value to seed the hash with.
 * returns: The 64-bit calculated hash value. */
XXH64_hash_t XXH3_64bits_withSeed(void const *const input, size_t const length, XXH64_hash_t const seed)
{
    if (length <= XXH3_MIDSIZE_MAX)
        return XXH3_hashShort_64b((uint8_t const *)input, length, kSecret, seed);
    return XXH3_hashLong_64b_withSeed((uint8_t const *)input, length, seed);
}

/* The XXH3_64 non-seeded hash function.
 * input: The data to hash.
 * length:  The length of input. It is undefined behavior to have length larger than the
 *          capacity of input.
 * returns: The 64-bit calculated hash value. */
XXH64_hash_t XXH3_64bits(void const *const input, size_t const length)
{
    return XXH3_64bits_withSeed(input, length, 0);
}

// Hashes word to a number
unsigned int hash(const char *word)
{
    // Return 27 least significant bits (number of buckets = 2^27)
    return XXH3_64bits(word, sizeof(word)) & 0x7FFFFFF;
}

// Loads dictionary into memory, returning true if successful else false
bool load(const char *dictionary)
{
    // Get file descriptor of dictionary, opening it as read-only. https://linuxhint.com/using_mmap_function_linux/
    int file_descriptor = open(dictionary, O_RDONLY);
    if(file_descriptor < 0){
        printf("ERROR: %d. Failed to `open` \"%s\" for reading.\n", errno, dictionary);
        return false;
    }
    if(fstat(file_descriptor, &stat_buffer) < 0){
        printf("ERROR: %d. Faied to `stat` \"%s\".\n", errno, dictionary);
        return false;
    }
    dictionary_pointer = mmap(NULL, stat_buffer.st_size, PROT_READ | PROT_WRITE, MAP_PRIVATE, file_descriptor, 0);
    if(dictionary_pointer == MAP_FAILED){
        printf("ERROR: %d. Faied to `mmap` \"%s\".\n", errno, dictionary);
        return false;
    }
    close(file_descriptor);

    // Iterate through characters in the memory map
    char *word_address = &dictionary_pointer[0];
    for (int dictionary_index = 0; dictionary_index < stat_buffer.st_size; ++dictionary_index) {
        if (dictionary_pointer[dictionary_index] == '\n') {
            // Change newline to null
            dictionary_pointer[dictionary_index] = '\0';
            // Store pointer to word in key
            keys[word_count] = word_address;
            // Initialise buffer for output of converting word to lowercase
            char lowercase_word[45] = "";
            // Convert word to lowercase
            lowercase(word_address, lowercase_word, strlen(word_address));
            // Get the hash digest of the lowercased word
            int digest = hash(lowercase_word);
            // Write the key index information into the next available node, add the address of this node into the table, then increment the node index
            // Set the key index of this node to the word count (the index used to store the word's address to the keys array) then increment word count
            nodes[nodes_index].keys_index = word_count++;
            // Check if this is the first node in this bucket
            if (table[digest] == NULL) {
              // This is the first node of this bucket
              // Set the next pointer of current node to NULL
              nodes[nodes_index].next = NULL;
            } else {
              // This is not the first node in this bucket
              // Set the next pointer to the current head of this bucket (the previous first node in this bucket)
              nodes[nodes_index].next = table[digest];
            }
            // Set the element in table indexed by the hash digest of the lowercased word to be equal to the address of this node and increment the nodes_index
            table[digest] = &nodes[nodes_index++];
            // Set address to the next character after null character, i.e., start of next word
            word_address = &dictionary_pointer[dictionary_index + 1];
        }
    }
    return true;
}

// Returns number of words in dictionary if loaded else 0 if not yet loaded
unsigned int size(void)
{
    return word_count;
}

// Unloads dictionary from memory, returning true if successful else false
bool unload(void)
{
    return (munmap(dictionary_pointer, stat_buffer.st_size) == 0);
}
