/**
 * @description nicoty.lib.ls.js - 1.8GB
 * @license BlueOak-1.0.0
 */

import {
  boolean_is_string,
  array_get_strings_matching_regexes,
} from "nicoty.lib.no.netscript.js";

/**
 * @description Returns an array of files from a named server, and whose names contain the given substring(s).
 * @param {Object} object_arguments - Contains the arguments for the function.
 * @param {Object} object_arguments.object_netscript - An instance of the `ns` object.
 * @param {string} object_arguments.string_server - The server on the files are located.
 * @param {string|string[]} object_arguments.substrings - Part(s) of the name(s) of the file(s).
 * @returns {string[]} The array of files, and whose names contain the provided substring(s).
 * @throws Will throw an error if the type of `substring` is not a `string` or an `Array`.
 */
export const array_get_files_with_string = ({
  object_netscript: n,
  string_server: e,
  substrings: s,
}) => {
  if (boolean_is_string(s)) return n.ls(e, s);
  if (Array.isArray(s))
    return s.flatMap((string_substring) =>
      array_get_files_with_string({
        object_netscript: n,
        string_server: e,
        substrings: string_substring,
      })
    );
  {
    const t = `Invalid input "${s}" of type ${typeof s}.`;
    throw (n.print("ERROR: " + t), new Error(t));
  }
};

/**
 * @description If the provided array is empty, returns an array containing the names of all the scripts in the specified server, otherwise, returns an array of the names of files in the specified server that match any of the regular expression patterns specified.
 * @param {Object} object_arguments - Contains the arguments for the function.
 * @param {Object} object_arguments.object_netscript - The Netscript environment.
 * @param {string} object_arguments.string_server - The server on which the files are located.
 * @param {Object[]} object_arguments.array_regexes - Contains regular expression objects that file names will be checked against.
 * @param {boolean} object_arguments.boolean_all - Whether or not file names should match all or only some of the regular expressions.
 * @returns {string[]} If the provided array was empty, contains the names of all scripts in the specified server, otherwise, contains the names of files on the specified server that match any of the regular expression patterns specified.
 */
export const array_get_files_on_server_matching_regexes = ({
  object_netscript: n,
  string_server: s,
  array_regexes: r = [],
  boolean_all: a = !1,
}) =>
  r.length === 0
    ? n.ls(s)
    : array_get_strings_matching_regexes({
      array_strings: n.ls(s),
      array_regexes: r,
      boolean_all: a,
    });

