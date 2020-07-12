// mario.c - Prints pyramids
#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <cs50.h>

// Pesters user until they return a valid value for height
int get_height(int integer) {
  return (integer > 8 || integer < 1)
    ? get_height(get_int("Height: "))
    : integer;
}

// Stores character information
typedef struct Characters {
  const char character;
  const int amount;
  char *output;
} Characters;

// Returns a `Characters` instance
Characters characters_instance(char character, int amount, char *output) {
  return (Characters) {
    character,
    amount,
    output
  };
}

// Evaluates a `Characters` struct
Characters evaluate_characters(Characters input) {
  if (input.amount > 0) {
    const int output_length = snprintf(NULL, 0, "%s%c", input.output, input.character) + 1;
    char *output_buffer = malloc(output_length);
    if (output_buffer == NULL) {
      free(output_buffer);
      exit(EXIT_FAILURE);
    } else {
      output_buffer[0] = '\0';
      snprintf(output_buffer, output_length, "%s%c", input.output, input.character);
      const Characters output = evaluate_characters(characters_instance(input.character, input.amount - 1, output_buffer));
      free(output_buffer);
      return output;
    }
  } else {
    return input;
  }
}

// Stores pyramids information
typedef struct Pyramids {
  const int height;
  const int accumulator;
  char *output;
} Pyramids;

// Returns a `Pyramids` instance
Pyramids pyramid_instance(Pyramids *input, int accumulator, char *output) {
  return (Pyramids) {
    input->height,
    accumulator,
    output
  };
}

// Evaluates a `Pyramids` struct
Pyramids pyramid_evaluate(Pyramids input) {
  if (input.accumulator > 0) {
    const int decremented = input.accumulator - 1;
    const char *left_padding = evaluate_characters(characters_instance(' ', decremented, "")).output;
    const char *pounds = evaluate_characters(characters_instance('#', input.height - decremented, "")).output;
    const int output_length = snprintf(
      NULL,
      0,
      "%s%s%s  %s\n",
      input.output,
      left_padding,
      pounds,
      pounds
    ) + 1;
    char *output_buffer = malloc(output_length);
    if (output_buffer == NULL) {
      free(output_buffer);
      exit(EXIT_FAILURE);
    } else {
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
      const Pyramids output = pyramid_evaluate(pyramid_instance(&input, decremented, output_buffer));
      free(output_buffer);
      return output;
    }
  }
  return input;
}

int main(void) {
  const int height = get_height(get_int("Height: "));
  printf("%s", pyramid_evaluate((Pyramids) {
    height,
    height,
    ""
  }).output);
  return 0;
}
