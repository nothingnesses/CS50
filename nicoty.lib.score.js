/**
 * @description nicoty.lib.score.js - 2.25GB
 * @license BlueOak-1.0.0
 */

import {
  array_get_servers_rooted,
} from "nicoty.lib.root.js";

/**
 * @description Returns the average of an array of numbers.
 * @param {number[]} n - The array of numbers to calculate the average of.
 * @returns {number} The average.
 */
const float_get_mean = (n) =>
  n.reduce(
    (float_accumulator, float_current) =>
      float_accumulator + float_current
  ) / n.length;

/**
 * @description Returns the variance of an array of numbers.
 * @param {Object} object_arguments - Contains the arguments for the function.
 * @param {number[]} object_arguments.array_numbers - The array of numbers to calculate the variance of.
 * @param {number} [object_arguments.float_mean] - Optional mean of the numbers.
 * @returns {number} The variance.
 */
const float_get_variance = ({
  array_numbers: n,
  float_mean: m = float_get_mean(n),
}) =>
  n.reduce(
    (float_accumulator, float_current) =>
      float_accumulator +
      Math.pow(float_current - m, 2)
  ) / n.length;

/**
 * @description Returns the standard deviation of an array of numbers.
 * @param {Object} object_arguments - Contains the arguments for the function.
 * @param {number[]} object_arguments.array_numbers - The array of numbers to calculate the standard deviation of.
 * @param {number} [object_arguments.float_mean] - Optional mean of the numbers.
 * @returns {number} The standard deviation.
 */
const float_get_standard_deviation = ({
  array_numbers: n,
  float_mean: m = float_get_mean(n),
}) => Math.sqrt(float_get_variance({ array_numbers: n, float_mean: m }));

// Score correction methods.

/**
 * @description Returns the standardised version of a number.
 * @param {Object} object_arguments - Contains the arguments for the function.
 * @param {number} object_arguments.float_original - The number to correct.
 * @param {number[]} object_arguments.array_numbers - The array of numbers that the number to correct is a part of.
 * @returns {number} The standardised number.
 */
const float_get_standard_score = ({ float_original: o, array_numbers: n }) => {
  const float_mean = float_get_mean(n);
  return (
    (o - float_mean) /
    float_get_standard_deviation({
      array_numbers: n,
      float_mean: float_mean,
    })
  );
};

/**
 * @description Returns the range of an array of numbers.
 * @param {number[]} array_numbers - The array of numbers to calculate the range of.
 * @returns {number} The range.
 */
const float_get_range = (array_numbers) => {
  let float_minimum,
    float_maximum;
  return (
    array_numbers.forEach((float_number) => {
      float_number < float_minimum
        ? (float_minimum = float_number)
        : float_number > float_maximum &&
          (float_maximum = float_number);
    }),
    float_maximum - float_minimum
  );
};

/**
 * @description Returns the mean-normalised version of a number.
 * @param {Object} object_arguments - Contains the arguments for the function.
 * @param {number} object_arguments.float_original - The number to correct.
 * @param {number[]} object_arguments.array_numbers - The array of numbers that the number to correct is a part of.
 * @returns {number} The mean-normalised number.
 */
const float_get_mean_normalised_score = ({
  float_original: o,
  array_numbers: n,
}) => (o - float_get_mean(n)) / float_get_range(n);

/**
 * @description Returns an array of scores of a trait of the servers.
 * @param {Object} object_arguments - Contains the arguments for the function.
 * @param {Object} object_arguments.object_netscript - The Netscript environment.
 * @param {string[]} object_arguments.array_servers - An array of server names.
 * @param {function} object_arguments.float_get_trait_score - Function to use to get a score for a trait of the servers.
 * @returns {number[]} Contains the trait scores of the servers.
 */
const array_get_servers_trait = ({
  object_netscript: n,
  array_servers: s,
  float_get_trait_score: f,
}) =>
  s.map((string_server) =>
    f({
      object_netscript: n,
      string_server: string_server,
    }));

/**
 * @description Gives a score for how well you will be able to hack a server (how much cash you can take per hack, how long it takes and your chances of hacking it successfully) given your current hacking level and its required hacking level. Adapted from {@link `calculateHackingChance`}, {@link `calculatePercentMoneyHacked`}, and {@link `calculateHackingTime`} in {@link https://github.com/danielyxie/bitburner/blob/master/src/Hacking.js|Bitburner's source code}.
 * @param {Object} object_arguments - Contains the arguments for the function.
 * @param {Object} object_arguments.object_netscript - The Netscript environment.
 * @param {string} object_arguments.string_server - The server to calculate a "skill against" score for.
 * @returns {number} The server's "skill against" score.
 * @see {@link `calculateHackingChance`}, {@link `calculatePercentMoneyHacked`}, and {@link `calculateHackingTime`} in {@link https://github.com/danielyxie/bitburner/blob/master/src/Hacking.js|Bitburner's source code}.
 */
const float_get_skill_against = ({ object_netscript: n, string_server: s }) => {
  const float_skill_hack = n.getHackingLevel();
  return (float_skill_hack - n.getServerRequiredHackingLevel(s)) / float_skill_hack;
};

