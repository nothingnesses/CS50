/** 
 * @description nicoty.bin.kill.js - 2.55GB - Kills scripts.
 * @license BlueOak-1.0.0
 */

import {
  string_sanitise,
  object_parse_arguments,
} from "nicoty.lib.no.netscript.js";
import {
  array_get_servers,
} from "nicoty.lib.servers.js";
import {
  void_kill_script_named_server_named,
} from "nicoty.lib.kill.js";

/**
 * @description Main function
 * @param {Object} object_netscript - The Netscript environment.
 */
export const main = async (object_netscript) => {
  /**
   * @description Constants.
   * @readonly
   * @property {string} string_script_this - The name of this script.
   * @property {Object} object_argument_names - Contains argument names.
   */
  const object_constants = {
    string_script_this: object_netscript.getScriptName(),
    object_argument_names: {
      script: {
        short: "c",
        long: "script",
      },
      server: {
        short: "e",
        long: "server",
      },
      help: {
        short: "h",
        long: "help",
      },
    },
  };
  
  /**
   * @description Prints a help message to the terminal.
   */
  const void_print_help = () => {
    const object_argument_names = object_constants.object_argument_names;
    object_netscript.tprint(
      string_sanitise(`
DESCRIPTION
  Kill all running scripts.
  Optionally, kill only named scripts instead.
  Optionally, kill only scripts on named servers instead.
  Optionally, kill only named scripts on named servers instead.

USAGE
  run ${object_constants.string_script_this} [FLAGS ...] [OPTIONS ...]

FLAGS
  -${object_argument_names.help.short}, --${object_argument_names.help.long}
    Displays this message then exits.

OPTIONS
  -${object_argument_names.script.short}, --${object_argument_names.script.long} <SCRIPT>
    SCRIPT = The name of a script to kill.

  -${object_argument_names.server.short}, --${object_argument_names.server.long} <SERVER>
    SERVER = The name of a server on which scripts will be killed.`
      )
    );
  };

  /**
   * @description Kills running instances of named scripts on a named server.
   * @param {Object} object_arguments - Contains the arguments for the function.
   * @param {string} object_arguments.string_server - The server running the scripts to be killed.
   * @param {string[]} object_arguments.array_scripts - Contains the scripts to be killed.
   */
  const void_kill_scripts_named_server_named = ({
    string_server: e,
    array_scripts: c,
  }) =>
    c.forEach((string_script) =>
      void_kill_script_named_server_named({
        object_netscript: object_netscript,
        string_server: e,
        string_script: string_script,
      })
    );

  /**
   * @description Kills running instances of named scripts on named servers.
   * @param {Object} object_arguments - Contains the arguments for the function.
   * @param {string[]} object_arguments.array_servers - Contains the servers running the scripts to be killed.
   * @param {string[]} object_arguments.array_scripts - Contains the scripts to be killed.
   */
  const void_kill_scripts_named_servers_named = ({
    array_servers: e,
    array_scripts: c,
  }) =>
    e.forEach((string_server) =>
      void_kill_scripts_named_server_named({
        string_server: string_server,
        array_scripts: c,
      })
    );

  /**
   * @description Kills running instances of named scripts on all servers.
   * @param {string[]} array_scripts - Contains the scripts to be killed.
   */
  const void_kill_scripts_named = (array_scripts) =>
    void_kill_scripts_named_servers_named({
      array_servers: array_get_servers({ object_netscript: object_netscript }),
      array_scripts: array_scripts,
    });

  /**
   * @description Kills all but this script on a named server.
   * @param {string} string_server - The server running the scripts to be killed.
   */
  const void_kill_scripts_server_named = (string_server) =>
    object_netscript
      .ps(string_server)
      .forEach(
        (object_script) => 
          object_script.filename !== object_constants.string_script_this &&
            object_netscript.kill(
              object_script.filename,
              string_server,
              ...object_script.args
            )
      );

  /**
   * @description Kills all but this script on named servers.
   * @param {string} array_servers - Contains the servers running the scripts to be killed.
   */
  const void_kill_scripts_servers_named = (array_servers) =>
    array_servers.forEach(
      (string_server) =>
        void_kill_scripts_server_named(string_server)
    );

  /**
   * @description Kills running scripts on all servers.
   */
  const void_kill_scripts = () =>
    void_kill_scripts_servers_named(
      array_get_servers({ object_netscript: object_netscript })
    );

  const void_main = async () => {
    // Variables.
    const
      array_servers = [],
      array_scripts = [];
    let boolean_print_help = !1;
    // Parse arguments.
    const
      object_argument_names = object_constants.object_argument_names,
      object_arguments = object_parse_arguments({array_arguments: object_netscript.args});
    for (const string_argument in object_arguments)
      if (object_arguments.hasOwnProperty(string_argument)) {
        const argument_value = object_arguments[string_argument];
        switch (string_argument) {
          case object_argument_names.script.short:
          // fall-through
          case object_argument_names.script.long:
            "object" == typeof argument_value
              ? array_scripts.push(...argument_value)
              : array_scripts.push(argument_value);
            break;
          case object_argument_names.server.short:
          // fall-through
          case object_argument_names.server.long:
            "object" == typeof argument_value
              ? array_servers.push(...argument_value)
              : array_servers.push(argument_value);
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
    array_scripts.length > 0
      ? array_servers.length > 0
        ? void_kill_scripts_named_servers_named({
          array_servers: array_servers,
          array_scripts: array_scripts,
        })
        : void_kill_scripts_named(array_scripts)
      : array_servers.length > 0
        ? void_kill_scripts_servers_named(array_servers)
        : void_kill_scripts();
  };

  await void_main();
};
