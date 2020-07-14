// substitution.c - Encrypts input using a substitution cipher
#include <stdio.h>
#include <cs50.h>
#include <string.h>
#include <stdlib.h>
#include <ctype.h>

char const *PLAINTEXT_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
int const ALPHABET_LENGTH = 26;

// Returns the difference between to characters
int character_difference(char const original_character, char const new_character) {
  return ((int)new_character - (int)original_character);
}

// Determines if input is a letter
bool is_letter(char const input) {
  return ((input >= 'a' && input <= 'z') || (input >= 'A' && input <= 'Z'));
}

int main(int const argc, char const *argv[]) {
  if (argc != 2) {
    printf("Usage: ./substitution key\n");
    return 1;
  }
  int const ciphertext_alphabet_length = strlen(argv[1]);
  if (ciphertext_alphabet_length != 26) {
    printf("Key must contain 26 characters.\n");
    return 1;
  }

  int ciphertext_character_counter[26] = {0};
  int cipher[ciphertext_alphabet_length];

  for (int ciphertext_alphabet_index = 0; ciphertext_alphabet_index < ciphertext_alphabet_length; ++ciphertext_alphabet_index) {
    if (is_letter(argv[1][ciphertext_alphabet_index])) {
      char const uppercase_character = toupper(argv[1][ciphertext_alphabet_index]);
      int const uppercase_character_index = (int)uppercase_character - 65;
      ++ciphertext_character_counter[uppercase_character_index];
      if (ciphertext_character_counter[uppercase_character_index] > 1) {
        printf("Key must not contain duplicate characters.\n");
        return 1;
      }
      cipher[ciphertext_alphabet_index] = character_difference(PLAINTEXT_ALPHABET[ciphertext_alphabet_index], uppercase_character);
    } else {
      printf("Key must contain alphabetic characters only.\n");
      return 1;
    }
  }

  char const *plaintext = get_string("plaintext: ");
  printf("ciphertext: ");
  int plaintext_index = 0;
  int plaintext_length = strlen(plaintext);
  for (; plaintext_index < plaintext_length; ++plaintext_index) {
    (is_letter(plaintext[plaintext_index]))
      ? printf("%c", (char)((int)plaintext[plaintext_index] + (int)cipher[(int)toupper(plaintext[plaintext_index]) - 65]))
      : printf("%c", plaintext[plaintext_index]);
  }
  printf("\n");
  return 0;
}
