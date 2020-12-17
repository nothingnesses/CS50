/**
 * @description nicoty.sbin.4s.tix.api.js - 4.1GB - Perpetually tries to buy 4S Market data TIX API access until it's already owned.
 * @param {Object} object_netscript - The Netscript environment.
 * @param {any[]} object_netscript.args - Contains arguments passed to the script.
 * @param {number} object_netscript.args.0 - The duration to wait per iteration of the script's main loop in milliseconds.
 * @license BlueOak-1.0.0
 */
export const main = async (object_netscript) => {
  const boolean_has_4s_api = () => {
    try {
      return object_netscript.purchase4SMarketDataTixApi();
    } catch (object_exception) {
      return false;
    }
  };

  const void_main = async () => {
    const float_period = object_netscript.args[0];
    for (
      ;
      !boolean_has_4s_api();
  
    ) await object_netscript.sleep(float_period);
  };

  await void_main();
};
