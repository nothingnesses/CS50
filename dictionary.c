// Implements a dictionary's functionality

#include <stdbool.h>

#include "dictionary.h"
#include <sys/mman.h> // mmap
#include <errno.h> // errno
#include <string.h>   // tolower
#include <ctype.h> // tolower
#include <stdio.h> // printf
#include <sys/stat.h>  // open
#include <fcntl.h> // open
#include <unistd.h> // close
#include <strings.h> // strcasecmp

// 143100 for safety because amount of words in dictionary is ~143000.
#define MAX_WORD_COUNT 143100

// Represents a node in a hash table
typedef struct node
{
    int keys_index;
    struct node *next;
}
node;

/*
Use a power of 2 to make bitwise operation in `hash` funciton easier.
We're using 2^20 because it seems optimal
*/
// Number of buckets in hash table
const unsigned int N = 1048576;

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
void lowercase(char *input, char *buffer, int input_length)
{
    for (int word_index = 0; word_index < input_length; ++word_index)
    {
        buffer[word_index] = tolower(input[word_index]);
    }
    buffer[input_length] = '\0';
}

// Returns true if word is in dictionary else false
bool check(const char *word)
{
    // Convert word to lowercase, hash, etc.
    char lowercase_word[45] = {0};
    lowercase((char *)word, lowercase_word, strlen(word));
    // Get the hash digest of the lowercased word
    int digest = hash(lowercase_word);
    // Check if bucket is empty
    if (table[digest] != NULL)
    {
        // This bucket isn't empty, iterate through linked list to find a match
        for (node *current_node = table[digest]; current_node != NULL; current_node = current_node->next)
        {
            if (strcasecmp(keys[current_node->keys_index], word) == 0)
            {
                return true;
            }
        }
        // Found no match
        return false;
    }
    // Bucket is empty
    return false;
}

// http://www.cse.yorku.ca/~oz/hash.html
unsigned long djb2(unsigned char *str)
{
    unsigned long hash = 5381;
    int c;
    while ((c = *str++))
    {
        hash = ((hash << 5) + hash) + c; /* hash * 33 + c */
    }
    return hash;
}

// Hashes word to a number
unsigned int hash(const char *word)
{
    // Return 20 least significant bits (number of buckets = 2^20)
    return djb2((unsigned char *)word) & 0xFFFFF;
}

// Loads dictionary into memory, returning true if successful else false
bool load(const char *dictionary)
{
    // Get file descriptor of dictionary, opening it as read-only. https://linuxhint.com/using_mmap_function_linux/
    int file_descriptor = open(dictionary, O_RDONLY);
    if (file_descriptor < 0)
    {
        printf("ERROR: %d. Failed to `open` \"%s\" for reading.\n", errno, dictionary);
        return false;
    }
    if (fstat(file_descriptor, &stat_buffer) < 0)
    {
        printf("ERROR: %d. Faied to `stat` \"%s\".\n", errno, dictionary);
        return false;
    }
    dictionary_pointer = mmap(NULL, stat_buffer.st_size, PROT_READ | PROT_WRITE, MAP_PRIVATE, file_descriptor, 0);
    if (dictionary_pointer == MAP_FAILED)
    {
        printf("ERROR: %d. Faied to `mmap` \"%s\".\n", errno, dictionary);
        return false;
    }
    close(file_descriptor);

    // Iterate through characters in the memory map
    char *word_address = &dictionary_pointer[0];
    // Initialise the lowercase output buffer
    char lowercase_word[45];
    for (int dictionary_index = 0; dictionary_index < stat_buffer.st_size; ++dictionary_index)
    {
        if (dictionary_pointer[dictionary_index] == '\n')
        {
            // Change newline to null
            dictionary_pointer[dictionary_index] = '\0';
            // Store pointer to word in key
            keys[word_count] = word_address;
            // Clear the buffer used for the output of converting word to lowercase
            lowercase_word[0] = '\0';
            // Convert word to lowercase
            lowercase(word_address, lowercase_word, strlen(word_address));
            // Get the hash digest of the lowercased word
            int digest = hash(lowercase_word);
            // Write the key index information into the next available node, add the address of this node into the table, then increment the node index
            // Set the key index of this node to the word count (the index used to store the word's address to the keys array) then increment word count
            nodes[nodes_index].keys_index = word_count++;
            // Check if this is the first node in this bucket
            if (table[digest] == NULL)
            {
                // This is the first node of this bucket
                // Set the next pointer of current node to NULL
                nodes[nodes_index].next = NULL;
            }
            else
            {
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
