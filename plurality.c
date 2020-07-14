#include <cs50.h>
#include <stdio.h>
#include <string.h>

// Max number of candidates
#define MAX 9

// Candidates have name and vote count
typedef struct
{
    string name;
    int votes;
}
candidate;

// Array of candidates
candidate candidates[MAX];

// Number of candidates
int candidate_count;

// Function prototypes
bool vote(string name);
void print_winner(void);

int main(int argc, string argv[])
{
    // Check for invalid usage
    if (argc < 2)
    {
        printf("Usage: plurality [candidate ...]\n");
        return 1;
    }

    // Populate array of candidates
    candidate_count = argc - 1;
    if (candidate_count > MAX)
    {
        printf("Maximum number of candidates is %i\n", MAX);
        return 2;
    }
    for (int i = 0; i < candidate_count; i++)
    {
        candidates[i].name = argv[i + 1];
        candidates[i].votes = 0;
    }

    int voter_count = get_int("Number of voters: ");

    // Loop over all voters
    for (int i = 0; i < voter_count; i++)
    {
        string name = get_string("Vote: ");

        // Check for invalid vote
        if (!vote(name))
        {
            printf("Invalid vote.\n");
        }
    }

    // Display winner of election
    print_winner();
}

// Update vote totals given a new vote
bool vote(string name)
{
    for (int candidates_index = 0; candidates_index < candidate_count; ++candidates_index)
    {
        if (strcmp(candidates[candidates_index].name, name) == 0) {
            ++candidates[candidates_index].votes;
            return true;
        }
    }
    return false;
}

// Print the winner (or winners) of the election
void print_winner(void)
{
    candidate winners[MAX];
    int highest_score = 0;
    int winners_index = 0;
    for (int candidates_index = 0; candidates_index < candidate_count; ++candidates_index)
    {
        if (candidates[candidates_index].votes > highest_score) {
            for (; winners_index >= 0; --winners_index) {
                winners[winners_index] = winners[MAX - 1];
            }
            winners_index = 0;
            highest_score = candidates[candidates_index].votes;
        }
        if (candidates[candidates_index].votes >= highest_score) {
            winners[winners_index] = candidates[candidates_index];
            ++winners_index;
        }
    }
    for (; winners_index >= 0; --winners_index) {
        printf("%s\n", winners[winners_index].name);
    }
    return;
}

