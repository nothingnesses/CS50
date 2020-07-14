// substitution.c - Encrypts input using a substitution cipher
#include <stdio.h>
#include <cs50.h>
#include <string.h>
#include <stdlib.h>
#include <ctype.h>

char static const *PLAINTEXT_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
enum
{
    ALPHABET_LENGTH = 26,
    A_ASCII_CODE = 65
};

// Determines if input is a letter
bool is_letter(char const input)
{
    return ((input >= 'a' && input <= 'z') || (input >= 'A' && input <= 'Z'));
}

void error(char const *binary_name)
{
    printf("Usage: ./%s KEY\nKEY must only contain %i unique letters.", binary_name, ALPHABET_LENGTH);
}

int main(int const argc, char const *argv[])
{
    if (argc != 2)
    {
        error(argv[0]);
        return 1;
    }
    int const ciphertext_alphabet_length = strlen(argv[1]);
    if (ciphertext_alphabet_length != ALPHABET_LENGTH)
    {
        error(argv[0]);
        return 1;
    }

    int ciphertext_character_counter[ALPHABET_LENGTH] = {0};
    int cipher[ciphertext_alphabet_length];

    for (int ciphertext_alphabet_index = 0; ciphertext_alphabet_index < ciphertext_alphabet_length; ++ciphertext_alphabet_index)
    {
        if (is_letter(argv[1][ciphertext_alphabet_index]))
        {
            char const uppercase_character = toupper(argv[1][ciphertext_alphabet_index]);
            int const uppercase_character_index = (int)uppercase_character - A_ASCII_CODE;
            ++ciphertext_character_counter[uppercase_character_index];
            if (ciphertext_character_counter[uppercase_character_index] > 1)
            {
                error(argv[0]);
                return 1;
            }
            cipher[ciphertext_alphabet_index] = (int)uppercase_character - (int)PLAINTEXT_ALPHABET[ciphertext_alphabet_index];
        }
        else
        {
            error(argv[0]);
            return 1;
        }
    }

    char const *plaintext = get_string("plaintext: ");
    printf("ciphertext: ");
    int plaintext_index = 0;
    int plaintext_length = strlen(plaintext);
    for (; plaintext_index < plaintext_length; ++plaintext_index)
    {
        (is_letter(plaintext[plaintext_index]))
        ? printf("%c", (char)((int)plaintext[plaintext_index] + (int)cipher[(int)toupper(plaintext[plaintext_index]) - A_ASCII_CODE]))
        : printf("%c", plaintext[plaintext_index]);
    }
    printf("\n");
    return 0;
}
