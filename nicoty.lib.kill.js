/**
 * @description nicoty.lib.kill.js - 2.3GB.
 * @license BlueOak-1.0.0
 */

/**
 * @description Kills running instances of the named script on a named server.
 * @param {Object} object_arguments - Contains the arguments for the procedure.
 * @param {Object} object_arguments.object_netscript - The Netscript environment.
 * @param {string} object_arguments.string_server - The name of the server which contains the script to be killed.
 * @param {string} object_arguments.string_script - The name of the script to be killed.
 * @todo Return whether or not `kill` succeeded. Maybe as an array (using `map`)?
 */
export const void_kill_script_named_server_named = ({
  object_netscript: n,
  string_server: s,
  string_script: c,
}) =>
  n.ps(s).forEach((object_script) =>
    object_script.filename === c && n.kill(object_script.filename, s, ...object_script.args)
  );
