/**
 * @description nicoty.sbin.nop.js - 1.6GB - Perpetually waits. Useable as a no-operation script to reserve RAM for another script
 * @param {Object} object_netscript - The Netscript environment.
 * @license BlueOak-1.0.0
 */
export const main = async (object_netscript) => {
  for (;;) await object_netscript.sleep(9e9);
};
