from cs50 import get_string


def is_end_mark(letter):
    return letter == "!" or letter == "." or letter == '?'


def text_evaluate_a(text, text_length, letters, words, sentences, accumulator):
    if accumulator > text_length:
        return letters, words, sentences
    current_character = text[accumulator]
    if accumulator == 0:
        return text_evaluate_a(text, text_length, letters + 1, words, sentences, accumulator + 1)
    previous_character = text[accumulator - 1]
    if current_character.isalpha():
        return text_evaluate_a(text, text_length, letters + 1, words, sentences, accumulator + 1)
    elif current_character.isspace() and not previous_character.isspace() and not is_end_mark(previous_character):
        return text_evaluate_a(text, text_length, letters, words + 1, sentences, accumulator + 1)
    elif is_end_mark(current_character) and not is_end_mark(previous_character):
        return text_evaluate_a(text, text_length, letters, words + 1, sentences + 1, accumulator + 1)
    else:
        return text_evaluate_a(text, text_length, letters, words, sentences, accumulator + 1)


def text_evaluate(text):
    return text_evaluate_a(text, len(text) - 1, 0, 0, 0, 0)


def coleman_liau(letters, words, sentences):
    multiplier = 100 / words
    index = round(0.0588 * (letters * multiplier) - 0.296 * (sentences * multiplier) - 15.8)
    if index >= 16:
        return "Grade 16+\n"
    elif index < 1:
        return "Before Grade 1\n"
    else:
        return "Grade " + str(index) + "\n"


print("{}".format(coleman_liau(*(text_evaluate(get_string("Text: "))))), end="")
