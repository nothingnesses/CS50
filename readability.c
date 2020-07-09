// readability.c - Outputs the readability of a input string
#include <stdio.h>
#include <cs50.h>
#include <string.h>
#include <math.h>

// Stores information about text
typedef struct Text {
  const string text;
  const int letters;
  const int words;
  const int sentences;
  const int accumulator;
} Text;

// Determines if input is a letter
bool is_letter(char input) {
  return ((input >= 'a' && input <= 'z') || (input >= 'A' && input <= 'Z'));
}

// Determines if input is an end mark
bool is_end_mark(char input) {
  return (input == '!' || input == '.' || input == '?');
}

// Determines if input is a whitespace character
bool is_whitespace(char input) {
  return (input == ' ' || input == '\t' || input == '\n' || input == '\r');
}

// Returns a `Text` instance for `text_evaluate` with a variable `letters`, `words` and `sentences` fields
Text text_instance(Text input, int letters, int words, int sentences, int increment) {
  return (Text) {
    input.text,
    letters,
    words,
    sentences,
    input.accumulator + increment
  };
}

// Evaluates the information of a `Text` struct
Text text_evaluate(Text input) {
  const char current_character = input.text[input.accumulator];
  // This line might be bad because it reads data outside (before) the string
  const char previous_character = input.text[input.accumulator - 1];
  // Check until we hit string terminating null character
  return (current_character != '\0')
  // Is current current character a letter?
  ? is_letter(current_character)
    // Current character is a letter, increment letter count.
    ? text_evaluate(text_instance(input, input.letters + 1, input.words, input.sentences, 1))
    : (is_whitespace(current_character) && !is_whitespace(previous_character))
      ? text_evaluate(text_instance(input, input.letters, input.words + 1, input.sentences, 1))
      : (is_end_mark(current_character) && !is_end_mark(previous_character))
        ? text_evaluate(text_instance(input, input.letters, input.words + 1, input.sentences + 1, 1))
        : text_evaluate(text_instance(input, input.letters, input.words, input.sentences, 1))
  // Current character is a null. Is the previous character a letter?
  : is_letter(previous_character)
    // Current character is a null. Previous character is a letter. Increment word count.
    ? text_instance(input, input.letters, input.words + 1, input.sentences, 0)
    : input;
}

// Convert numeric digit to ASCII code equivalent
char digit_to_ascii(int input) {
  return (char)(input + 48);
}

// Calculates readability information using the Coleman-Liau formula
string coleman_liau(Text input, char *output) {
  const float multiplier = 100 / (float)input.words;
  const float index = round(0.0588 * ((float)input.letters * multiplier) - 0.296 * ((float)input.sentences * multiplier) - 15.8);
  // printf("letters: %i\nwords: %i\nsentences: %i\n", input.letters, input.words, input.sentences);
  if (index >= 16) {
    return "Grade 16+\n";
  } else if (index < 1) {
    return "Before Grade 1\n";
  } else {
    if (index > 9) {
      output[6] = digit_to_ascii((int)index / 10);
      output[7] = digit_to_ascii((int)index % 10);
      output[8] = '\n';
      output[9] = '\0';
      return output;
    } else {
      output[6] = digit_to_ascii((int)index);
      output[7] = '\n';
      output[8] = '\0';
      return output;
    }
  }
}

int main(void) {
  // Allocate enough memory for "Grade " + a two-digit number + '\n' + terminating character
  char output[10] = "Grade ";
  printf("%s",
    coleman_liau(text_evaluate((Text) {
      get_string("Text: "),
      0,
      0,
      0,
      0
    }), output));
  return 0;
}
