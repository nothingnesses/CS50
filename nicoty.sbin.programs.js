/**
 * @description nicoty.sbin.programs.js - 3.7GB - Perpetually tries to buy programs.
 * @param {Object} object_netscript - The Netscript environment.
 * @param {any[]} object_netscript.args - Contains arguments passed to the script.
 * @param {number} object_netscript.args.0 - The duration to wait per iteration of the script's main loop in milliseconds.
 * @param {string[]} object_netscript.args.1 - Contains the names of programs to buy.
 * @license BlueOak-1.0.0
 */
export const main = async (object_netscript) => {
  const float_period = object_netscript.args[0],
    array_programs = object_netscript.args[1];
  let boolean_has_all_programs = !1;
  for (
    ;
    !boolean_has_all_programs;

  ) {
    let boolean_program_missing = !1;
    array_programs.forEach((string_program) => {
      object_netscript.fileExists(string_program, "home") ||
      (boolean_program_missing = !0);
      try {
        object_netscript.purchaseProgram(string_program);
      } catch (object_exception) {
        object_netscript.print(`WARNING: ${JSON.stringify(object_exception)}`);
      }
    }),
    boolean_program_missing || (boolean_has_all_programs = !0),
      await object_netscript.sleep(float_period);
  }
};

