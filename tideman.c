#include <cs50.h>
#include <stdio.h>
#include <string.h>
#include <math.h>

// Max number of candidates
#define MAX 9

// preferences[i][j] is number of voters who prefer i over j
int preferences[MAX][MAX];

// locked[i][j] means i is locked in over j
bool locked[MAX][MAX];

// Each pair has a winner, loser
typedef struct
{
    int winner;
    int loser;
}
pair;

// Array of candidates
string candidates[MAX];
pair pairs[MAX * (MAX - 1) / 2];

int pair_count;
int candidate_count;
int winners_indices[MAX];

// Function prototypes
bool vote(int rank, string name, int ranks[]);
void record_preferences(int ranks[]);
void add_pairs(void);
void sort_pairs(void);
void lock_pairs(void);
void print_winner(void);

int main(int argc, string argv[])
{
    // Check for invalid usage
    if (argc < 2)
    {
        printf("Usage: tideman [candidate ...]\n");
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
        candidates[i] = argv[i + 1];
    }

    // Clear graph of locked in pairs
    for (int i = 0; i < candidate_count; i++)
    {
        for (int j = 0; j < candidate_count; j++)
        {
            locked[i][j] = false;
        }
    }

    pair_count = 0;
    int voter_count = get_int("Number of voters: ");

    // Query for votes
    for (int i = 0; i < voter_count; i++)
    {
        // ranks[i] is voter's ith preference
        int ranks[candidate_count];

        // Query for each rank
        for (int j = 0; j < candidate_count; j++)
        {
            string name = get_string("Rank %i: ", j + 1);

            if (!vote(j, name, ranks))
            {
                printf("Invalid vote.\n");
                return 3;
            }
        }

        record_preferences(ranks);

        printf("\n");
    }

    add_pairs();
    sort_pairs();
    lock_pairs();
    print_winner();
    return 0;
}

// Update ranks given a new vote
bool vote(int rank, string name, int ranks[])
{
    for (int candidates_index = 0; candidates_index < candidate_count; ++candidates_index)
    {
        if (strcmp(candidates[candidates_index], name) == 0) {
            ranks[rank] = candidates_index;
            return true;
        }
    }
    return false;
}

// Update preferences given one voter's ranks
void record_preferences(int ranks[])
{
    for (int ranks_index_a = 1; ranks_index_a < candidate_count; ++ranks_index_a) {
        for (int ranks_index_b = ranks_index_a - 1; ranks_index_b >= 0; --ranks_index_b) {
            ++preferences[ranks[ranks_index_b]][ranks[ranks_index_a]];
        }
    }
    return;
}

// Record pairs of candidates where one is preferred over the other
void add_pairs(void)
{
    for (int preferences_index_a = 0; preferences_index_a < MAX; ++preferences_index_a) {
        for (int preferences_index_b = preferences_index_a - 1; preferences_index_b >= 0; --preferences_index_b) {
            if (preferences[preferences_index_a][preferences_index_b] != preferences[preferences_index_b][preferences_index_a]) {
                (preferences[preferences_index_a][preferences_index_b] > preferences[preferences_index_b][preferences_index_a])
                    ? (pairs[pair_count] = (pair){
                        preferences_index_a,
                        preferences_index_b
                    })
                    : (pairs[pair_count] = (pair){
                        preferences_index_b,
                        preferences_index_a
                    });
                ++pair_count;
            }
        }
    }
    return;
}

typedef int (*function_type_a)(pair);

int strength(pair input) {
    return preferences[input.loser][input.winner] - preferences[input.winner][input.loser];
}

void merge(pair old_array[], pair new_array[], int left_index_input, int right_index_input, int right_end, function_type_a callback_function) {
    int left_index = left_index_input;
    int right_index = right_index_input;
    int new_array_index = left_index_input;
    for (; new_array_index < right_end; ++new_array_index) {
        (left_index < right_index_input && (right_index >= right_end || callback_function(old_array[left_index]) <= callback_function(old_array[right_index])))
          ? (new_array[new_array_index] = old_array[left_index++])
          : (new_array[new_array_index] = old_array[right_index++]);
    }
}

int mininum(int const a, int const b) {
    return (a > b)
      ? b
      : a;
}

