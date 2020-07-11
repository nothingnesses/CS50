// readability.c - Outputs the readability of a input string
#include <stdio.h>
#include <stdlib.h>
#include <cs50.h>
#include <string.h>
#include <math.h>

// Stores information about text
typedef struct Text
{
    const char *text;
    const int letters;
    const int words;
    const int sentences;
    const int accumulator;
} Text;

// Determines if input is a letter
bool is_letter(char input)
{
    return ((input >= 'a' && input <= 'z') || (input >= 'A' && input <= 'Z'));
}

// Determines if input is an end mark
bool is_end_mark(char input)
{
    return (input == '!' || input == '.' || input == '?');
}

// Determines if input is a whitespace character
bool is_whitespace(char input)
{
    return (input == ' ' || input == '\t' || input == '\n' || input == '\r');
}

// Returns a `Text` instance for `text_evaluate` with variable `letters`, `words` and `sentences` fields
Text text_instance(Text *input, int letters, int words, int sentences)
{
    return (Text)
    {
        input->text,
              letters,
              words,
              sentences,
              input->accumulator + 1
    };
}

// Evaluates the information of a `Text` struct
Text text_evaluate(Text input)
{
    const char current_character = input.text[input.accumulator];
    if (input.accumulator == 0)
    {
        return text_evaluate(text_instance(&input, input.letters + 1, input.words, input.sentences));
    }
    const char previous_character = input.text[input.accumulator - 1];
    return (current_character != '\0')
           ? is_letter(current_character)
           ? text_evaluate(text_instance(&input, input.letters + 1, input.words, input.sentences))
           : (is_whitespace(current_character) && !is_whitespace(previous_character) && !is_end_mark(previous_character))
           ? text_evaluate(text_instance(&input, input.letters, input.words + 1, input.sentences))
           : (is_end_mark(current_character) && !is_end_mark(previous_character))
           ? text_evaluate(text_instance(&input, input.letters, input.words + 1, input.sentences + 1))
           : text_evaluate(text_instance(&input, input.letters, input.words, input.sentences))
           : input;
}

// Stores output information
typedef struct Output
{
    const bool is_malloced;
    char *output;
} Output;

// Returns an `Output` instance
Output output_instance(bool is_malloced, char *output)
{
    return (Output)
    {
        is_malloced,
        output
    };
}

// Calculates readability information using the Coleman-Liau formula
Output coleman_liau(Text input)
{
    const float multiplier = 100 / (float)input.words;
    const float index = round(0.0588 * ((float)input.letters * multiplier) - 0.296 * ((float)input.sentences * multiplier) - 15.8);
    // printf("Letters: %i\nWords: %i\nSentences: %i\n", input.letters, input.words, input.sentences);
    if (index >= 16)
    {
        return output_instance(false, "Grade 16+\n");
    }
    else if (index < 1)
    {
        return output_instance(false, "Before Grade 1\n");
    }
    else
    {
        // + 1 for '\0'
        const int output_length = snprintf(NULL, 0, "Grade %i\n", (int)index) + 1;
        char *output = malloc(output_length);
        if (output == NULL)
        {
            exit(EXIT_FAILURE);
        }
        else
        {
            snprintf(output, output_length, "Grade %i\n", (int)index);
            return output_instance(true, output);
        }
    }
}

int main(void)
{
    Output output = coleman_liau(text_evaluate((Text)
    {
        get_string("Text: "),
                   0,
                   0,
                   0,
                   0
    }));
    printf("%s", output.output);
    if (output.is_malloced)
    {
        free(output.output);
    }
    return 0;
}