from cs50 import get_int


def sum_product_digits(input_a, input_b):
    product = input_a * input_b
    return (product % 10) + (product // 10) if product > 9 else product


def luhn_evaluate(number, other, accumulator):
    if number > 1:
        if other:
            return luhn_evaluate(number // 10, not other, accumulator + sum_product_digits(2, number % 10))
        else:
            return luhn_evaluate(number // 10, not other, accumulator + (number % 10))
    else:
        return accumulator


def card_number_type(card_number):
    start_digits = card_number // 1e12
    if luhn_evaluate(card_number, False, 0) % 10 == 0:
        if (start_digits > 339 and start_digits < 350) or (start_digits > 369 and start_digits < 380):
            return "AMEX\n"
        elif start_digits > 5099 and start_digits < 5600:
            return "MASTERCARD\n"
        elif start_digits == 4 or (start_digits > 3999 and start_digits < 5000):
            return "VISA\n"
        else:
            return "INVALID\n"
    else:
        return "INVALID\n"


print("{}".format(card_number_type(get_int("Number: "))), end="")
