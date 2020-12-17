/**
 * @description nicoty.bin.cp.js - 2.65GB - Copies files from other servers to the current server.
 * @license BlueOak-1.0.0
 */

import {
  string_sanitise,
  object_parse_arguments,
} from "nicoty.lib.no.netscript.js";
import { void_copy_matched_to_current } from "nicoty.lib.cp.js";

/**
 * @description Constants.
 * @readonly
 * @property {Object} object_argument_names - Contains argument names.
 * @property {Object} object_defaults - Contains default values for script's arguments.
 * @property {boolean} object_defaults.boolean_silent - Whether to display notification messages or not.
 */
const object_constants = {
  object_argument_names: {
    help: {
      short: "h",
      long: "help",
    },
    silent: {
      short: "s",
      long: "silent",
    },
  },
  object_defaults: {
    boolean_silent: !1,
  },
};

/**
 * @param {Object} object_netscript - The Netscript environment.
 */
export const main = async (object_netscript) => {
  /**
   * @description Prints a help message to the terminal.
   */
  const void_print_help = function () {
    const object_argument_names = object_constants.object_argument_names;
    object_netscript.tprint(
      string_sanitise(`
DESCRIPTION
  Copy all files whose names match (a) regular expression(s) from all servers to the current server.

USAGE
  run ${object_netscript.getScriptName()} [FLAGS ...] <ARGUMENT [ARGUMENT ...]>

  ARGUMENT = Regular expression that files in the network need to match to be copied to the current server.

FLAGS
  -${object_argument_names.help.short}, --${object_argument_names.help.long}
    Displays this message then exits.

  -${object_argument_names.silent.short}, --${object_argument_names.silent.long}
    Whether or not messages will be displayed or not. If set, no messages will be displayed, otherwise, messages will be displayed by default.`
      )
    );
  };

  const void_main = async () => {
    const
      object_argument_names = object_constants.object_argument_names,
      object_arguments = object_parse_arguments({array_arguments: object_netscript.args});
    let boolean_print_help = !1,
      boolean_silent = object_constants.object_defaults.boolean_silent,
      array_patterns = [];
    for (const string_argument in object_arguments)
      if (object_arguments.hasOwnProperty(string_argument)) {
        const argument_value = object_arguments[string_argument];
        switch (string_argument) {
          case object_argument_names.help.short:
          // fall-through
          case object_argument_names.help.long:
            boolean_print_help = argument_value;
            break;
          case object_argument_names.silent.short:
          // fall-through
          case object_argument_names.silent.long:
            boolean_silent = argument_value;
            break;
          case "_":
            "object" == typeof argument_value
              ? array_patterns.push(...argument_value)
              : array_patterns.push(argument_value);
            break;
          default:
            const string_message_error = `Unknown argument passed: "${string_argument}".`;
            throw (object_netscript.tprint(`ERROR: ${string_message_error}`), new Error(string_message_error));
        }
      }
    
    if (boolean_print_help)
      return void_print_help(object_netscript);
    void_copy_matched_to_current({
      object_netscript: object_netscript,
      array_patterns: array_patterns,
      boolean_silent: boolean_silent,
    });
  };

  await void_main();
};
