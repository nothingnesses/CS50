/**
 * @description nicoty.sbin.hacker.js - 13.35GB - Responsible for running scripts to weaken, grow and hack servers.
 * @license BlueOak-1.0.0
 * @todo Use dependency injection or `Fluture` to move side-effects to `void-main`.
 * @todo Send array of servers used to cyclic weaken manager periodically so it can use it do decide how many threads of cyclic weaken would be possible to generate.
 * @todo Add a way to control this using Kozd's GUIFramework.
 * @todo Refactor unecessary cloning/copying.
 * @todo Add a way to notify nicoty.sbin.weaken.manager if this script needs more RAM so nicoty.sbin.weaken.manager can kill some cyclic weaken scripts and adjust float_ram_fraction_for_weaken_cyclic.
 * @todo Add a way to be able to target more than one server at a time?
 * @todo Add a way to determine the optimal weights for the factors used in the server scoring function
 * @todo Add a job cap thing that prevents running more jobs if the first worker in a cycle finishes. Add a thing to worker script that writes to a file (or to `window`) its identifier, when it started, and when it finishes. Add a padding optimiser that detects when tail collision occurs and increases padding each cycle if it does occur, and decreases it by half of how much it increases everytime no tail collision occurs.
 */

import { array_get_servers } from "nicoty.lib.servers.js";
import {
  float_get_server_ram_free,
  array_get_servers_useable,
  object_get_server_ram_free_biggest,
} from "nicoty.lib.ram.server.js";
import {
  object_get_server_used,
  array_get_servers_used_updated,
  boolean_copy_script_to,
  integer_exec,
  boolean_can_run_job,
} from "nicoty.lib.ram.script.js";
import {
  array_make_servers,
  clamp,
  any_while,
  object_get_updated,
  clone,
} from "nicoty.lib.no.netscript.js";
import { array_get_servers_hackable } from "nicoty.lib.score.js";
import {
  float_get_time_hack,
  float_get_time_grow,
  float_get_time_weaken,
} from "nicoty.lib.time.js";
import { float_get_server_score } from "nicoty.lib.score.js";

/**
 * @description Constants.
 * @readonly
 * @property {number} ServerBaseGrowthRate - Unadjusted Growth rate. Base percentage increase of cash from one thread of `grow`.
 * @property {number} ServerMaxGrowthRate - Maximum possible growth rate (max rate accounting for server security).
 * @property {number} ServerFortifyAmount - Amount by which server's security increases when its hacked/grown.
 * @property {number} ServerWeakenAmount - Amount by which server's security decreases when weakened.
 * @property {number} array_workers - Contains the names of worker scripts.
 * @see `CONSTANTS` in {@link https://github.com/danielyxie/bitburner/blob/49fa63971b404af04cfaf331cad33ec4e59b4024/src/Constants.ts|Bitburner's source code}.
 */
const object_constants = {
  ServerBaseGrowthRate: 1.03,
  ServerMaxGrowthRate: 1.0035,
  ServerFortifyAmount: 0.002,
  ServerWeakenAmount: 0.05,
  object_workers: {
    weaken_: "nicoty.sbin.weaken.js",
    grow_: "nicoty.sbin.grow.js",
    hack_: "nicoty.sbin.hack.js",
  },
};

/**
 * @description Main function
 * @param {Object} object_netscript - The Netscript environment.
 */
