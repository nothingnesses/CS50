#include <stdio.h>
#include <stdlib.h>
#include <stdbool.h>
#include <errno.h>

bool is_jpg_start(char buffer_input[])
{
    return (buffer_input[0] == '\xFF' &&
            buffer_input[1] == '\xD8' &&
            buffer_input[2] == '\xFF' &&
            (buffer_input[3] & '\xF0') == '\xE0');
}

int main(int argc, char *argv[])
{
    if (argc < 2)
    {
        printf("ERROR: Incorrect usage.\nUsage: %s <image_file>\n", argv[0]);
        return 1;
    }
    FILE *image_file_pointer = fopen(argv[1], "r");
    if (image_file_pointer == NULL)
    {
        printf("ERROR: %d. `fopen` failed to open input file \"%s\" for reading.\n", errno, argv[1]);
        return 1;
    }
    char buffer[512];
    int output_counter = 0;
    bool in_jpg = false;
    // "000.jpg\0"
    char output_name[8];
    FILE *output_file_pointer = NULL;
    // iterate through input file
    for (;;)
    {
        if (fread(buffer, sizeof(buffer), 1, image_file_pointer) >= 1)
        {
            // have read 512 bytes, might not be end of file
            if (in_jpg)
            {
                if (is_jpg_start(buffer))
                {
                    // in jpg, in start of jpg = new jpg file
                    fclose(output_file_pointer);
                    output_name[0] = '\0';
                    snprintf(output_name, sizeof(output_name), "%03d.jpg", ++output_counter);
                    output_file_pointer = fopen(output_name, "a");
                    if (output_file_pointer == NULL)
                    {
                        printf("ERROR: %d. `fopen` failed to open output file \"%s\" for appending.\n", errno, output_name);
                        return 1;
                    }
                    fwrite(buffer, sizeof(buffer), 1, output_file_pointer);
                }
                else
                {
                    // in jpg, not in start of jpg
                    fwrite(buffer, sizeof(buffer), 1, output_file_pointer);
                }
            }
            else if (is_jpg_start(buffer))
            {
                // not in jpg, in start of jpg
                in_jpg = true;
                output_name[0] = '\0';
                snprintf(output_name, sizeof(output_name), "%03d.jpg", output_counter);
                output_file_pointer = fopen(output_name, "a");
                if (output_file_pointer == NULL)
                {
                    printf("ERROR: %d. `fopen` failed to open output file \"%s\" for appending.\n", errno, output_name);
                    return 1;
                }
                fwrite(buffer, sizeof(buffer), 1, output_file_pointer);
            }
        }
        else
        {
            // end of file, close stuff
            if (output_file_pointer != NULL)
            {
                fclose(output_file_pointer);
            }
            fclose(image_file_pointer);
            break;
        }
    }
}
