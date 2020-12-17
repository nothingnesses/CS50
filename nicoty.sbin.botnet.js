/**
 * @description nicoty.sbin.botnet.js - 2.2GB - Opens ports and nukes any unrooted servers if the player's hacking level is high enough to do so and the appropriate number of exploits are present.
 * @license BlueOak-1.0.0
 */

import {
  array_get_servers_nonrooted,
} from "nicoty.lib.root.js";

/**
 * @param {Object} object_netscript - The Netscript environment.
 * @param {any[]} object_netscript.args - Contains arguments passed to the script.
 * @param {number} object_netscript.args.0 - The duration to wait per iteration of the script's main loop in milliseconds.
 */
export const main = async (object_netscript) => {
  const
    float_period = object_netscript.args[0],
    array_exploits = [
      object_netscript.brutessh,
      object_netscript.ftpcrack,
      object_netscript.relaysmtp,
      object_netscript.httpworm,
      object_netscript.sqlinject
    ];
  for (
    ;
    ;

  )
    array_get_servers_nonrooted(object_netscript).forEach((string_server) => {
      array_exploits.forEach((function_exploit) => {
        try {
          function_exploit(string_server);
        } catch (object_exception) {
        }
      });
      try {
        object_netscript.nuke(string_server);
      } catch (object_exception) {
      }
    }),
    await object_netscript.sleep(float_period);
};
