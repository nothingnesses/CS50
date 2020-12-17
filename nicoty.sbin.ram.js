/**
 * @description nicoty.sbin.ram.js - 6.6GB - Perpetually tries to upgrade the RAM of "home" if the RAM utilisation of the network of rooted servers is over a threshold value and there is sufficient cash.
 * @license BlueOak-1.0.0
 */

import {
  float_get_network_ram_utilisation,
} from "nicoty.lib.ram.server.js";

/**
 * @param {Object} object_netscript - The Netscript environment.
 * @param {any[]} object_netscript.args - Contains arguments passed to the script.
 * @param {number} object_netscript.args.0 - The duration to wait per iteration of the script's main loop in milliseconds.
 * @param {string[]} object_netscript.args.1 - The RAM utilisation threshold value.
 */
export const main = async (object_netscript) => {
  const float_period = object_netscript.args[0],
    float_ram_utilisation_threshold = object_netscript.args[1];
  for (;;) {
    try {
      for (
        ;
        object_netscript.getServerMoneyAvailable("home") >= object_netscript.getUpgradeHomeRamCost() &&
        float_get_network_ram_utilisation(object_netscript) > float_ram_utilisation_threshold;

      )
        object_netscript.upgradeHomeRam();
    } catch (object_exception) {
      object_netscript.print(`WARNING: ${JSON.stringify(object_exception)}`);
    }
    await object_netscript.sleep(float_period);
  }
};
