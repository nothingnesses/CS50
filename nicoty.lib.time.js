/**
 * @description nicoty.lib.time.js - 6.25GB
 * @license BlueOak-1.0.0
 */

/**
 * @description Returns an object containing the player's current statuses.
 * @param {Object} object_netscript - The Netscript environment.
 * @returns {Object} Contains the player's current statuses.
 */
const object_get_stats = (object_netscript) => {
  try {
    // Comment out the following line to save ~0.5 GB RAM.
    return object_netscript.getStats();
    throw new Error("WARNING: Uncommented the call to `getStats`.");
  }
  catch (object_exception) {
    object_netscript.print(`${JSON.stringify(object_exception)}\nUsing default values instead.`);
    /**
     * @description Default statuses.
     * @see {@link https://github.com/danielyxie/bitburner/blob/master/src/Constants.js|GitHub}
     */
    return {
      hacking:        object_netscript.getHackingLevel(),
      strength:       1,
      defense:        1,
      dexterity:      1,
      agility:        1,
      charisma:       1,
      intelligence:   1
    };
  }
};

/**
 * @description Returns time it takes to complete a hack on a server, in seconds. Adapted from the {@link `calculateHackingTime`} function from {@link https://github.com/danielyxie/bitburner/blob/master/src/Hacking.js|Bitburner's source code}.
 * @param {Object} object_arguments - Contains the arguments for the function.
 * @param {Object} object_arguments.object_netscript - The Netscript environment.
 * @param {string} object_arguments.string_server - Hostname of target server.
 * @param {number} object_arguments.float_server_security - The target server's security.
 * @param {number} [object_arguments.float_skill_hacking] - Optional hacking level for the calculation. Defaults to player's current hacking level.
 * @param {number} [object_arguments.float_intelligence] - Optional intelligence level for the calculation. Defaults to player's current intelligence if the player has Source-File 4 or is in BitNode-4, otherwise defaults to `1`.
 * @see {@link `calculateHackingTime`} {@link https://github.com/danielyxie/bitburner/blob/master/src/Hacking.js|GitHub}.
 */
export const float_get_time_hack = ({
  object_netscript: n,
  string_server: r,
  float_server_security: c,
  float_skill_hacking: h,
  float_intelligence: i,
}) => {
  const object_stats = object_get_stats(n),
    Player = {
      hacking_skill: object_stats.hacking,
      intelligence: object_stats.intelligence,
      hacking_speed_mult: n.getHackingMultipliers().speed,
    };
  function calculateHackingTime(server, float_hack, int) {
    const difficultyMult = server.requiredHackingSkill * server.hackDifficulty;

    const baseDiff      = 500;
    const baseSkill     = 50;
    const diffFactor    = 2.5;
    const intFactor     = 0.1;
    if (float_hack == null) {float_hack = Player.hacking_skill;}
    if (int == null) {int = Player.intelligence;}
    var skillFactor = (diffFactor * difficultyMult + baseDiff);
    // tslint:disable-next-line
    skillFactor /= (float_hack + baseSkill + (intFactor * int));

    const hackTimeMultiplier = 5;
    const hackingTime = hackTimeMultiplier * skillFactor / Player.hacking_speed_mult;

    return hackingTime;
  }
  return calculateHackingTime(
    {
      requiredHackingSkill: n.getServerRequiredHackingLevel(r),
      hackDifficulty: c,
    },
    h,
    i
  );
};

/**
 * @description Returns time it takes to complete a grow operation on a server, in seconds. Adapted from the {@link `calculateGrowTime`} function from {@link https://github.com/danielyxie/bitburner/blob/master/src/Hacking.js|Bitburner's source code}.
 * @param {Object} object_arguments - Contains the arguments for the function.
 * @param {Object} object_arguments.object_netscript - The Netscript environment.
 * @param {string} object_arguments.string_server - Hostname of target server.
 * @param {number} object_arguments.float_server_security - The target server's security.
 * @param {number} [object_arguments.float_skill_hacking] - Optional hacking level for the calculation. Defaults to player's current hacking level.
 * @param {number} [object_arguments.float_intelligence] - Optional intelligence level for the calculation. Defaults to player's current intelligence if the player has Source-File 4 or is in BitNode-4, otherwise defaults to `1`.
 * @see {@link `calculateGrowTime`} {@link https://github.com/danielyxie/bitburner/blob/master/src/Hacking.js|GitHub}.
 */
export const float_get_time_grow = ({
  object_netscript: n,
  string_server: r,
  float_server_security: c,
  float_skill_hacking: h,
  float_intelligence: i,
}) => {
  const calculateHackingTime = (r, h, i) => float_get_time_hack({
    object_netscript: n,
    string_server: r,
    float_server_security: c,
    float_skill_hacking: h,
    float_intelligence: i,
  });
  function calculateGrowTime(server, float_hack, int) {
    const growTimeMultiplier = 3.2; // Relative to hacking time. 16/5 = 3.2

    return growTimeMultiplier * calculateHackingTime(server, float_hack, int);
  }
  return calculateGrowTime(r, h, i);
};

/**
 * @description Returns time it takes to complete a weaken operation on a server, in seconds. Adapted from the {@link `calculateWeakenTime`} function from {@link https://github.com/danielyxie/bitburner/blob/master/src/Hacking.js|Bitburner's source code}.
 * @param {Object} object_arguments - Contains the arguments for the function.
 * @param {Object} object_arguments.object_netscript - The Netscript environment.
 * @param {string} object_arguments.string_server - Hostname of target server.
 * @param {number} object_arguments.float_server_security - The target server's security.
 * @param {number} [object_arguments.float_skill_hacking] - Optional hacking level for the calculation. Defaults to player's current hacking level.
 * @param {number} [object_arguments.float_intelligence] - Optional intelligence level for the calculation. Defaults to player's current intelligence if the player has Source-File 4 or is in BitNode-4, otherwise defaults to `1`.
 * @see {@link `calculateWeakenTime`} {@link https://github.com/danielyxie/bitburner/blob/master/src/Hacking.js|GitHub}.
 */
export const float_get_time_weaken = ({
  object_netscript: n,
  string_server: r,
  float_server_security: c,
  float_skill_hacking: h,
  float_intelligence: i,
}) => {
  const calculateHackingTime = (r, h, i) => float_get_time_hack({
    object_netscript: n,
    string_server: r,
    float_server_security: c,
    float_skill_hacking: h,
    float_intelligence: i,
  });
  function calculateWeakenTime(server, float_hack, int) {
    const weakenTimeMultiplier = 4; // Relative to hacking time

    return weakenTimeMultiplier * calculateHackingTime(server, float_hack, int);
  }
  return calculateWeakenTime(r, h, i);
};
