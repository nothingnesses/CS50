/**
 * @description nicoty.sbin.weaken.cyclic.js - 1.75GB - Perpetually weakens the server currently targetted by the hacking script.
 * @param {Object} object_netscript - The Netscript environment.
 * @param {any[]} object_netscript.args - Contains arguments passed to the script.
 * @param {number} object_netscript.args.0 - The duration to wait per iteration of the script's main loop in milliseconds.
 * @license BlueOak-1.0.0
 */
export const main = async (object_netscript) => {
  const
    float_period = object_netscript.args[0],
    object_document = parent["document"];
  for (
    ;
    ;

  ) {
    try {
      await object_netscript.weaken(object_document.nicoty_hacker_string_server_target_actual);
    } catch (object_exception) {
    }
    await object_netscript.sleep(float_period);
  }
};
