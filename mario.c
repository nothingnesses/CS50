// mario.c - Prints pyramids
#include <stdio.h>
#include <cs50.h>

// Pesters user until they return a valid value for height
int get_height(int integer)
{
    if (integer > 8 || integer < 1)
    {
        return get_height(get_int("Height: "));
    }
    return integer;
}

// Prints the given amount of a character
int print_character(int value, char character)
{
    if (value > 0)
    {
        putchar(character);
        return print_character(value - 1, character);
    }
    return 0;
}

// Prints the pyramids
int print_pyramids(int height, int accumulator)
{
    if (accumulator > 0)
    {
        const int decremented = accumulator - 1;
        const int pound = height - decremented;
        // Add padding for left pyramid
        print_character(decremented, ' ');
        print_character(pound, '#');
        print_character(2, ' ');
        print_character(pound, '#');
        putchar('\n');
        return print_pyramids(height, decremented);
    }
    return 0;
}

int main(int argc, char const *argv[])
{
    const int height = get_height(get_int("Height: "));
    print_pyramids(height, height);
    return 0;
}
