import csv
import sys


def get_repeat_counts(repeat_sequences, text_file_sequence):
    output = []
    sequence_length = len(text_file_sequence)
    for repeat_sequence in repeat_sequences:
        maximum_repeat_count = 0
        current_repeat_count = 0
        repeat_length = len(repeat_sequence)
        sequence_index = 0
        # iterate through input sequence characters
        while sequence_length > sequence_index:
            if text_file_sequence[sequence_index:sequence_index + repeat_length] == repeat_sequence:
                # current character is the start of a repeat
                current_repeat_count = 1
                sequence_index += repeat_length
                # check repeat count
                is_repeat = True
                while is_repeat:
                    if text_file_sequence[sequence_index:sequence_index + repeat_length] == repeat_sequence:
                        current_repeat_count += 1
                        sequence_index += repeat_length
                    else:
                        is_repeat = False
                        if current_repeat_count > maximum_repeat_count:
                            maximum_repeat_count = current_repeat_count
            sequence_index += 1
        output.append(str(maximum_repeat_count))
    return output


def main():
    if len(sys.argv) != 3:
        print("ERROR: Invalid number of arguments!\nUsage: {} <STR_COUNTS_CSV_FILE> <DNA_SEQUENCE_TEXT_FILE>".format(sys.argv[0]))
        return
    with open(sys.argv[1], "r", newline='') as csv_file, open(sys.argv[2], "r") as text_file:
        csv_reader = csv.reader(csv_file)
        text_file_contents = text_file.read()
        repeat_counts = get_repeat_counts(next(csv_reader)[1:], text_file_contents)
        # iterate through each row
        for row in csv_reader:
            if row[1:] == repeat_counts:
                print(row[0])
                return
    print("No match")


main()