export const main = async (object_netscript) => {
  /**
   * @description Returns an object containing the current bitnode multiplier values.
   * @returns {Object} Contains the current bitnode multiplier values.
   * @see `BitNodeMultipliers` in {@link https://github.com/danielyxie/bitburner/blob/34d749809a3ca810d6fb22c39225e76a67897ba9/src/BitNode/BitNodeMultipliers.ts|"BitNodeMultipliers.ts" from Bitburner's source code}.
   */
  const object_get_bitnode_multipliers = () => {
    try {
      // Comment out the following line to save on ~4GB of RAM.
      return object_netscript.getBitNodeMultipliers();
      throw new Error(
        "WARNING: Uncommented the call to `getBitNodeMultipliers`."
      );
    } catch (object_exception) {
      return (
        object_netscript.print(
          `${JSON.stringify(object_exception)}\nUsing default values instead.`
        ),
        {
          HackingLevelMultiplier: 1,
          StrengthLevelMultiplier: 1,
          DefenseLevelMultiplier: 1,
          DexterityLevelMultiplier: 1,
          AgilityLevelMultiplier: 1,
          CharismaLevelMultiplier: 1,

          ServerGrowthRate: 1,
          ServerMaxMoney: 1,
          ServerStartingMoney: 1,
          ServerStartingSecurity: 1,
          ServerWeakenRate: 1,

          HomeComputerRamCost: 1,

          PurchasedServerCost: 1,
          PurchasedServerLimit: 1,
          PurchasedServerMaxRam: 1,

          CompanyWorkMoney: 1,
          CrimeMoney: 1,
          HacknetNodeMoney: 1,
          ManualHackMoney: 1,
          ScriptHackMoney: 1,
          CodingContractMoney: 1,

          ClassGymExpGain: 1,
          CompanyWorkExpGain: 1,
          CrimeExpGain: 1,
          FactionWorkExpGain: 1,
          HackExpGain: 1,

          FactionPassiveRepGain: 1,
          FactionWorkRepGain: 1,
          RepToDonateToFaction: 1,

          AugmentationMoneyCost: 1,
          AugmentationRepCost: 1,

          InfiltrationMoney: 1,
          InfiltrationRep: 1,

          FourSigmaMarketDataCost: 1,
          FourSigmaMarketDataApiCost: 1,

          CorporationValuation: 1,

          BladeburnerRank: 1,
          BladeburnerSkillCost: 1,

          DaedalusAugsRequirement: 1,
        }
      );
    }
  };

  /**
   * @description Returns `true` if any of the scripts in the specified array are running on any server, otherwise returns `false`.
   * @param {string[]} array_scripts - Contains the names of scripts to test.
   * @returns {boolean} `true` if any of the scripts in the specified array are running on any server, otherwise `false`.
   */
  const boolean_array_scripts_any_running = (array_scripts) =>
    0 !== array_scripts.length &&
    array_get_servers({ object_netscript: object_netscript }).some(
      (string_server) => {
        const array_running = object_netscript.ps(string_server);
        return (
          0 !== array_running.length &&
          array_running.some((object_running) =>
            array_scripts.some(
              (string_script) => string_script === object_running.filename
            )
          )
        );
      }
    );

  // Weakening, growing and hacking.

  // Weaken-related functions.

  /**
   * @description Returns the amount of threads of `weaken` required to cause a server's security by the specified amount.
   * @param {number} float_weaken_by - The amount to weaken server security by.
   * @returns {number} The amount of threads of `weaken` required to cause a server's security by the specified amount.
   * @see `weaken` in {@link https://github.com/danielyxie/bitburner/blob/916ef069130bedad76820ab6b5e6605ef2309b02/src/NetscriptFunctions.js|"NetscriptFunctions.js" from Bitburner's source code}.
   * @see `weaken` in {@link https://github.com/danielyxie/bitburner/blob/8a5b6f6cbc76ffadc7bb1ed1fffcc67004e42355/src/Server/Server.ts|"Server.ts" from Bitburner's source code}.
   */
  const integer_get_threads_required_for_weaken = (float_weaken_by) =>
    // Denominator is prevented from going lower than Number.MIN_VALUE to prevent divide by 0 errors.
    float_weaken_by /
    Math.max(
      Number.MIN_VALUE,
      object_constants.ServerWeakenAmount *
        object_get_bitnode_multipliers().ServerWeakenRate
    );

  /**
   * @description Returns the amount of threads of `weaken` required to cause a server's security to reach minimum.
   * @param {Object} object_arguments - Contains the arguments for the function.
   * @param {string} object_arguments.string_server - The server's hostname.
   * @param {number} [object_arguments.float_security] - The server's security.
   * @returns {number} The amount of threads of `weaken` required to cause the server's security to reach minimum.
   */
  const integer_get_threads_required_for_weaken_minimum_security = ({
    string_server: n,
    float_security: s = object_netscript.getServerSecurityLevel(string_server),
  }) =>
    Math.ceil(
      integer_get_threads_required_for_weaken(
        s - object_netscript.getServerMinSecurityLevel(n)
      )
    );

  /**
   * @description Returns the amount that server security will decrease from the amount of threads of `weaken` specified.
   * @param {number} integer_threads_weaken - The amount of threads of `weaken` to be used.
   * @returns {number} The amount that server security will decrease from the amount of threads of `weaken` specified.
   * @see `weaken` in {@link https://github.com/danielyxie/bitburner/blob/916ef069130bedad76820ab6b5e6605ef2309b02/src/NetscriptFunctions.js|"NetscriptFunctions.js" from Bitburner's source code}.
   * @see `weaken` in {@link https://github.com/danielyxie/bitburner/blob/8a5b6f6cbc76ffadc7bb1ed1fffcc67004e42355/src/Server/Server.ts|"Server.ts" from Bitburner's source code}.
   */
  const float_get_security_decrease_from_weaken = (integer_threads_weaken) =>
    integer_threads_weaken * object_constants.ServerWeakenAmount;

  // Grow-related functions.

  /**
   * @description Returns the number of threads of `grow` needed to grow the specified server's cash by the specified percentage when it has the specified security.
   * @param {Object} object_arguments - Contains the arguments for the function.
   * @param {string} object_arguments.string_server - The server's hostname.
   * @param {number} [object_arguments.float_security] - The server's security.
   * @param {number} object_arguments.float_growth - The percentage to grow the server's cash by + 1. E.g., 1.5 will grow it by 50%.
   * @returns {number} The amount that server security will decrease from the amount of threads of `weaken` specified.
   * @see `numCycleForGrowth` in {@link https://github.com/danielyxie/bitburner/blob/042f92670062558d4a2835c37fff07a14d84b47c/src/Server/ServerHelpers.ts|"ServerHelpers.ts" from Bitburner's source code}.
   */
  const integer_get_threads_for_growth = ({
    string_server: n,
    float_security: s = object_netscript.getServerSecurityLevel(string_server),
    float_growth: g,
  }) => {
    const CONSTANTS = object_constants,
      BitNodeMultipliers = object_get_bitnode_multipliers();
    function numCycleForGrowth(server, growth, p) {
      let ajdGrowthRate =
        1 + (CONSTANTS.ServerBaseGrowthRate - 1) / server.hackDifficulty;
      if (ajdGrowthRate > CONSTANTS.ServerMaxGrowthRate) {
        ajdGrowthRate = CONSTANTS.ServerMaxGrowthRate;
      }

      const serverGrowthPercentage = server.serverGrowth / 100;

      const cycles =
        Math.log(growth) /
        (Math.log(ajdGrowthRate) *
          p.hacking_grow_mult *
          serverGrowthPercentage *
          BitNodeMultipliers.ServerGrowthRate);

      return cycles;
    }
    return Math.ceil(
      numCycleForGrowth(
        {
          hackDifficulty: s,
          serverGrowth: object_netscript.getServerGrowth(n),
        },
        g,
        {
          hacking_grow_mult: object_netscript.getHackingMultipliers().growth,
        }
      )
    );
  };

  /**
   * @description Inverse function of integer_get_threads_for_growth. Returns the percentage growth of the server's cash in decimal form (e.g., 2 = 100% growth).
   * @param {Object} object_arguments - Contains the arguments for the function.
   * @param {string} object_arguments.string_server - The server's hostname.
   * @param {number} [object_arguments.float_security] - The server's security.
   * @param {number} object_arguments.integer_threads - The number of threads of `grow` to use.
   * @returns {number} The percentage of growth that will occur to the server's cash.
   * @see `numCycleForGrowth` in {@link https://github.com/danielyxie/bitburner/blob/042f92670062558d4a2835c37fff07a14d84b47c/src/Server/ServerHelpers.ts|"ServerHelpers.ts" from Bitburner's source code}.
   */
  const float_get_growth_from_threads = ({
    string_server: n,
    float_security: s = object_netscript.getServerSecurityLevel(string_server),
    integer_threads: t,
  }) =>
    Math.pow(
      Math.min(
        object_constants.ServerMaxGrowthRate,
        1 + (object_constants.ServerBaseGrowthRate - 1) / s
      ),
      t *
        object_netscript.getHackingMultipliers().growth *
        (object_netscript.getServerGrowth(n) / 100) *
        object_get_bitnode_multipliers().ServerGrowthRate
    );

  /**
   * @description Returns the threads of `grow` required to grow the specified server's cash to its maximum when its security and cash are at the specified values.
   * @param {Object} object_arguments - Contains the arguments for the function.
   * @param {string} object_arguments.string_server - The server's hostname.
   * @param {number} [object_arguments.float_security] - The server's security.
   * @param {number} object_arguments.float_cash - The server's cash.
   * @returns {number} The threads of `grow` required to grow the specified server's cash to its maximum when its security and cash are at the specified values.
   */
  const integer_get_threads_required_for_grow_cash_maximum = ({
    string_server: n,
    float_security: s = object_netscript.getServerSecurityLevel(string_server),
    float_cash: c,
  }) =>
    integer_get_threads_for_growth({
      string_server: n,
      float_security: s,
      float_growth: object_netscript.getServerMaxMoney(n) / c,
    });

  /**
   * @description Returns the amount that a server's security will increase from the threads of `grow` used.
   * @param {number} integer_threads_grow - The number of threads of `grow` to use.
   * @returns {number} The amount that a server's security will increase from the threads of `grow` used.
   * @see `processSingleServerGrowth` in {@link https://github.com/danielyxie/bitburner/blob/042f92670062558d4a2835c37fff07a14d84b47c/src/Server/ServerHelpers.ts|"ServerHelpers.ts" from Bitburner's source code}.
   * @see `fortify` in {@link https://github.com/danielyxie/bitburner/blob/8a5b6f6cbc76ffadc7bb1ed1fffcc67004e42355/src/Server/Server.ts|"Server.ts" from Bitburner's source code}.
   */
  const float_get_security_increase_from_grow = (integer_threads_grow) =>
    2 * object_constants.ServerFortifyAmount * integer_threads_grow;

  // Hack-related functions.

  /**
   * @description Returns the percentage of the available cash in the specified server that is stolen when it is hacked when it has the specified amount of security.
   * @param {Object} object_arguments - Contains the arguments for the function.
   * @param {string} object_arguments.string_server - The server's hostname.
   * @param {number} [object_arguments.float_security] - The server's security.
   * @returns {number} The percentage of the available cash in the specified server that is stolen when it is hacked when it has the specified amount of security.
   * @see `calculatePercentMoneyHacked` in {@link https://github.com/danielyxie/bitburner/blob/473f0f14475c40b829fc278dcd07bdd27a5da76f/src/Hacking.js|"Hacking.js" from Bitburner's source code}.
   * @see `hackDifficulty` in {@link https://github.com/danielyxie/bitburner/blob/8a5b6f6cbc76ffadc7bb1ed1fffcc67004e42355/src/Server/Server.ts|"Server.ts" from Bitburner's source code}.
   */
  const float_get_percentage_cash_taken_per_hack = ({
    string_server: n,
    float_security: s = object_netscript.getServerSecurityLevel(string_server),
  }) => {
    const Player = {
        hacking_skill: object_netscript.getHackingLevel(),
        hacking_money_mult: object_netscript.getHackingMultipliers().money,
      },
      BitNodeMultipliers = object_get_bitnode_multipliers();
    function calculatePercentMoneyHacked(server) {
      // Adjust if needed for balancing. This is the divisor for the final calculation
      const balanceFactor = 240;

      const difficultyMult = (100 - server.hackDifficulty) / 100;
      const skillMult =
        (Player.hacking_skill - (server.requiredHackingSkill - 1)) /
        Player.hacking_skill;
      const percentMoneyHacked =
        (difficultyMult * skillMult * Player.hacking_money_mult) /
        balanceFactor;
      if (percentMoneyHacked < 0) {
        return 0;
      }
      if (percentMoneyHacked > 1) {
        return 1;
      }

      return percentMoneyHacked * BitNodeMultipliers.ScriptHackMoney;
    }
    return calculatePercentMoneyHacked({
      hackDifficulty: s,
      requiredHackingSkill: object_netscript.getServerRequiredHackingLevel(n),
    });
  };

  /**
   * @description Returns the threads of `hack` required to steal the specified percentage of the specified server's available cash when its security is at the specified value.
   * @param {Object} object_arguments - Contains the arguments for the function.
   * @param {string} object_arguments.string_server - The server's hostname.
   * @param {number} [object_arguments.float_security] - The server's security.
   * @param {number} object_arguments.float_percentage_to_steal - The percentage of cash to steal.
   * @returns {number} The threads of `hack` required to steal the specified percentage of the specified server's available cash when its security is at the specified value.
   */
  const integer_get_threads_required_to_hack_percentage = ({
    string_server: n,
    float_security: s = object_netscript.getServerSecurityLevel(string_server),
    float_percentage_to_steal: p,
  }) =>
    Math.ceil(
      p /
        float_get_percentage_cash_taken_per_hack({
          string_server: n,
          float_security: s,
        })
    );

  /**
   * @description Returns the amount that a server's security will increase from the specified threads of `hack`.
   * @param {Object} object_arguments - Contains the arguments for the function.
   * @param {string} object_arguments.string_server - The server's hostname.
   * @param {number} [object_arguments.float_security] - The server's security.
   * @param {number} [object_arguments.float_cash] - The server's available cash.
   * @param {number} object_arguments.integer_threads_hack - The amount of threads of `hack` to use.
   * @returns {number} The amount that a server's security will increase from the specified threads of `hack`.
   * @see `hack` in {@link https://github.com/danielyxie/bitburner/blob/916ef069130bedad76820ab6b5e6605ef2309b02/src/NetscriptFunctions.js|"NetscriptFunctions.js" from Bitburner's source code}.
   * @see `fortify` in {@link https://github.com/danielyxie/bitburner/blob/8a5b6f6cbc76ffadc7bb1ed1fffcc67004e42355/src/Server/Server.ts|"Server.ts" from Bitburner's source code}.
   */
  const float_get_security_increase_from_hack = ({
    string_server: n,
    float_security: s = object_netscript.getServerSecurityLevel(string_server),
    float_cash: c = object_netscript.getServerMoneyAvailable(string_server),
    integer_threads_hack: t,
  }) => {
    const percentHacked = float_get_percentage_cash_taken_per_hack({
        string_server: n,
        float_security: s,
      }),
      server = {
        moneyAvailable: c,
        moneyMax: object_netscript.getServerMaxMoney(n),
      },
      CONSTANTS = object_constants;
    function float_hack(threads) {
      let maxThreadNeeded = Math.ceil(
        (1 / percentHacked) * (server.moneyAvailable / server.moneyMax)
      );
      if (isNaN(maxThreadNeeded)) {
        // Server has a 'max money' of 0 (probably). We'll set this to an arbitrarily large value
        maxThreadNeeded = 1e6;
      }
      return CONSTANTS.ServerFortifyAmount * Math.min(threads, maxThreadNeeded);
    }
    return float_hack(t);
  };

  /**
   * @description Depending on the job:
   * If "weaken", returns the threads required for `weaken` to cause the target server's security to reach minimum if possible, otherwise, returns the max threads that the server used can provide.
   * If "grow", returns the threads required for `grow` to grow the target server's cash to its maximum if possible, otherwise, returns the max threads that the server used can provide.
   * If "hack", returns the threads required for `hack` to steal the specified percentage of the available money of the target if possible, otherwise, returns the max threads that the server used can provide.
   * @param {Object} object_arguments - Contains the arguments for the function.
   * @param {number} object_arguments.float_ram_free - The amount of free RAM of the server used.
   * @param {string} object_arguments.string_script - The worker script required for the job.
   * @param {string} object_arguments.string_server - The target server's hostname.
   * @param {number} [object_arguments.float_security] - The target server's security.
   * @param {number} [object_arguments.float_cash] - The target server's available cash.
   * @param {number} object_arguments.float_percentage_to_steal - The percentage of the target server's available cash to steal.
   * @returns {number} The amount of threads required/available for the job.
   * @see `hack` in {@link https://github.com/danielyxie/bitburner/blob/916ef069130bedad76820ab6b5e6605ef2309b02/src/NetscriptFunctions.js|"NetscriptFunctions.js" from Bitburner's source code}.
   * @see `fortify` in {@link https://github.com/danielyxie/bitburner/blob/8a5b6f6cbc76ffadc7bb1ed1fffcc67004e42355/src/Server/Server.ts|"Server.ts" from Bitburner's source code}.
   * @see `grow` in {@link https://github.com/danielyxie/bitburner/blob/916ef069130bedad76820ab6b5e6605ef2309b02/src/NetscriptFunctions.js|"NetscriptFunctions.js" from Bitburner's source code}.
   */
  const integer_get_threads = ({
    float_ram_free: f,
    string_script: r,
    string_server: n,
    float_security: s = object_netscript.getServerSecurityLevel(string_server),
    float_cash: c = object_netscript.getServerMoneyAvailable(string_server),
    float_percentage_to_steal: p,
  }) =>
    clamp({
      value: (({
        string_script: r,
        string_server: n,
        float_security: s,
        float_cash: c,
        float_percentage_to_steal: p,
      }) => {
        switch (r) {
          case object_constants.object_workers.weaken_:
            return integer_get_threads_required_for_weaken_minimum_security({
              string_server: n,
              float_security: s,
            });
          case object_constants.object_workers.grow_:
            return integer_get_threads_required_for_grow_cash_maximum({
              string_server: n,
              float_security: s,
              /**
               * @description If current cash is <= 0, 1 is used so "It can be grown even if it has no money".
               * @see `grow` in {@link https://github.com/danielyxie/bitburner/blob/916ef069130bedad76820ab6b5e6605ef2309b02/src/NetscriptFunctions.js|"NetscriptFunctions.js" from Bitburner's source code}.
               */
              float_cash: c <= 0 ? 1 : c,
            });
          case object_constants.object_workers.hack_:
            return integer_get_threads_required_to_hack_percentage({
              string_server: n,
              float_security: s,
              float_percentage_to_steal: p,
            });
        }
      })({
        string_script: r,
        string_server: n,
        float_security: s,
        float_cash: c,
        float_percentage_to_steal: p,
      }),
      lower: 0,
      upper: Math.trunc(f / object_netscript.getScriptRam(r)),
    });

  // Functions related to calculating percentage to steal.

  /**
   * @description Returns the threads required by `grow` to grow the target server's cash back to its original value after stealing the specified percentage of it, and assuming its security is at the specified value.
   * @param {Object} object_arguments - Contains the arguments for the function.
   * @param {string} object_arguments.string_server - The server's hostname.
   * @param {number} [object_arguments.float_security] - The server's security.
   * @param {number} object_arguments.float_percentage_to_steal - The percentage of the server's available cash to steal.
   * @returns {number} The threads required by `grow` to grow the target server's cash back to its original value after stealing the specified percentage of it, and assuming its security is at the specified value.
   */
  const integer_get_threads_required_for_cash_grow_after_percentage_stolen = ({
    string_server: n,
    float_security: s = object_netscript.getServerSecurityLevel(string_server),
    float_percentage_to_steal: p,
  }) =>
    integer_get_threads_for_growth({
      string_server: n,
      float_security: s,
      // Denominator is prevented from going lower than Number.MIN_VALUE to prevent divide by 0 errors.
      float_growth: 1 / Math.max(Number.MIN_VALUE, 1 - p),
    });

  /**
   * @description Should return `true` if there is enough RAM to provide the threads required of `weaken` to weaken to minimum security, then of `grow` to grow the cash back to maximum after stealing the specified percentahe of the cash, then again of `weaken` to weaken to minimum security again if possible, otherwise, returns `false`, assuming security is at the specified value.
   * @param {Object} object_arguments - Contains the arguments for the function.
   * @param {number} object_arguments.float_ram_free_server_used - The free RAM available in the server used.
   * @param {string} object_arguments.string_server_target - The target server's hostname.
   * @param {number} object_arguments.float_cash_server_target - The target server's cash.
   * @param {number} [object_arguments.float_security_server_target] - The target server's security.
   * @param {number} object_arguments.float_percentage_to_steal - The percentage of the target server's available cash to steal.
   * @returns {boolean} `true` if RAM is sufficient, otherwise `false`.
   */
  const boolean_is_ram_enough_after_hack_percentage = ({
    float_ram_free_server_used: r,
    string_server_target: n,
    float_cash_server_target: c = object_netscript.getServerMoneyAvailable(
      string_server_target
    ),
    float_security_server_target: s = object_netscript.getServerSecurityLevel(
      string_server_target
    ),
    float_percentage_to_steal: p,
  }) => {
    const float_server_target_security_after_hack =
        s +
        float_get_security_increase_from_hack({
          string_server: n,
          float_security: s,
          float_cash: c,
          integer_threads_hack: integer_get_threads({
            float_ram_free: r,
            string_script: object_constants.object_workers.hack_,
            string_server: n,
            float_security: s,
            float_cash: c,
            float_percentage_to_steal: p,
          }),
        }),
      integer_threads_required_for_weaken_minimum_security_after_hack = integer_get_threads_required_for_weaken_minimum_security(
        {
          string_server: n,
          float_security: float_server_target_security_after_hack,
        }
      ),
      float_server_target_security_after_weaken =
        float_server_target_security_after_hack -
        float_get_security_decrease_from_weaken(
          integer_threads_required_for_weaken_minimum_security_after_hack
        ),
      integer_threads_required_for_cash_grow_after_percentage_stolen = integer_get_threads_required_for_cash_grow_after_percentage_stolen(
        {
          string_server: n,
          float_security: float_server_target_security_after_weaken,
          float_percentage_to_steal: p,
        }
      ),
      float_server_target_security_after_grow =
        float_server_target_security_after_weaken +
        float_get_security_increase_from_grow(
          integer_threads_required_for_cash_grow_after_percentage_stolen
        ),
      integer_threads_required_for_weaken_minimum_security_after_grow = integer_get_threads_required_for_weaken_minimum_security(
        {
          string_server: n,
          float_security: float_server_target_security_after_grow,
        }
      ),
      ram_weaken = object_netscript.getScriptRam(
        object_constants.object_workers.weaken_
      ),
      float_ram_required =
        integer_threads_required_for_weaken_minimum_security_after_hack *
          ram_weaken +
        integer_threads_required_for_cash_grow_after_percentage_stolen *
          object_netscript.getScriptRam(object_constants.object_workers.grow_) +
        integer_threads_required_for_weaken_minimum_security_after_grow *
          ram_weaken;
    return float_ram_required < r;
  };

  /**
   * @description Returns the number of cycles of bisection to be done to reach a certain precision, rounded up to the nearest integer.
   * @param {number} float_precision - The desired precision.
   * @returns {number} `true` if RAM is sufficient, otherwise `false`.
   */
  const integer_get_cycles_for_bisection_precision = (float_precision) =>
    Math.ceil(
      Math.log(1 / Math.max(float_precision, Number.MIN_VALUE)) *
        (1 / Math.log(2))
    );

  /**
   * @description Should return the optimum percentage to steal such that cash stolen at most is as high as the steal cap and the target server's security is able to be weakened to minimum with one `weaken` after the `hack`, its cash grown to 100% after one `grow` after the `weaken`, then its security weakened again to minimum with one `weaken`, all with the available remaining RAM on the server used after the `hack` by using a binary search algorithm.
   * @param {Object} object_arguments - Contains the arguments for the function.
   * @param {number} object_arguments.float_ram_free_server_used - The free RAM available in the server used.
   * @param {string} object_arguments.string_server_target - The target server's hostname.
   * @param {number} object_arguments.float_cash_server_target - The target server's cash.
   * @param {number} [object_arguments.float_security_server_target] - The target server's security.
   * @param {number} object_arguments.float_precision - The desired precision of the binary search algorithm.
   * @param {number} object_arguments.float_steal_cap - The maximum percentage of available cash that may be stolen at a time.
   * @returns {number} The optimum percentage of cash to steal.
   */
  const float_get_percentage_to_steal = ({
    float_ram_free_server_used: r,
    string_server_target: n,
    float_cash_server_target: c = object_netscript.getServerMoneyAvailable(
      string_server_target
    ),
    float_security_server_target: s = object_netscript.getServerSecurityLevel(
      string_server_target
    ),
    float_precision: p,
    float_steal_cap: m,
  }) =>
    // Result is capped so not all cash is stolen, which can be bad because it's harder to grow from 0 in most cases.
    Math.min(
      m,
      any_while({
        any_state: {
          float_ceiling: 1,
          float_floor: 0,
          float_percentage_to_steal: (1 + 0) / 2,
          integer_counter: 0,
          integer_cycles_for_bisection_precision: integer_get_cycles_for_bisection_precision(
            p
          ),
          float_steal_cap: m,
          float_ram_free_server_used: r,
          string_server_target: n,
          float_cash_server_target: c,
          float_security_server_target: s,
        },
        boolean_condition: (object_state) =>
          object_state.integer_cycles_for_bisection_precision >
            object_state.integer_counter &&
          object_state.float_steal_cap >=
            object_state.float_percentage_to_steal,
        any_function: (object_state) =>
          boolean_is_ram_enough_after_hack_percentage({
            float_ram_free_server_used: object_state.float_ram_free_server_used,
            string_server_target: object_state.string_server_target,
            float_cash_server_target: object_state.float_cash_server_target,
            float_security_server_target:
              object_state.float_security_server_target,
            float_percentage_to_steal: object_state.float_percentage_to_steal,
          })
            ? object_get_updated({
                object_original: object_state,
                object_properties_new: {
                  float_floor: object_state.float_percentage_to_steal,
                  float_percentage_to_steal:
                    (object_state.float_ceiling +
                      object_state.float_percentage_to_steal) /
                    2,
                },
                integer_counter: 1 + object_state.integer_counter,
              })
            : object_get_updated({
                object_original: object_state,
                object_properties_new: {
                  float_ceiling: object_state.float_percentage_to_steal,
                  float_percentage_to_steal:
                    (object_state.float_percentage_to_steal +
                      object_state.float_floor) /
                    2,
                },
                integer_counter: 1 + object_state.integer_counter,
              }),
      }).float_percentage_to_steal
    );

  // Server-related functions.

  /**
   * @description Returns the name of the hackable server with the highest score, or `null` if it doesn't exist.
   * @param {Object} object_arguments - Contains the arguments for the function.
   * @param {boolean} object_arguments.boolean_method_score_correction - Whether or not to use mean-normalised or standardised score correction.
   * @param {number} object_arguments.float_multiplier_factor_skill - Multiplier used for the skill factor.
   * @param {number} object_arguments.float_multiplier_factor_max_cash - Multiplier used for the maximum cash factor.
   * @param {number} object_arguments.float_multiplier_factor_growth - Multiplier used for the growth factor.
   * @returns {string|null} The name of the server with the highest score if it exists, otherwise, `null`.
   */
  const string_or_null_get_server_hackable_score_best = ({
    boolean_method_score_correction,
    float_multiplier_factor_skill,
    float_multiplier_factor_max_cash,
    float_multiplier_factor_growth,
  }) => {
    const array_servers_hackable = array_get_servers_hackable(object_netscript);
    return array_servers_hackable.length > 0
      ? array_servers_hackable.reduce(
          (object_server_best, string_server) => {
            const float_score = float_get_server_score({
              object_netscript: object_netscript,
              string_server: string_server,
              boolean_method_score_correction: boolean_method_score_correction,
              float_multiplier_factor_skill: float_multiplier_factor_skill,
              float_multiplier_factor_max_cash: float_multiplier_factor_max_cash,
              float_multiplier_factor_growth: float_multiplier_factor_growth,
            });
            return float_score > object_server_best.float_score
              ? {
                  string_server: string_server,
                  float_score: float_score,
                }
              : object_server_best;
          },
          {
            string_server: null,
            float_score: -Infinity,
          }
        ).string_server
      : null;
  };

  /**
   * @description Returns a target server object. Assumes a server's minimum security and maximum cash values are constant.
   * @param {string} string_server - The target server's hostname.
   * @returns {Object} The target server object.
   */
  const object_get_server_target = (string_server) => ({
    string_server: string_server,
    float_security_minimum: object_netscript.getServerMinSecurityLevel(
      string_server
    ),
    float_cash_maximum: object_netscript.getServerMaxMoney(string_server),
    float_security: object_netscript.getServerSecurityLevel(string_server),
    float_cash: object_netscript.getServerMoneyAvailable(string_server),
  });

  // Scheduling-related functions.

  /**
   * @description Returns the name of the appropriate worker script for given target server object.
   * @param {Object} object_server_target - The target server object.
   * @returns {string} The name of the appropriate worker script.
   */
  const string_get_job = (object_server_target) =>
    object_server_target.float_security >
    object_server_target.float_security_minimum
      ? object_constants.object_workers.weaken_
      : object_server_target.float_cash <
        object_server_target.float_cash_maximum
      ? object_constants.object_workers.grow_
      : object_constants.object_workers.hack_;

  /**
   * @description Returns a new target server object based on an original after the effects of a job object have been applied to it.
   * @param {Object} object_arguments - Contains the arguments for the function.
   * @param {Object} object_arguments.object_server_target - The original target server object.
   * @param {Object} object_arguments.object_job - The job object.
   * @returns {Object} The new target server object.
   */
  const object_get_server_target_job_applied = ({
    object_server_target: t,
    object_job: j,
  }) => {
    switch (j.string_script) {
      case object_constants.object_workers.weaken_:
        return object_get_updated({
          object_original: t,
          object_properties_new: {
            float_security: Math.max(
              t.float_security_minimum,
              t.float_security -
                float_get_security_decrease_from_weaken(j.integer_threads)
            ),
          },
        });
      case object_constants.object_workers.grow_:
        return object_get_updated({
          object_original: t,
          object_properties_new: {
            /**
             * @description If current cash is <= 0, 1 is used so "It can be grown even if it has no money".
             * @see `grow` in {@link https://github.com/danielyxie/bitburner/blob/916ef069130bedad76820ab6b5e6605ef2309b02/src/NetscriptFunctions.js|"NetscriptFunctions.js" from Bitburner's source code}.
             */
            float_cash: Math.min(
              t.float_cash_maximum,
              (t.float_cash <= 0 ? 1 : t.float_cash) *
                float_get_growth_from_threads({
                  string_server: t.string_server,
                  float_security: t.float_security,
                  integer_threads: j.integer_threads,
                })
            ),
            /**
             * @see `processSingleServerGrowth` in {@link https://github.com/danielyxie/bitburner/blob/042f92670062558d4a2835c37fff07a14d84b47c/src/Server/ServerHelpers.ts|"ServerHelpers.ts" from Bitburner's source code}.
             * @see `grow` in {@link https://github.com/danielyxie/bitburner/blob/916ef069130bedad76820ab6b5e6605ef2309b02/src/NetscriptFunctions.js|"NetscriptFunctions.js" from Bitburner's source code}.
             */
            float_security:
              t.float_security +
              float_get_security_increase_from_grow(j.integer_threads),
          },
        });
      case object_constants.object_workers.hack_:
        return object_get_updated({
          object_original: t,
          object_properties_new: {
            /**
             * @see `hack` in {@link https://github.com/danielyxie/bitburner/blob/916ef069130bedad76820ab6b5e6605ef2309b02/src/NetscriptFunctions.js|"NetscriptFunctions.js" from Bitburner's source code}.
             */
            float_cash: Math.max(
              0,
              t.float_cash -
                Math.floor(
                  t.float_cash *
                    float_get_percentage_cash_taken_per_hack({
                      string_server: t.string_server,
                      float_security: t.float_security,
                    })
                ) *
                  j.integer_threads
            ),
            /**
             * @see `fortify` in {@link https://github.com/danielyxie/bitburner/blob/8a5b6f6cbc76ffadc7bb1ed1fffcc67004e42355/src/Server/Server.ts|"Server.ts" from Bitburner's source code}.
             */
            float_security:
              t.float_security +
              float_get_security_increase_from_hack({
                string_server: t.string_server,
                float_security: t.float_security,
                float_cash: t.float_cash,
                integer_threads_hack: j.integer_threads,
              }),
          },
        });
      default:
        throw new Error(`ERROR: Unrecognised job \`${j.string_script}\`.`);
    }
  };

  /**
   * @description Return an object containing job durations in seconds. Takes security as the current security instead of projected security because job times resolve according to current anyway, so no need to use projected value.
   * @param {string} string_server_target - The target server's hostname.
   * @returns {Object} The job durations object.
   */
  const object_get_time_jobs = (string_server_target) => ({
    [object_constants.object_workers.weaken_]: float_get_time_weaken({
      object_netscript: object_netscript,
      string_server: string_server_target,
      float_server_security: object_netscript.getServerSecurityLevel(
        string_server_target
      ),
    }),
    [object_constants.object_workers.grow_]: float_get_time_grow({
      object_netscript: object_netscript,
      string_server: string_server_target,
      float_server_security: object_netscript.getServerSecurityLevel(
        string_server_target
      ),
    }),
    [object_constants.object_workers.hack_]: float_get_time_hack({
      object_netscript: object_netscript,
      string_server: string_server_target,
      float_server_security: object_netscript.getServerSecurityLevel(
        string_server_target
      ),
    }),
  });

  /**
   * @description Returns the time that a job in a hacking schedule will finish.
   * @param {Object} object_arguments - Contains the arguments for the function.
   * @param {Object[]} object_arguments.array_schedule - The hacking schedule.
   * @param {Object} object_arguments.object_time_jobs - The job durations object.
   * @returns {number} The time the job will finish.
   */
  const float_get_time_job_finishes_seconds = ({
    array_schedule: s,
    object_time_jobs: t,
  }) => {
    if (0 === s.length)
      return Math.max(
        t[object_constants.object_workers.weaken_],
        t[object_constants.object_workers.grow_],
        t[object_constants.object_workers.hack_]
      );
    {
      const object_job_last = s[s.length - 1];
      return (
        object_job_last.float_delay_seconds + t[object_job_last.string_script]
      );
    }
  };

  /**
   * @description Returns a job object, aka a hacking schedule item.
   * @param {Object} object_arguments - Contains the arguments for the function.
   * @param {Object} object_arguments.object_server_target - The target server object.
   * @param {Object} [object_arguments.object_time_jobs] - The job durations object.
   * @param {Object[]} object_arguments.array_servers_used - Contains useable server objects.
   * @param {Object[]} object_arguments.array_schedule - The hacking schedule.
   * @param {number} object_arguments.float_padding_seconds - The duration of padding between each job in seconds.
   * @param {number} object_arguments.float_precision - The precision used for the percetage to steal calculation.
   * @param {number} object_arguments.float_steal_cap - The maximum percentage to steal of the target server's available cash per hack.
   * @returns {Object} The job object.
   */
  const object_get_job = ({
    object_server_target: n,
    object_time_jobs: t = object_get_time_jobs(
      object_server_target.string_server
    ),
    array_servers_used: u,
    array_schedule: s,
    float_padding_seconds: d,
    float_precision: p,
    float_steal_cap: m,
  }) => {
    const object_server_used = object_get_server_ram_free_biggest({
        object_netscript: object_netscript,
        array_servers_used: u,
      }),
      string_script = string_get_job(n),
      string_server_target = n.string_server,
      float_ram_free_server_used = float_get_server_ram_free({
        object_netscript: object_netscript,
        string_server: object_server_used.string_server,
        float_server_ram_used: object_server_used.float_ram_used,
      }),
      float_security_before_server_target = n.float_security,
      float_cash_current_server_target = n.float_cash,
      object_job = {
        string_script: string_script,
        string_server_used: object_server_used.string_server,
        string_server_target: string_server_target,
        integer_threads: integer_get_threads({
          float_ram_free: float_ram_free_server_used,
          string_script: string_script,
          string_server: string_server_target,
          float_security: float_security_before_server_target,
          float_cash: float_cash_current_server_target,
          float_percentage_to_steal: float_get_percentage_to_steal({
            float_ram_free_server_used: float_ram_free_server_used,
            string_server_target: string_server_target,
            float_cash_server_target: float_cash_current_server_target,
            float_security_server_target: float_security_before_server_target,
            float_precision: p,
            float_steal_cap: m,
          }),
        }),
        float_delay_seconds:
          float_get_time_job_finishes_seconds({
            array_schedule: s,
            object_time_jobs: t,
          }) -
          t[string_script] +
          d,
        // This is the target server's security before this job's effects are applied.
        float_security_before_server_target: float_security_before_server_target,
      };
    // Simulate the effects of the job on the server to get the security after, which is needed to determine if we need to remove any jobs in the schedule later on.
    return object_get_updated({
      object_original: object_job,
      object_properties_new: {
        float_security_after_server_target: object_get_server_target_job_applied(
          {
            object_server_target: n,
            object_job: object_job,
          }
        ).float_security,
      },
    });
  };

  /**
   * @description Takes an older and newer useable server arrays and merges the newer objects onto a clone of the old array.
   * @param {Object} object_arguments - Contains the arguments for the function.
   * @param {Object[]} object_arguments.array_servers_used_old - The older array.
   * @param {Object[]} object_arguments.array_servers_used_new - The newer array.
   * @returns {Object[]} The result of merging the arrays.
   */
  const array_get_servers_used_merged = ({
    array_servers_used_old: o,
    array_servers_used_new: n,
  }) =>
    n.reduce(
      (array_servers_merged, object_server_current) =>
        array_servers_merged.some(
          (object_server) =>
            object_server.string_server === object_server_current.string_server
        )
          ? array_servers_merged
          : array_servers_merged.concat(object_server_current),
      clone(o)
    );

  /**
   * @description Returns a hacking schedule object.
   * @param {Object} object_arguments - Contains the arguments for the function.
   * @param {number} object_arguments.integer_job_cap - The maximum number of jobs per schedule.
   * @param {number} object_arguments.float_precision - The precision used for the percetage to steal calculation.
   * @param {number} object_arguments.float_steal_cap - The maximum percentage to steal of the target server's available cash per hack.
   * @param {number} object_arguments.float_padding_seconds - The duration of padding between each job in seconds.
   * @param {string} object_arguments.string_server_target - The target server's hostname.
   * @param {Object} [object_arguments.object_schedule_hacking_previous] - The previous hacking schedule object.
   * @returns {Object} The hacking schedule object.
   */
  const object_get_schedule_hacking = ({
    integer_job_cap: j,
    float_precision: p,
    float_steal_cap: m,
    float_padding_seconds: d,
    string_server_target: n,
    object_schedule_hacking_previous: o = {
      array_schedule: [],
    },
  }) => {
    const object_server_target_new = object_get_server_target(n),
      array_servers_used_new = array_make_servers({
        object_netscript: object_netscript,
        array_method_get_servers: array_get_servers_useable,
        object_method_make_server: object_get_server_used,
      }),
      array_servers_used_merged =
        o.array_schedule.length > 0
          ? array_get_servers_used_merged({
              array_servers_used_old: o.array_servers_used,
              array_servers_used_new: array_servers_used_new,
            })
          : array_servers_used_new,
      object_state = any_while({
        any_state:
          o.array_schedule.length > 0
            ? {
                object_time_jobs: object_get_time_jobs(n),
                object_server_target:
                  o.object_server_target.string_server == n
                    ? o.object_server_target
                    : object_server_target_new,
                object_server_target_last_security_minimum:
                  o.object_server_target.string_server == n
                    ? o.object_server_target
                    : object_server_target_new,
                float_security_minimum_server_target: object_netscript.getServerMinSecurityLevel(
                  n
                ),
                array_schedule: [],
                array_servers_used:
                  array_servers_used_new.length > o.array_servers_used
                    ? array_servers_used_merged
                    : o.array_servers_used,
                array_servers_used_last_security_minimum:
                  array_servers_used_new.length > o.array_servers_used
                    ? array_servers_used_merged
                    : o.array_servers_used,
                integer_last_seen_job_index_with_security_minimum: -1,
                integer_job_cap: j,
                float_precision: p,
                float_steal_cap: m,
                float_padding_seconds: d,
              }
            : {
                object_time_jobs: object_get_time_jobs(n),
                object_server_target: object_server_target_new,
                object_server_target_last_security_minimum: object_server_target_new,
                float_security_minimum_server_target: object_netscript.getServerMinSecurityLevel(
                  n
                ),
                array_schedule: [],
                array_servers_used: array_servers_used_new,
                array_servers_used_last_security_minimum: array_servers_used_new,
                integer_last_seen_job_index_with_security_minimum: -1,
                integer_job_cap: j,
                float_precision: p,
                float_steal_cap: m,
                float_padding_seconds: d,
              },
        boolean_condition: (object_state) => {
          const object_server_ram_free_biggest = object_get_server_ram_free_biggest(
            {
              object_netscript: object_netscript,
              array_servers_used: object_state.array_servers_used,
            }
          );
          return (
            object_state.array_schedule.length < object_state.integer_job_cap &&
            boolean_can_run_job({
              object_netscript: object_netscript,
              float_ram_free: float_get_server_ram_free({
                object_netscript: object_netscript,
                string_server: object_server_ram_free_biggest.string_server,
                float_server_ram_used:
                  object_server_ram_free_biggest.float_ram_used,
              }),
              string_script: string_get_job(object_state.object_server_target),
              integer_threads: 1,
            })
          );
        },
        any_function: (object_state) => {
          const object_job = object_get_job({
              object_server_target: object_state.object_server_target,
              object_time_jobs: object_state.object_time_jobs,
              array_servers_used: object_state.array_servers_used,
              array_schedule: object_state.array_schedule,
              float_padding_seconds: object_state.float_padding_seconds,
              float_precision: object_state.float_precision,
              float_steal_cap: object_state.float_steal_cap,
            }),
            object_server_target = object_get_server_target_job_applied({
              object_server_target: object_state.object_server_target,
              object_job: object_job,
            }),
            array_servers_used = array_get_servers_used_updated({
              object_netscript: object_netscript,
              array_servers_used: object_state.array_servers_used,
              object_job: object_job,
            });
          return object_job.float_security_after_server_target ===
            object_state.float_security_minimum_server_target
            ? object_get_updated({
                object_original: object_state,
                object_properties_new: {
                  integer_last_seen_job_index_with_security_minimum:
                    object_state.array_schedule.length,
                  array_schedule: object_state.array_schedule.concat(
                    object_job
                  ),
                  object_server_target: object_server_target,
                  object_server_target_last_security_minimum: object_server_target,
                  array_servers_used: array_servers_used,
                  array_servers_used_last_security_minimum: array_servers_used,
                },
              })
            : object_get_updated({
                object_original: object_state,
                object_properties_new: {
                  integer_last_seen_job_index_with_security_minimum:
                    object_state.integer_last_seen_job_index_with_security_minimum,
                  array_schedule: object_state.array_schedule.concat(
                    object_job
                  ),
                  object_server_target: object_server_target,
                  array_servers_used: array_servers_used,
                },
              });
        },
      });
    // Return a schedule with jobs near the end that prevent it from achieving minimum security removed so the target server has minimum security when the schedule finishes. If no jobs achieve minimum security, return the original schedule.
    return object_state.integer_last_seen_job_index_with_security_minimum > 0
      ? {
          object_server_target:
            object_state.object_server_target_last_security_minimum,
          array_schedule: object_state.array_schedule.slice(
            0,
            object_state.integer_last_seen_job_index_with_security_minimum + 1
          ),
          array_servers_used:
            object_state.array_servers_used_last_security_minimum,
        }
      : {
          object_server_target: object_state.object_server_target,
          array_schedule: object_state.array_schedule,
          array_servers_used: object_state.array_servers_used,
        };
  };

  const void_main = async () => {
    // Wait for scripts to die.
    for (
      ;
      boolean_array_scripts_any_running([
        object_constants.object_workers.weaken_,
        object_constants.object_workers.grow_,
        object_constants.object_workers.hack_,
      ]);

    ) {
      await object_netscript.sleep(1e4);
    }
    // Start schedule generation and execution.
    const object_document = parent["document"];
    let integer_time_start = Date.now(),
      object_schedule = {
        array_schedule: [],
      };
    for (;;) {
      // Select a target server if there isn't one.
      const string_server_target =
        "" === object_document.nicoty_hacker_string_server_target_manual
          ? string_or_null_get_server_hackable_score_best({
              boolean_method_score_correction:
                object_document.nicoty_hacker_boolean_method_score_correction,
              float_multiplier_factor_skill:
                object_document.nicoty_hacker_float_multiplier_factor_skill,
              float_multiplier_factor_max_cash:
                object_document.nicoty_hacker_float_multiplier_factor_max_cash,
              float_multiplier_factor_growth:
                object_document.nicoty_hacker_float_multiplier_factor_growth,
            })
          : object_document.nicoty_hacker_string_server_target_manual;
      // Tell the cyclic weaken script what the target server is.
      object_document.nicoty_hacker_string_server_target_actual = string_server_target;
      // If this isn't the first iteration of the loop, sleep for the duration of paddings of the previous schedule.
      if (0 < object_schedule.array_schedule.length) {
        await object_netscript.sleep(
          object_schedule.array_schedule.length *
            object_document.nicoty_hacker_float_padding -
            integer_time_start +
            Date.now()
        );
      }
      integer_time_start = Date.now();
      object_schedule = object_get_schedule_hacking({
        integer_job_cap: object_document.nicoty_hacker_integer_job_cap,
        float_precision: object_document.nicoty_hacker_float_precision,
        float_steal_cap: object_document.nicoty_hacker_float_steal_cap,
        float_padding_seconds:
          object_document.nicoty_hacker_float_padding / 1e3,
        string_server_target: string_server_target,
        object_schedule_hacking_previous: object_schedule,
      });
      0 < object_schedule.array_schedule.length
        ? object_schedule.array_schedule.forEach(
            (object_job, integer_index) => {
              boolean_copy_script_to({
                object_netscript: object_netscript,
                scripts: object_job.string_script,
                string_server_destination: object_job.string_server_used,
              });
              integer_exec({
                object_netscript: object_netscript,
                string_script: object_job.string_script,
                string_server: object_job.string_server_used,
                integer_threads: object_job.integer_threads,
                array_arguments: [
                  object_job.string_server_target,
                  1e3 * object_job.float_delay_seconds - Date.now(),
                  integer_index,
                ],
              });
            }
          )
        : await object_netscript.sleep(
            object_document.nicoty_hacker_float_padding
          );
    }
  };

  await void_main();
};

