// credit.c - Checks validity of card number
#include <stdio.h>
#include <cs50.h>

// Struct used by the `luhn_valid` function
typedef struct Luhn
{
    long const number;
    bool const other;
    int const accumulator;
} Luhn;

// Returns the sum of product's digits
int sum_product_digits(int const input_a, int const input_b)
{
    int const product = input_a * input_b;
    return (product > 9)
           ? (product % 10) + (product / 10)
           : product;
}

// Returns a `Luhn` instance for `luhn_evaluate` with a variable 3rd field
Luhn luhn_instance(Luhn const *input, int const third_field)
{
    return (Luhn)
    {
        input->number / 10,
              !input->other,
              third_field
    };
}

// Evaluates a `Luhn` struct
Luhn luhn_evaluate(Luhn const input)
{
    return (input.number > 1)
           ? luhn_evaluate((input.other)
                           ? luhn_instance(&input, input.accumulator + sum_product_digits(2, input.number % 10))
                           : luhn_instance(&input, input.accumulator + (input.number % 10)))
           : input;
}

// Returns type of card number, AMEX, MASTERCARD, VISA, or INVALID
char const *card_number_type(long const input)
{
    char const *invalid = "INVALID\n";
    // Divide by 1e12 to decrease place value so I don't have to type as many digits later
    int const start_digits = input / 1e12;
    // Test if input passes Luhn algorithm
    if (luhn_evaluate((Luhn)
{
    input,
    false,
    0
}).accumulator % 10 == 0)
    {
        // Test if input passes range checks
        if ((start_digits > 339 && start_digits < 350) || (start_digits > 369 && start_digits < 380))
        {
            return "AMEX\n";
        }
        else if (start_digits > 5099 && start_digits < 5600)
        {
            return "MASTERCARD\n";
        }
        else if (start_digits == 4 || (start_digits > 3999 && start_digits < 5000))
        {
            return "VISA\n";
        }
        else
        {
            return invalid;
        }
    }
    else
    {
        return invalid;
    }
}

int main(void)
{
    printf("%s", card_number_type(get_long("Number: ")));
    return 0;
}
