/**
 * @description nicoty.sbin.weaken.manager.js - 4.2GB - Perpetually runs enough threads of cyclic weaken to meet the specified botnet RAM usage threshold.
 * @license BlueOak-1.0.0
 * @todo Add some capability to kill the instance with the largest amount of threads to increase free RAM for other things?
 * @todo `float_network_ram_fraction_to_use` might not provide enough RAM for even 1 thread of the script, so we should just skip in that case.
 */

import {
  array_get_schedule_script,
  void_schedule_script_runner,
} from "nicoty.lib.ram.script.js";

import { float_get_network_ram_fraction_used_by_script } from "nicoty.lib.ps.js";

/**
 * @param {Object} object_netscript - The Netscript environment.
 * @param {any[]} object_netscript.args - Contains arguments passed to the script.
 * @param {number} object_netscript.args.0 - The duration to wait per iteration of the script's main loop in milliseconds.
 * @param {string} object_netscript.args.1 - The cyclic weaken script.
 * @param {number} object_netscript.args.2 - The fraction of the botnet's RAM that should be used.
 * @param {string} object_netscript.args.3 - The hostname that the hacking script would run in.
 * @param {string} object_netscript.args.4 - The name of the hacking script.
 * @param {any[]} object_netscript.args.5 - Contains the arguments to be passed to the cyclic weaken script.
 */
export const main = async (object_netscript) => {
  const float_period = object_netscript.args[0],
    string_script = object_netscript.args[1],
    float_ram_utilisation_maximum = object_netscript.args[2],
    string_server_hacker = object_netscript.args[3],
    string_script_hacker = object_netscript.args[4],
    array_arguments = object_netscript.args[5];
  // Wait until the hacking script has been executed before executing ang cyclic weaken scripts, to prevent these from hogging the RAM.
  for (
    ;
    !object_netscript
      .ps(string_server_hacker)
      .some((object_script) => object_script.filename == string_script_hacker);

  ) {
    await object_netscript.sleep(float_period);
  }
  for (;;) {
    const float_network_ram_fraction_to_use =
      float_ram_utilisation_maximum -
      float_get_network_ram_fraction_used_by_script({
        object_netscript: object_netscript,
        string_script: string_script,
      });
    float_network_ram_fraction_to_use > 0 &&
      void_schedule_script_runner({
        object_netscript: object_netscript,
        array_schedule: array_get_schedule_script({
          object_netscript: object_netscript,
          array_scripts: [
            {
              string_script: string_script,
              float_threads_or_fraction_botnet: float_network_ram_fraction_to_use,
              array_arguments: array_arguments,
            },
          ],
        }),
      }),
      await object_netscript.sleep(float_period);
  }
};

