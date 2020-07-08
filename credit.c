// credit.c - Checks validity of card number
#include <stdio.h>
#include <cs50.h>

// Struct used by the `luhn_valid` function
typedef struct Luhn {
  const long number;
  const bool other;
  const int accumulator;
} Luhn;

// Returns the sum of product's digits
int sum_product_digits(int input_a, int input_b) {
  const int product = input_a * input_b;
  return (product > 9)
    ? (product % 10) + (product / 10)
    : product;
}

// Returns a `Luhn` instance for `luhn_evaluate` with a variable 3rd field
Luhn luhn_instance(Luhn input, int third_field) {
  return (Luhn){
    input.number / 10,
    !input.other,
    third_field
  };
}

// Evaluates a `Luhn` struct
Luhn luhn_evaluate(Luhn input) {
  return (input.number > 1)
    ? luhn_evaluate((input.other)
      ? luhn_instance(input, input.accumulator + sum_product_digits(2, input.number % 10))
      : luhn_instance(input, input.accumulator + (input.number % 10)))
    : input;
}

// Validates a `Luhn` struct
bool luhn_valid(Luhn input) {
  return (luhn_evaluate(input).accumulator % 10 == 0);
}

// Returns length of a long
int long_length(long input, int accumulator) {
  return (input > 1)
    ? long_length(input / 10, accumulator + 1)
    : accumulator;
}

// American Express uses 15-digit numbers, MasterCard uses 16-digit numbers, and Visa uses 13- and 16-digit numbers
// All American Express numbers start with 34 or 37; most MasterCard numbers start with 51, 52, 53, 54, or 55 (they also have some other potential starting numbers which we won’t concern ourselves with for this problem); and all Visa numbers start with 4.

// Returns type of card number, AMEX, MASTERCARD, VISA, or INVALID
string card_number_type(long input) {
  const string invalid = "INVALID\n";
  const int start_digits = input / 10000000000000;
  if (luhn_valid((Luhn){
    input,
    false,
    0
  })) {
    if ((start_digits > 3399 && start_digits < 3500) || (start_digits > 3699 && start_digits < 3800)) {
      return "AMEX\n";
    } else if (start_digits > 50999 && start_digits < 56000) {
      return "MASTERCARD\n";
    } else if (start_digits == 4 || (start_digits > 399 && start_digits < 500)) {
      return "VISA\n";
    } else {
      return invalid;
    }
  } else {
    return invalid;
  }
}

int main(int argc, char const *argv[])
{
  printf("%s", card_number_type(get_long("Number: ")));
  return 0;
}
