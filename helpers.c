#include "helpers.h"
#include "math.h"
#include "string.h"

// Convert pixel to greyscale
void pixel_greyscale(RGBTRIPLE *pixel) {
    BYTE colour = (BYTE)(round((((float)pixel->rgbtBlue + (float)pixel->rgbtGreen + (float)pixel->rgbtRed) / 3)));
    *pixel = (RGBTRIPLE){
        colour,
        colour,
        colour
    };
}

// Convert image to grayscale
void grayscale(int height, int width, RGBTRIPLE image[height][width])
{
    for (int row = 0; row < height; ++row) {
        for (int column = 0; column < width; ++column) {
            pixel_greyscale(&image[row][column]);
        }
    }
    return;
}

// Reflect image horizontally
void reflect(int height, int width, RGBTRIPLE image[height][width])
{
  RGBTRIPLE scratch_image[height][width];
  memcpy(scratch_image, image, sizeof(RGBTRIPLE) * height * width);
  for (int row = 0; row < height; ++row) {
    int image_column = 0;
    int scratch_image_column = width - 1;
    for (; image_column < width;) {
      image[row][image_column++] = scratch_image[row][scratch_image_column--];
    }
  }
  return;
}

typedef struct RGB {
    int red;
    int green;
    int blue;
} RGB;

// Blur image
void blur(int height, int width, RGBTRIPLE image[height][width])
{
    RGBTRIPLE scratch_image[height][width];
    memcpy(scratch_image, image, sizeof(RGBTRIPLE) * height * width);
  for (int row = 0; row < height; ++row) {
    for (int column = 0; column < width; ++column) {
        int pixels = 1;
        RGB pixel = (RGB){
            (int)scratch_image[row][column].rgbtRed,
            (int)scratch_image[row][column].rgbtGreen,
            (int)scratch_image[row][column].rgbtBlue
        };
        // top left exists
        if (row >= 1 && column >= 1) {
            pixel.red += (int)scratch_image[row - 1][column - 1].rgbtRed;
            pixel.green += (int)scratch_image[row - 1][column - 1].rgbtGreen;
            pixel.blue += (int)scratch_image[row - 1][column - 1].rgbtBlue;
            ++pixels;
        }
        // top exists
        if (row >= 1) {
            pixel.red += (int)scratch_image[row - 1][column].rgbtRed;
            pixel.green += (int)scratch_image[row - 1][column].rgbtGreen;
            pixel.blue += (int)scratch_image[row - 1][column].rgbtBlue;
            ++pixels;
        }
        // top right exists
        if (row >= 1 && column < width - 1) {
            pixel.red += (int)scratch_image[row - 1][column + 1].rgbtRed;
            pixel.green += (int)scratch_image[row - 1][column + 1].rgbtGreen;
            pixel.blue += (int)scratch_image[row - 1][column + 1].rgbtBlue;
            ++pixels;
        }
        // left exists
        if (column >= 1) {
            pixel.red += (int)scratch_image[row][column - 1].rgbtRed;
            pixel.green += (int)scratch_image[row][column - 1].rgbtGreen;
            pixel.blue += (int)scratch_image[row][column - 1].rgbtBlue;
            ++pixels;
        }
        // right exists
        if (column < width - 1) {
            pixel.red += (int)scratch_image[row][column + 1].rgbtRed;
            pixel.green += (int)scratch_image[row][column + 1].rgbtGreen;
            pixel.blue += (int)scratch_image[row][column + 1].rgbtBlue;
            ++pixels;
        }
        // bottom left exists
        if (row < height && column >= 1) {
            pixel.red += (int)scratch_image[row + 1][column - 1].rgbtRed;
            pixel.green += (int)scratch_image[row + 1][column - 1].rgbtGreen;
            pixel.blue += (int)scratch_image[row + 1][column - 1].rgbtBlue;
            ++pixels;
        }
        // bottom exists
        if (row < height) {
            pixel.red += (int)scratch_image[row + 1][column].rgbtRed;
            pixel.green += (int)scratch_image[row + 1][column].rgbtGreen;
            pixel.blue += (int)scratch_image[row + 1][column].rgbtBlue;
            ++pixels;
        }
        // bottom right exists
        if (row < height && column < width - 1) {
            pixel.red += (int)scratch_image[row + 1][column + 1].rgbtRed;
            pixel.green += (int)scratch_image[row + 1][column + 1].rgbtGreen;
            pixel.blue += (int)scratch_image[row + 1][column + 1].rgbtBlue;
            ++pixels;
        }
        image[row][column] = (RGBTRIPLE){
            (BYTE)(round((float)pixel.blue / (float)pixels)),
            (BYTE)(round((float)pixel.green / (float)pixels)),
            (BYTE)(round((float)pixel.red / (float)pixels))
        };
    }
  }
    return;
}

