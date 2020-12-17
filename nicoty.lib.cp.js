/**
 * @description nicoty.lib.cp.js - 2.65GB
 * @license BlueOak-1.0.0
 */

 import {
  array_get_servers,
} from "nicoty.lib.servers.js";
import {
  array_get_files_on_server_matching_regexes,
  array_get_files_with_string,
} from "nicoty.lib.ls.js";

/**
 * @description Copies files to all servers.
 * @param {Object} object_arguments - Contains the arguments for the function.
 * @param {Object} object_arguments.object_netscript - The Netscript environment.
 * @param {number} object_arguments.string_substrings - (Parts of) the names of the files to copy.
 */
export const void_copy_files = ({
  object_netscript: n,
  string_substrings: s,
}) => {
  const string_server_source = n.getHostname(),
    array_files = array_get_files_with_string({
      object_netscript: n,
      string_server: string_server_source,
      substrings: s,
    });
  array_get_servers({
    object_netscript: n,
  }).forEach((string_server_destination) =>
    n.scp(
      array_files,
      string_server_source,
      string_server_destination
    )
  );
};

/**
 * @description Copies (a) file(s) from the specidied server to the current server.
 * @param {Object} object_arguments - Contains the arguments for the function.
 * @param {string|string[]} object_arguments.files_to_copy - The file or array of files to copy.
 * @param {string} object_arguments.string_server_source - The name of the server from which to copy the file(s).
 * @param {boolean} object_arguments.boolean_silent - Whether or not to print any messages to the terminal.
 */
const void_copy_to_current = ({
  object_netscript: n,
  files_to_copy: c,
  string_server_source: s,
  boolean_silent: b,
}) => {
  if (b)
    try {
      n.scp(c, s, n.getHostname()),
        n.tprint(
          `Copied "${JSON.stringify(c)}" located in the server "${s}".`
        );
    } catch (object_exception) {
      n.tprint(
        `${object_exception}\nAttempted to copy "${JSON.stringify(
          c
        )}" located in the server "${s}".`
      );
    }
  else
    try {
      n.scp(c, s, n.getHostname());
    } catch (object_exception) {}
};

/**
 * @description Copies any files that match any of the specified regular expressions from all servers to the current server.
 * @param {Object} object_arguments - Contains the arguments for the function.
 * @param {string[]} object_arguments.array_patterns - Contains the regular expression patterns to match.
 * @param {boolean} object_arguments.boolean_silent - Whether or not to print any messages to the terminal.
 */
export const void_copy_matched_to_current = ({
  object_netscript: n,
  array_patterns: p,
  boolean_silent: b,
}) => {
  array_get_servers({ object_netscript: n }).forEach((string_server) => {
    const array_files = array_get_files_on_server_matching_regexes({
      object_netscript: n,
      string_server: string_server,
      array_regexes: p.map(
        (string_pattern) =>
          ({
            string_pattern: string_pattern,
            string_flags: "i",
          })
      ),
      boolean_all: !1,
    });
    array_files.length > 0 &&
      void_copy_to_current({
        files_to_copy: array_files,
        string_server_source: string_server,
        boolean_silent: b,
      });
  });
};
