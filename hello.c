// Asks for the user's name then greets them
#include <stdio.h>
#include <cs50.h>

int main(void)
{
    printf("Hello, %s.\n", get_string("What's your name?\n"));
    return 0;
}