BYTE byte_cap(float input) {
    return(input > 255)
      ? 255
      : input;
}

// Detect edges
void edges(int height, int width, RGBTRIPLE image[height][width])
{
    RGBTRIPLE scratch_image[height + 2][width];
    memcpy(scratch_image, image, sizeof(RGBTRIPLE) * height * width);
  for (int row = 0; row < height; ++row) {
    for (int column = 0; column < width; ++column) {
        RGB Gx = (RGB){
            0,
            0,
            0
        };
        RGB Gy = (RGB){
            0,
            0,
            0
        };
        // top left exists
        if (row >= 1 && column >= 1) {
            Gx.red += (int)scratch_image[row - 1][column - 1].rgbtRed * -1;
            Gx.green += (int)scratch_image[row - 1][column - 1].rgbtGreen * -1;
            Gx.blue += (int)scratch_image[row - 1][column - 1].rgbtBlue * -1;
            Gy.red += (int)scratch_image[row - 1][column - 1].rgbtRed * -1;
            Gy.green += (int)scratch_image[row - 1][column - 1].rgbtGreen * -1;
            Gy.blue += (int)scratch_image[row - 1][column - 1].rgbtBlue * -1;
        }
        // top exists
        if (row >= 1) {
            Gy.red += (int)scratch_image[row - 1][column].rgbtRed * -2;
            Gy.green += (int)scratch_image[row - 1][column].rgbtGreen * -2;
            Gy.blue += (int)scratch_image[row - 1][column].rgbtBlue * -2;
        }
        // top right exists
        if (row >= 1 && column < width - 1) {
            Gx.red += (int)scratch_image[row - 1][column + 1].rgbtRed;
            Gx.green += (int)scratch_image[row - 1][column + 1].rgbtGreen;
            Gx.blue += (int)scratch_image[row - 1][column + 1].rgbtBlue;
            Gy.red += (int)scratch_image[row - 1][column + 1].rgbtRed * -1;
            Gy.green += (int)scratch_image[row - 1][column + 1].rgbtGreen * -1;
            Gy.blue += (int)scratch_image[row - 1][column + 1].rgbtBlue * -1;
        }
        // left exists
        if (column >= 1) {
            Gx.red += (int)scratch_image[row][column - 1].rgbtRed * -2;
            Gx.green += (int)scratch_image[row][column - 1].rgbtGreen * -2;
            Gx.blue += (int)scratch_image[row][column - 1].rgbtBlue * -2;
        }
        // right exists
        if (column < width - 1) {
            Gx.red += (int)scratch_image[row][column + 1].rgbtRed * 2;
            Gx.green += (int)scratch_image[row][column + 1].rgbtGreen * 2;
            Gx.blue += (int)scratch_image[row][column + 1].rgbtBlue * 2;
        }
        // bottom left exists
        if (row < height && column >= 1) {
            Gx.red += (int)scratch_image[row + 1][column - 1].rgbtRed * -1;
            Gx.green += (int)scratch_image[row + 1][column - 1].rgbtGreen * -1;
            Gx.blue += (int)scratch_image[row + 1][column - 1].rgbtBlue * -1;
            Gy.red += (int)scratch_image[row + 1][column - 1].rgbtRed;
            Gy.green += (int)scratch_image[row + 1][column - 1].rgbtGreen;
            Gy.blue += (int)scratch_image[row + 1][column - 1].rgbtBlue;
        }
        // bottom exists
        if (row < height) {
            Gy.red += (int)scratch_image[row + 1][column].rgbtRed * 2;
            Gy.green += (int)scratch_image[row + 1][column].rgbtGreen * 2;
            Gy.blue += (int)scratch_image[row + 1][column].rgbtBlue * 2;
        }
        // bottom right exists
        if (row < height && column < width - 1) {
            Gx.red += (int)scratch_image[row + 1][column + 1].rgbtRed;
            Gx.green += (int)scratch_image[row + 1][column + 1].rgbtGreen;
            Gx.blue += (int)scratch_image[row + 1][column + 1].rgbtBlue;
            Gy.red += (int)scratch_image[row + 1][column + 1].rgbtRed;
            Gy.green += (int)scratch_image[row + 1][column + 1].rgbtGreen;
            Gy.blue += (int)scratch_image[row + 1][column + 1].rgbtBlue;
        }
        image[row][column] = (RGBTRIPLE){
            byte_cap(round(pow(pow((float)Gx.blue, 2) + pow((float)Gy.blue, 2), 0.5))),
            byte_cap(round(pow(pow((float)Gx.green, 2) + pow((float)Gy.green, 2), 0.5))),
            byte_cap(round(pow(pow((float)Gx.red, 2) + pow((float)Gy.red, 2), 0.5)))
        };
    }
  }
    return;
}
