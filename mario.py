from cs50 import get_int


def get_height(height):
    return get_height(get_int("Height: ")) if (height > 8 or height < 1) else height


def duplicate_characters_a(amount, character, output):
    return output if amount == 0 else duplicate_characters_a(amount - 1, character, output + character)


def duplicate_characters(amount, character):
    return duplicate_characters_a(amount, character, "")


def get_pyramids_a(height, accumulator, output):
    if accumulator == 0:
        return output
    else:
        decremented = accumulator - 1
        pound_string = duplicate_characters(height - decremented, "#")
        return get_pyramids_a(height, decremented, output + duplicate_characters(decremented, " ") + pound_string + "  " + pound_string + "\n")


def get_pyramids(height):
    return get_pyramids_a(height, height, "")


print("{}".format(get_pyramids(get_height(get_int("Height: ")))), end="")
