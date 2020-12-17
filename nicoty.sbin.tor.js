/**
 * @description nicoty.sbin.tor.js - 3.8GB - Perpetually tries to buy a TOR Router until one is owned.
 * @param {Object} object_netscript - The Netscript environment.
 * @param {any[]} object_netscript.args - Contains arguments passed to the script.
 * @param {number} object_netscript.args.0 - The duration to wait per iteration of the script's main loop in milliseconds.
 * @license BlueOak-1.0.0
 */
export const main = async (object_netscript) => {
  const float_period = object_netscript.args[0];
  for (
    ;
    !object_netscript.scan("home").includes("darkweb");

  ) {
    try {
      object_netscript.purchaseTor();
    } catch (object_exception) {
      object_netscript.print(`WARNING: ${JSON.stringify(object_exception)}`);
    }
    await object_netscript.sleep(float_period);
  }
};
