// mario.c - Prints pyramids
#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <cs50.h>

// Pesters user until they return a valid value for height
int get_height(int const integer)
{
    return (integer > 8 || integer < 1)
           ? get_height(get_int("Height: "))
           : integer;
}

// Stores character information
typedef struct Characters
{
    char const character;
    int const amount;
    char *output;
    bool const is_malloced;
} Characters;

// Returns a `Characters` instance
Characters characters_instance(char const character, int const amount, char *output, bool const is_malloced)
{
    return (Characters)
    {
        character,
        amount,
        output,
        is_malloced
    };
}

// Evaluates a `Characters` struct
Characters evaluate_characters(Characters const input)
{
    if (input.amount > 0)
    {
        const int output_length = snprintf(NULL, 0, "%s%c", input.output, input.character) + 1;
        char *output_buffer = malloc(output_length);
        if (output_buffer == NULL)
        {
            free(output_buffer);
            exit(EXIT_FAILURE);
        }
        else
        {
            output_buffer[0] = '\0';
            snprintf(output_buffer, output_length, "%s%c", input.output, input.character);
            const Characters output = evaluate_characters(characters_instance(input.character, input.amount - 1, output_buffer, true));
            if (input.is_malloced)
            {
                free(input.output);
            }
            return output;
        }
    }
    else
    {
        return input;
    }
}

// Stores pyramids information
typedef struct Pyramids
{
    int const height;
    int const accumulator;
    char *output;
    bool const is_malloced;
    Characters const left_padding_buffer;
    Characters const pounds_buffer;
} Pyramids;

// Returns a `Pyramids` instance
Pyramids pyramid_instance(
    Pyramids const *input,
    int const accumulator,
    char *output,
    bool const is_malloced,
    Characters const left_padding_buffer,
    Characters const pounds_buffer
)
{
    return (Pyramids)
    {
        input->height,
              accumulator,
              output,
              is_malloced,
              left_padding_buffer,
              pounds_buffer
    };
}

// Evaluates a `Pyramids` struct
Pyramids pyramid_evaluate(Pyramids const input)
{
    if (input.accumulator > 0)
    {
        int const decremented = input.accumulator - 1;
        Characters const left_padding_buffer = evaluate_characters(characters_instance(' ', decremented, "", false));
        char const *left_padding = left_padding_buffer.output;
        Characters const pounds_buffer = evaluate_characters(characters_instance('#', input.height - decremented, "", false));
        char const *pounds = pounds_buffer.output;
        int const output_length = snprintf(
                                      NULL,
                                      0,
                                      "%s%s%s  %s\n",
                                      input.output,
                                      left_padding,
                                      pounds,
                                      pounds
                                  ) + 1;
        char *output_buffer = malloc(output_length);
        if (output_buffer == NULL)
        {
            free(output_buffer);
            exit(EXIT_FAILURE);
        }
        else
        {
            output_buffer[0] = '\0';
            snprintf(
                output_buffer,
                output_length,
                "%s%s%s  %s\n",
                input.output,
                left_padding,
                pounds,
                pounds
            );
            Pyramids const output = pyramid_evaluate(pyramid_instance(&input, decremented, output_buffer, true, left_padding_buffer,
                                    pounds_buffer));
            if (input.left_padding_buffer.is_malloced)
            {
                free(input.left_padding_buffer.output);
            }
            if (input.pounds_buffer.is_malloced)
            {
                free(input.pounds_buffer.output);
            }
            if (input.is_malloced)
            {
                free(input.output);
            }
            return output;
        }
    }
    if (input.left_padding_buffer.is_malloced)
    {
        free(input.left_padding_buffer.output);
    }
    if (input.pounds_buffer.is_malloced)
    {
        free(input.pounds_buffer.output);
    }
    return input;
}

int main(void)
{
    int const height = get_height(get_int("Height: "));
    Pyramids const pyramids = pyramid_evaluate((Pyramids)
    {
        height,
        height,
        "",
        false,
        // Dummy `Characters` instance
        characters_instance(' ', 0, "", false),
        // Dummy `Characters` instance
        characters_instance(' ', 0, "", false)
    });
    printf("%s", pyramids.output);
    free(pyramids.output);
    return 0;
}