void merge_sort(pair input_array[], pair scratch_array[], int array_size) {
    pair **input_array_address = &input_array;
    pair **scratch_array_address = &scratch_array;
    for (int sub_array_size = 1; sub_array_size < array_size; sub_array_size *= 2) {
        for (int index = 0; index < array_size; index += 2 * sub_array_size) {
            merge(*input_array_address, *scratch_array_address, index, mininum(index + sub_array_size, array_size), mininum(index + 2 * sub_array_size, array_size), (function_type_a)&strength);
        }
        // Swap where the array pointers are pointing to
        (input_array_address == &input_array)
          ? (input_array_address = &scratch_array, scratch_array_address = &input_array)
          : (input_array_address = &input_array, scratch_array_address = &scratch_array);
    }
    // Copy scratch array contents to `input_array` if it was the last `new_array` used in the last merge (i.e., it contains the fully sorted array)
    if ((int)ceil(log2(array_size)) % 2 != 0) {
        memcpy(input_array, scratch_array, sizeof(pair) * array_size);
    }
}

// Sort pairs in decreasing order by strength of victory
void sort_pairs(void)
{
    pair pairs_temporary[MAX * (MAX - 1) / 2];
    merge_sort(pairs, pairs_temporary, MAX * (MAX - 1) / 2);
    return;
}

// Lock pairs into the candidate graph in order, without creating cycles
void lock_pairs(void)
{
    int ancestors[MAX][MAX];
    memset(ancestors, -1, sizeof(ancestors));
    int ancestors_indices[MAX] = { 0 };
    int ancestors_buffer[MAX][MAX];
    memset(ancestors_buffer, -1, sizeof(ancestors_buffer));
    int ancestors_indices_buffer[MAX] = { 0 };
    for (int pairs_index = 0; pairs_index < pair_count; ++pairs_index) {
        bool is_cyclic = false;
        locked[pairs[pairs_index].winner][pairs[pairs_index].loser] = true;
        // winner is ancestor of loser and all its descendants
        // for all candidates, check if they have loser as ancestor or if they are loser. if so, append winner as another ancestor if it isn't already one
        for (int candidate = 0; candidate < MAX; ++candidate) {
            bool loser_is_ancestor = false;
            bool winner_is_already_in_ancestors_array = false;
            is_cyclic = false;
            for (int ancestor_index = 0; ancestor_index < MAX && ancestors_buffer[candidate][ancestor_index] > -1; ++ancestor_index) {
                if (ancestors_buffer[candidate][ancestor_index] == pairs[pairs_index].winner) {
                    // candidate is its own ancestor = cyclic, revert changes
                    locked[pairs[pairs_index].winner][pairs[pairs_index].loser] = false;
                    memcpy(ancestors_buffer, ancestors, sizeof(int) * MAX * MAX);
                    memcpy(ancestors_indices_buffer, ancestors_indices, sizeof(int) * MAX);
                    is_cyclic = true;
                    break;
                } else if (ancestors_buffer[candidate][ancestor_index] == pairs[pairs_index].loser) {
                    loser_is_ancestor = true;
                } else if (ancestors_buffer[candidate][ancestor_index] == pairs[pairs_index].winner) {
                    winner_is_already_in_ancestors_array = true;
                }
            }
            if (is_cyclic) {
                break;
            } else if ((loser_is_ancestor || candidate == pairs[pairs_index].loser) && !winner_is_already_in_ancestors_array) {
                // append winner to ancestors_buffer array
                ancestors_buffer[candidate][ancestors_indices_buffer[candidate]] = pairs[pairs_index].winner;
                ++ancestors_indices_buffer[candidate];
            }
        }
        if (!is_cyclic) {
            // no cycle detected, apply changes
            memcpy(ancestors, ancestors_buffer, sizeof(int) * MAX * MAX);
            memcpy(ancestors_indices, ancestors_indices_buffer, sizeof(int) * MAX);
        }
    }
    // update winners_indices
    memset(winners_indices, -1, sizeof(winners_indices));
    int winners_indices_index = 0;
    winners_indices[winners_indices_index] = ancestors_indices[0];
    for (int ancestors_indices_index = 0; ancestors_indices_index < candidate_count; ++ancestors_indices_index) {
        if (ancestors_indices[ancestors_indices_index] == 0) {
            winners_indices[winners_indices_index++] = ancestors_indices_index;
        }
    }
    return;
}

// Print the winner of the election
void print_winner(void)
{
    for (int winner_indices_index = 0; winners_indices[winner_indices_index] > -1; ++winner_indices_index) {
        printf("%s\n", candidates[winners_indices[winner_indices_index]]);
    }
    return;
}

