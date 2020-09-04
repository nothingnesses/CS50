import cs50
import sys


def main():
    if len(sys.argv) != 2:
        print("ERROR: Invalid number of arguments!\nUsage: {} <HOUSE>".format(sys.argv[0]))
        return
    students_database = cs50.SQL("sqlite:///students.db")
    query_output = students_database.execute(
        "SELECT first, middle, last, birth FROM students WHERE house = ? ORDER BY last, first", sys.argv[1])
    for row in query_output:
        if row["middle"] == None:
            print("{} {}, born {}".format(row["first"], row["last"], row["birth"]))
        else:
            print("{} {} {}, born {}".format(row["first"], row["middle"], row["last"], row["birth"]))


main()
