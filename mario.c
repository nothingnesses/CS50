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
  const bool is_malloced;
} Characters;

// Returns a `Characters` instance
Characters characters_instance(const char character, const int amount, char *output, const bool is_malloced) {
  return (Characters) {
    character,
    amount,
    output,
    is_malloced
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
      const Characters output = evaluate_characters(characters_instance(input.character, input.amount - 1, output_buffer, true));
      if (input.is_malloced) {
        free(input.output);
      }
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
  const bool is_malloced;
  const Characters left_padding_buffer;
  const Characters pounds_buffer;
} Pyramids;

// Returns a `Pyramids` instance
Pyramids pyramid_instance(
  Pyramids *input,
  int accumulator,
  char *output,
  bool is_malloced,
  Characters left_padding_buffer,
  Characters pounds_buffer
  ) {
  return (Pyramids) {
    input->height,
    accumulator,
    output,
    is_malloced,
    left_padding_buffer,
    pounds_buffer
  };
}

// Evaluates a `Pyramids` struct
Pyramids pyramid_evaluate(Pyramids input) {
  if (input.accumulator > 0) {
    const int decremented = input.accumulator - 1;
    const Characters left_padding_buffer = evaluate_characters(characters_instance(' ', decremented, "", false));
    const char *left_padding = left_padding_buffer.output;
    const Characters pounds_buffer = evaluate_characters(characters_instance('#', input.height - decremented, "", false));
    const char *pounds = pounds_buffer.output;
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
      const Pyramids output = pyramid_evaluate(pyramid_instance(&input, decremented, output_buffer, true, left_padding_buffer, pounds_buffer));
      if (input.left_padding_buffer.is_malloced) {
        free(input.left_padding_buffer.output);
      }
      if (input.pounds_buffer.is_malloced) {
        free(input.pounds_buffer.output);
      }
      if (input.is_malloced) {
        free(input.output);
      }
      return output;
    }
  }
  if (input.left_padding_buffer.is_malloced) {
    free(input.left_padding_buffer.output);
  }
  if (input.pounds_buffer.is_malloced) {
    free(input.pounds_buffer.output);
  }
  return input;
}

int main(void) {
  const int height = get_height(get_int("Height: "));
  Pyramids pyramids = pyramid_evaluate((Pyramids) {
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
