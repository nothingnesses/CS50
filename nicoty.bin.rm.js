/**
 * @description nicoty.bin.rm.js - 3.05GB - Removes files.
 * @license BlueOak-1.0.0
 */

import {
  string_sanitise,
  object_parse_arguments,
} from "nicoty.lib.no.netscript.js";
import {
  array_get_servers_matching_regexes,
} from "nicoty.lib.servers.js";
import {
  array_get_files_on_server_matching_regexes,
} from "nicoty.lib.ls.js";

/**
 * @description Constants.
 * @readonly
 * @property {Object} object_defaults - Contains default values for script's arguments.
 * @property {boolean} object_defaults.boolean_some - Whether or not all regular expressions should be matched.
 * @property {Object} object_argument_names - Contains argument names.
 */
const object_constants = {
  object_defaults: {
    boolean_all: !1
  },
  object_argument_names: {
    file_regex: {
      short: "f",
      long: "file"
    },
    server_regex: {
      short: "e",
      long: "server"
    },
    help: {
      short: "h",
      long: "help"
    },
    all: {
      short: "a",
      long: "all"
    },
  },
};

/**
 * @param {Object} object_netscript - The Netscript environment.
 */
export const main = async (object_netscript) => {
  /**
   * @description Prints a help message to the terminal.
   */
  const void_print_help = () => {
    const object_argument_names = object_constants.object_argument_names,
      string_script = object_netscript.getScriptName();
    object_netscript.tprint(
      string_sanitise(`
DESCRIPTION
  Removes all removable files (which excludes currently running scripts, including this one).
  Optionally, removes only files whose names match a given regular expression.
  Optionally, removes only files on servers whose names match a given regular expression.
  Optionally, removes only files whose names match a given regular expression on servers whose names match a given regular expression.

USAGE
  run ${string_script} [FLAGS ...] [OPTIONS ...]

FLAGS
  -${object_argument_names.help.short}, --${object_argument_names.help.long}
    Displays this message then exits.

  -${object_argument_names.all.short}, --${object_argument_names.all.long}
    Whether or not only all or only some regular expressions should be matched. By default, only some regular expressions will be matched, unless this flag is set.

OPTIONS
  -${object_argument_names.server_regex.short}, --${object_argument_names.server_regex.long} <REGEX>
    REGEX = Regular expression used for server names.

  -${object_argument_names.file_regex.short}, --${object_argument_names.file_regex.long} <REGEX>
    REGEX = Regular expression used for filenames.

EXAMPLES
  run ${string_script} -${object_argument_names.all.short} -${object_argument_names.server_regex.short} ^((?!home).)*$ -${object_argument_names.file_regex.short} ^((?!cct).)*$ -${object_argument_names.file_regex.short} ^((?!exe).)*$ -${object_argument_names.file_regex.short} ^((?!lit).)*$ -${object_argument_names.file_regex.short} ^((?!msg).)*$ -${object_argument_names.file_regex.short} ^((?!txt).)*$
    Removes all files from all servers, except for those in servers that have "home" in their name, and are files that have "cct", "exe", "lit", "msg" or "txt" in their name.`
      )
    );
  };

  /**
   * @description Tries to remove any files that match any of the specified regular expressions from any servers that match any of the specified regular expressions.
   * @param {Object} object_arguments - Contains the arguments for the function.
   * @param {string[]} object_arguments.array_regexes_server - Contains the regular expression patterns that the servers should match.
   * @param {string[]} object_arguments.array_regexes_files - Contains the regular expression patterns that the files should match.
   * @param {boolean} [object_arguments.boolean_some] - Whether or not only some or all of the regular expressions should be matched.
   */
  const void_remove = ({
    array_regexes_server: s,
    array_regexes_file: f,
    boolean_some: a = object_constants.object_defaults.boolean_all,
  }) =>
    array_get_servers_matching_regexes({
      object_netscript: object_netscript,
      array_regexes: s.map((string_regex) =>
      ({
        string_pattern: string_regex,
        string_flags: "i",
      })),
      boolean_all: a,
    }).forEach((string_server) =>
      array_get_files_on_server_matching_regexes({
        object_netscript: object_netscript,
        string_server: string_server,
        array_regexes: f.map((string_regex) =>
        ({
          string_pattern: string_regex,
          string_flags: "i",
        })),
        boolean_all: a,
      }).forEach(
        (string_file) =>
          object_netscript.rm(string_file, string_server) ||
          object_netscript.tprint(
            `WARNING: Unable to remove file "${string_file}" from server "${string_server}".`
          )
      )
    );

  const void_main = async () => {
    // variables
    let boolean_some = object_constants.object_defaults.boolean_all,
      boolean_print_help = !1;
    const array_regexes_server = [],
      array_regexes_file = [],
      object_arguments = object_parse_arguments({ array_arguments: object_netscript.args }),
      object_argument_names = object_constants.object_argument_names;
    // argument parsing
    for (const string_argument in object_arguments)
      if (object_arguments.hasOwnProperty(string_argument)) {
        const argument_value = object_arguments[string_argument];
        switch (string_argument) {
          case object_argument_names.all.short:
          // fall-through
          case object_argument_names.all.long:
            boolean_some = argument_value;
            break;
          case object_argument_names.server_regex.short:
          // fall-through
          case object_argument_names.server_regex.long:
            "object" == typeof argument_value
              ? array_regexes_server.push(...argument_value)
              : array_regexes_server.push(argument_value);
            break;
          case object_argument_names.file_regex.short:
          // fall-through
          case object_argument_names.file_regex.long:
            "object" == typeof argument_value
              ? array_regexes_file.push(...argument_value)
              : array_regexes_file.push(argument_value);
            break;
          case object_argument_names.help.short:
          // fall-through
          case object_argument_names.help.long:
            boolean_print_help = argument_value;
            break;
          case "_":
            continue;
          default:
            const string_message_error = `Unknown argument passed: \"${string_argument}\".`;
            object_netscript.tprint(`ERROR: ${string_message_error}`);
            throw new Error(string_message_error);
        }
      }
  
    if (boolean_print_help)
      return void_print_help(object_netscript);
    void_remove({
      array_regexes_server: array_regexes_server,
      array_regexes_file: array_regexes_file,
      boolean_some: boolean_some,
    });
  };

  await void_main();
};