/**
 * @description Returns the maximum amount of money that can be available on a server.
 * @param {Object} object_arguments - Contains the arguments for the function.
 * @param {Object} object_arguments.object_netscript - The Netscript environment.
 * @param {string} object_arguments.string_server - The server to determine the maximum possible money of.
 * @returns {number} The maximum amount of money that can be available on a server.
 */
const float_get_server_cash_max = ({ object_netscript: n, string_server: s }) => n.getServerMaxMoney(s);

/**
 * @description Returns the server's instrinsic "growth parameter". This growth parameter is a number
    between 1 and 100 that represents how quickly the server's money grows. This parameter affects the
    percentage by which the server's money is increased when using the `grow()` Netscript function. A higher
    growth parameter will result in a higher percentage increase from `grow()`.
 * @param {Object} object_arguments - Contains the arguments for the function.
 * @param {Object} object_arguments.object_netscript - The Netscript environment.
 * @param {string} object_arguments.string_server - The server to determine the growth parameter of.
 * @returns {number} The server's growth parameter.
 */
const float_get_server_growth = ({ object_netscript: n, string_server: s }) => n.getServerGrowth(s);

/**
 * @description Returns an array of server names of servers that are suitable for hacking; i.e., they are rooted, have required hacking levels <= player's current hacking level, growth parameters > 0 and maximum available money > 0.
 * @param {Object} object_netscript - The Netscript environment.
 * @returns {string[]} Contains names of servers that are suitable for hacking.
 */
export const array_get_servers_hackable = (object_netscript) =>
  array_get_servers_rooted(object_netscript).filter(
    (string_server) =>
      object_netscript.getHackingLevel() >= object_netscript.getServerRequiredHackingLevel(string_server) &&
      object_netscript.getServerMaxMoney(string_server) > 0 &&
      object_netscript.getServerGrowth(string_server) > 0
  );

/**
 * @description Returns the corrected score for a server's trait.
 * @param {Object} object_arguments - Contains the arguments for the function.
 * @param {Object} object_arguments.object_netscript - The Netscript environment.
 * @param {string} object_arguments.string_server - The server to calculate the trait of.
 * @param {function} object_arguments.float_get_trait_score - Function to use to get a score for a trait of the servers.
 * @param {function} object_arguments.function_score_correction - Function to use to correct the score.
 * @returns {number[]} Contains the trait scores of the servers.
 */
const float_get_score_factor = ({
  object_netscript: n,
  string_server: s,
  float_get_trait_score: t,
  function_score_correction: c,
}) =>
  c({
    float_original: t({ object_netscript: n, string_server: s }),
    array_numbers: array_get_servers_trait({
      object_netscript: n,
      array_servers: array_get_servers_hackable(n),
      float_get_trait_score: t,
    }),
  });

/**
 * @description Returns the score of a server which is calculated by taking into account its maximum available cash, its growth rate and your skill against it as factors which are corrected and summed.
 * @param {Object} object_arguments - Contains the arguments for the function.
 * @param {Object} object_arguments.object_netscript - The Netscript environment.
 * @param {string} object_arguments.string_server - The server to calculate the score of.
 * @param {string} [object_arguments.boolean_method_score_correction] - Whether to use standardised or mean-normalised score corrections. If `true`, uses mean-normalisation, otherwise uses standardisation. Defaults to `false`.
 * @param {number} [object_arguments.float_multiplier_factor_skill] - Optional muliplier for the "skill against" score factor of the server. Defaults to 1.
 * @param {number} [object_arguments.float_multiplier_factor_max_cash] - Optional muliplier for the "max cash" score factor of the server. Defaults to 1.
 * @param {number} [object_arguments.float_multiplier_factor_growth] - Optional muliplier for the "growth" score factor of the server. Defaults to 1.
 * @returns {number} The aggregated, corrected score.
 */
export const float_get_server_score = ({
  object_netscript: n,
  string_server: s,
  boolean_method_score_correction: b = !1,
  float_multiplier_factor_skill: a = 1,
  float_multiplier_factor_max_cash: m = 1,
  float_multiplier_factor_growth: g = 1,
}) => {
  const function_score_correction = b ? float_get_mean_normalised_score : float_get_standard_score;
  // Can adjust the weights of the factors. 1 = factor has normal importance, > 1 = factor has more importance, < 1 = factor has less importance, 0 = factor is not used, < 0 = factor has negative effect.
  return (
    a *
      float_get_score_factor({
        object_netscript: n,
        string_server: s,
        float_get_trait_score: float_get_skill_against,
        function_score_correction: function_score_correction,
      }) +
    m *
      float_get_score_factor({
        object_netscript: n,
        string_server: s,
        float_get_trait_score: float_get_server_cash_max,
        function_score_correction: function_score_correction,
      }) +
    g *
      float_get_score_factor({
        object_netscript: n,
        string_server: s,
        float_get_trait_score: float_get_server_growth,
        function_score_correction: function_score_correction,
      })
  );
};
