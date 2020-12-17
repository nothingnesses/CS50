import { _ } from "nicoty.lib.lodash.js";
import { mri } from "nicoty.lib.mri.js";

/**
 * clone :: a -> a
 * 
 * Returns a clone of a value.
 * @function
 * @param {any} value - Value to be cloned.
 * @returns {any} Cloned value
 * @function
 * @see {@link https://lodash.com/docs/#cloneDeep|Lodash}
 * @see {@link https://stackoverflow.com/a/54157459|StackOverflow}
 * @see {@link https://stackoverflow.com/a/53737490|StackOverflow}
 * @see {@link https://stackoverflow.com/a/24648941|StackOverflow}
 */
export const clone = value => _.cloneDeep(value);

/**
 * @description Returns an updated object.
 * @param {Object} object_arguments - Contains the arguments for the function.
 * @param {Object} object_arguments.object_original - The original object.
 * @param {Object} object_arguments.object_properties_new - An object whose properties will be used to replace those of the original in the new object to be returned.
 * @returns {Object} The updated object.
 * @todo Make this more functional. Maybe use `entries`, `fromEntries`, `map`, `reduce`, `any_while`.
 */
export const object_get_updated = ({ object_original: o, object_properties_new: n }) => {
  const object_update = clone(n);
  for (const string_property in o) {
    if (!object_update.hasOwnProperty(string_property)) {
      object_update[string_property] = clone(o[string_property]);
    }
  }
  return object_update;
};

/**
 * @description Returns an array of strings that match all or of the regular expression objects specified.
 * @param {Object} object_arguments - Contains the arguments for the function.
 * @param {string[]} object_arguments.array_strings - Contains the strings to check.
 * @param {Object[]} object_arguments.array_regexes - Contains regular expression objects that the strings will be checked against.
 * @param {boolean} object_arguments.boolean_all - Whether or not the strings should match all or some of the regular expressions.
 * @returns {string[]} Contains the strings that match all or some of the regular expression.
 */
export const array_get_strings_matching_regexes = ({
  array_strings: s,
  array_regexes: r,
  boolean_all: a = !1,
}) =>
  void 0 === r
    ? s
    : s
        .filter((string) =>
          a
            ? r
                .map((object_regex) =>
                  new RegExp(
                    object_regex.string_pattern,
                    object_regex.string_flags
                  )
                )
                .every((object_regex) =>
                  object_regex.test(string)
                )
            : r
                .map((object_regex) =>
                  new RegExp(
                    object_regex.string_pattern,
                    object_regex.string_flags
                  )
                )
                .some((object_regex) =>
                  object_regex.test(string)
                )
        );

/**
 * @description Recurses while a condition is true. Not stack-safe.
 * @param {Object} object_arguments - Contains the arguments for the function.
 * @param {any} object_arguments.any_state - The state to process.
 * @param {function} object_arguments.boolean_condition - Processes state to determine whether or not to recurse.
 * @param {function} object_arguments.any_function - Processes state.
 * @returns {any} The output.
 * @todo Make this stack-safe by using trampoline?
 */
export const any_while = ({
  any_state: s,
  boolean_condition: c,
  any_function: f,
}) =>
  c(s)
    ? any_while({
        any_state: f(s),
        boolean_condition: c,
        any_function: f,
      })
    : s;

/**
 * @description Runs a function a certain number of times.
 * @param {Object} object_arguments - Contains the arguments for the function.
 * @param {function} object_arguments.any_function - The function to apply on the state.
 * @param {any[]} object_arguments.object_state - The initial state.
 * @param {number} object_arguments.integer_repeats - The amount of repetitions.
 * @example 
 * const object_plus_two = (object_integer) => ({
 *   any_output: object_integer.any_output + 2,
 * });
 * 
 * export const main = async (object_netscript) => {
 *   object_netscript.tprint(`Output was: ${any_repeat({
 *     object_state: { any_output: 0, },
 *     any_function: object_plus_two,
 *     integer_repeats: 10,
 *   }).any_output}.`); // Output was: 20
 * };
 */
export const any_repeat = ({
  object_state: s,
  integer_repeats: r,
  any_function: f,
  string_property_counter: c = "integer_counter",
}) =>
  any_while({
    any_state: s,
    boolean_condition: (object_state) => object_state[c] < r,
    any_function: (object_state) => object_get_updated({
      object_original: f(object_state),
      object_properties_new: {
        [c]: object_state[c] + 1,
      }
    }),
  });

/**
 * @description Returns `true` if a value is a string, otherwise returns `false`.
 * @param {any} any_value - Value to check.
 * @returns `true` if input is a string, otherwise `false.
 * @see {@link https://lodash.com/docs/#isString|Lodash}
 * @see {@link https://raw.githubusercontent.com/lodash/lodash/4.0.1-npm-packages/lodash.isstring/index.js|Github}
 * @license MIT
 */
export const boolean_is_string = (any_value) =>
  "string" == typeof any_value ||
  (!Array.isArray(any_value) &&
    ((v) => !!v && "object" == typeof v)(any_value) &&
    "[object String]" == Object.prototype.toString.call(any_value));

/**
 * @description Returns an array of server objects.
 * @param {Object} object_arguments - Contains the arguments for the function.
 * @param {Object} object_arguments.object_netscript - The Netscript environment.
 * @param {function} object_arguments.array_method_get_servers - The function to use to get the array of server names.
 * @param {function} object_arguments.object_method_make_server - The function to use to generate objects from the server names.
 * @returns {Object[]} The generated array of server objects.
 */
export const array_make_servers = ({
  object_netscript: n,
  array_method_get_servers: a,
  object_method_make_server: o,
}) => a(n).map((string_server) => o({ object_netscript: n, string_server: string_server}));

/**
 * @description Clamps a value within the inclusive range specified by boundary values. If the value falls within the range, returns it. Otherwise, returns the nearest value in the range.
 * @function
 * @param {Object} object_arguments - Contains the arguments for the function.
 * @param {number} object_arguments.value The value to clamp.
 * @param {number} object_arguments.lower The inclusive lower bound of the range.
 * @param {number} object_arguments.upper The inclusive upper bound of the range.
 * @returns {number} The clamped value.
 */
export const clamp = ({
  value: v,
  lower: l,
  upper: u,
}) => Math.max(Math.min(v, Math.max(l, u)), Math.min(l, u));

/**
 * @description Returns a string with characters converted to their HTML equivalents.
 * @param {string} string - String to sanitise.
 * @returns {string} The sanitised string.
 * @see {@link https://stackoverflow.com/a/30376762|StackOverflow}
 */
export const string_sanitise = (string) =>
  string.replace(
    /[&<>"']/g,
    (s) =>
      ({ "&": "&amp", "<": "&lt", ">": "&gt", '"': "&quot", "'": "&#039" }[s])
  );

/**
 * @description Parses arguments.
 * @param {Object} object_arguments - Contains the arguments for the function.
 * @param {string[]} object_arguments.array_arguments - Array of arguments.
 * @param {Object} [object_arguments.object_options] - Options set for the arguments.
 * @returns {Object} Object populated with the parsed arguments.
 * @see {@link https://github.com/lukeed/mri/blob/dda3343b92b2d96facafaa38f1e55bd1bcbaf7fc/src/index.js|GitHub}
 * @see {@link https://github.com/substack/minimist/|GitHub}
 * @see {@link https://github.com/ethanent/gar|GitHub}
 * @see {@link https://github.com/yargs/yargs-parser|GitHub}
 */
export const object_parse_arguments = ({
  array_arguments,
  object_options,
}) => mri(array_arguments, object_options);

