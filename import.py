import cs50
import csv
import sys


def main():
    if len(sys.argv) != 2:
        print("ERROR: Invalid number of arguments!\nUsage: {} <CSV_FILE>".format(sys.argv[0]))
        return
    students_database = cs50.SQL("sqlite:///students.db")
    with open(sys.argv[1], "r", newline='') as csv_file:
        csv_reader = csv.reader(csv_file)
        next(csv_reader)
        for row in csv_reader:
            # https://stackoverflow.com/a/8461246
            tokens = row[0].split(" ")
            if len(tokens) == 3:
                students_database.execute(
                    "INSERT INTO students (first, middle, last, house, birth) VALUES (?, ?, ?, ?, ?)", tokens[0], tokens[1], tokens[2], row[1], row[2])
            else:
                students_database.execute("INSERT INTO students (first, last, house, birth) VALUES (?, ?, ?, ?)",
                                          tokens[0], tokens[1], row[1], row[2])


main()
