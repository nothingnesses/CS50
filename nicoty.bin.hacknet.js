/**
 * @description nicoty.bin.hacknet.js - 5.6 GB - Purchases nodes and upgrades them until the highest gain rate increase per cost ratio of the possible upgrades are below a given threshold.
 * @license BlueOak-1.0.0
 * @todo Link ratio to time to break-even.
 */

import {
  string_sanitise,
  object_parse_arguments,
  any_repeat,
} from "nicoty.lib.no.netscript.js";

/**
 * @description Constants.
 * @readonly
 * @property {Object} object_defaults - Contains default values for script's arguments.
 * @property {number} object_defaults.float_period_check_seconds - Time period used for checking the time in seconds.
 * @property {number} object_defaults.float_minimum_ratio - Minimum gain rate increase per cost ratio threshold before the script is killed.
 * @property {Object} object_argument_names - Contains argument names.
 */
const object_constants = {
  object_defaults: {
    float_period_seconds: 1,
    float_minimum_ratio: 0.0005,
  },
  object_argument_names: {
    delay: {
      short: "d",
      long: "delay",
    },
    help: {
      short: "h",
      long: "help",
    },
    ratio: {
      short: "r",
      long: "ratio",
    },
  },
};

/**
 * @description Returns a gain rate value. Adapted from the {@link `updateMoneyGainRate`} function from {@link https://github.com/danielyxie/bitburner/blob/master/src/Hacknet/HacknetNode.ts|Bitburner's source code}.
 * @param {Object} object_arguments - Contains the arguments for the function.
 * @param {number} [object_arguments.integer_level] - The node's level.
 * @param {number} [object_arguments.integer_ram] - The node's RAM.
 * @param {number} [object_arguments.integer_cores] - The node's number of cores.
 * @returns {number} The gain rate value.
 * @see {@link `updateMoneyGainRate`} {@link https://github.com/danielyxie/bitburner/blob/master/src/Hacknet/HacknetNode.ts|GitHub}.
 */
const float_get_gain_rate = ({
  integer_level: l = 0,
  integer_ram: r = 0,
  integer_cores: c = 0,
}) =>
  l * Math.pow(1.035, r - 1) * (c + 5);

/**
 * @param {Object} object_netscript - The Netscript environment.
 */
export const main = async (object_netscript) => {
  /**
   * @description Prints a help message to the terminal.
   */
  const void_print_help = () => {
    const 
      object_defaults = object_constants.object_defaults,
      object_argument_names = object_constants.object_argument_names;
    object_netscript.tprint(
      string_sanitise(`
  DESCRIPTION
    Buys Hacknet nodes and upgrades them until the highest gain rate increase per cost ratio of the possible upgrades are below a given threshold.
  
  USAGE
    run ${object_netscript.getScriptName()} [FLAGS ...] [OPTIONS ...]
  
  FLAGS
    -${object_argument_names.help.short}, --${object_argument_names.help.long}
      Displays this message then exits.
    
  OPTIONS
    -${object_argument_names.delay.short}, --${object_argument_names.delay.long} <SECONDS>
      SECONDS = The duration of delay between each loop iteration, in seconds. Should be a floating-point number >= 0.001. Defaults to ${object_defaults.float_period_seconds}.
  
    -${object_argument_names.ratio.short}, --${object_argument_names.ratio.long} <FLOAT>
      FLOAT = A value used in determining if the script should continue buying new Hacknet nodes/upgrades for these. Should be a floating point number >= 0. Higher values indicates a greater threshold so less upgrades/new nodes will be bought. Defaults to ${object_defaults.float_minimum_ratio}.`
      )
    );
  };

  /**
   * @description Returns a gain rate increase per cost value.
   * @param {Object} object_arguments - Contains the arguments for the function.
   * @param {number} object_arguments.integer_node - The node's ID.
   * @param {number} [object_arguments.integer_level] - The level to increase by.
   * @param {number} [object_arguments.integer_ram] - The RAM to increase by.
   * @param {number} [object_arguments.integer_cores] - The number of cores to increase by.
   * @returns {number} The gain rate increase per cost value.
   * @see {@link `updateMoneyGainRate`} {@link https://github.com/danielyxie/bitburner/blob/master/src/Hacknet/HacknetNode.ts|GitHub}.
   */
  const float_get_gain_rate_increase_cost_ratio = ({
    integer_node: n,
    integer_level: l = 0,
    integer_ram: r = 0,
    integer_cores: c = 0,
  }) => {
    const object_node_stats = object_netscript.hacknet.getNodeStats(n);
    return (
      (float_get_gain_rate({
        integer_level: object_node_stats.level + l,
        integer_ram: object_node_stats.ram + r,
        integer_cores: object_node_stats.cores + c,
      }) -
        float_get_gain_rate({
          integer_level: object_node_stats.level,
          integer_ram: object_node_stats.ram,
          integer_cores: object_node_stats.cores,
        })) /
      (object_netscript.hacknet.getLevelUpgradeCost(n, l) +
        object_netscript.hacknet.getRamUpgradeCost(n, r) +
        object_netscript.hacknet.getCoreUpgradeCost(n, c))
    );
  };

  /**
   * @description Returns a new node upgrade object.
   * @param {Object} object_arguments - Contains the arguments for the function.
   * @param {number} [object_arguments.float_gain_rate_increase_cost_ratio] - The gain rate increase to cost ratio of the upgrade.
   * @param {any[]} [object_arguments.array_arguments] - The arguments to pass to the upgrade function.
   * @param {function} [object_arguments.function_upgrade] - The upgrade function.
   * @returns {Object} Stock object.
   */
  const object_get_node_upgrade = ({
    float_gain_rate_increase_cost_ratio: r = float_get_gain_rate({
      integer_level: 1,
      integer_ram: 1,
      integer_cores: 1,
    }) / object_netscript.hacknet.getPurchaseNodeCost(),
    array_arguments: a = [],
    function_upgrade: u = object_netscript.hacknet.purchaseNode,
  }) => ({
    float_gain_rate_increase_cost_ratio: r,
    array_arguments: a,
    function_upgrade: u,
  });

  /**
   * @description Takes a node upgrade object and returns a newer node upgrade object if it has a better gain rate increase to cost ratio, otherwise returns the old node upgrade object.
   * @param {Object} object_arguments - Contains the arguments for the function.
   * @param {Object} object_arguments.object_node_upgrade - The node upgrade object.
   * @param {number} object_arguments.integer_node - The node.
   * @param {integer} object_arguments.integer_amount - The amount of upgrades to buy.
   * @returns {Object} The newer node upgrade object if it has a better gain rate increase to cost ratio, otherwise the old one.
   */
  const object_get_node_upgrade_updated_main = ({
    object_node_upgrade: u = object_get_node_upgrade({}),
    integer_node: n,
    integer_amount: a = 1,
  }) => {
    const float_ratio_level = float_get_gain_rate_increase_cost_ratio({
        integer_node: n,
        integer_level: a,
      }),
      float_ratio_ram = float_get_gain_rate_increase_cost_ratio({
        integer_node: n,
        integer_ram: a,
      }),
      float_ratio_cores = float_get_gain_rate_increase_cost_ratio({
        integer_node: n,
        integer_cores: a,
      });
    switch (Math.max(
      u.float_gain_rate_increase_cost_ratio,
      float_ratio_level,
      float_ratio_ram,
      float_ratio_cores
    )) {
      case u.float_gain_rate_increase_cost_ratio:
        return u;
      case float_ratio_level:
        return object_get_node_upgrade({
          float_gain_rate_increase_cost_ratio: float_ratio_level,
          array_arguments: [n, a],
          function_upgrade: object_netscript.hacknet.upgradeLevel,
        });
      case float_ratio_ram:
        return object_get_node_upgrade({
          float_gain_rate_increase_cost_ratio: float_ratio_ram,
          array_arguments: [n, a],
          function_upgrade: object_netscript.hacknet.upgradeRam,
        });
      case float_ratio_cores:
        return object_get_node_upgrade({
          float_gain_rate_increase_cost_ratio: float_ratio_cores,
          array_arguments: [n, a],
          function_upgrade: object_netscript.hacknet.upgradeCore,
        });
    }
  };

  /**
   * @description Returns an object that can be used as input by the repeater function to get updated node upgrade objects.
   * @param {Object} object_arguments - Contains the arguments for the function.
   * @param {Object} object_arguments.any_output - The current node upgrade object.
   * @param {number} object_arguments.integer_node - The current node.
   * @param {integer} object_arguments.integer_amount - The amount of upgrades to buy.
   * @returns {Object} The input object for the repeater function.
   */
  const object_get_node_upgrade_updated = ({
    object_node_upgrade: u = object_get_node_upgrade({}),
    integer_node: n = 0,
    integer_amount: a = 1,
  }) => ({
    object_node_upgrade: object_get_node_upgrade_updated_main({
      object_node_upgrade: u,
      integer_node: n,
      integer_amount: a,
    }),
    integer_node: n + 1,
    integer_amount: a,
  });

  const void_main = async () => {
    const
      object_defaults = object_constants.object_defaults,
      object_argument_names = object_constants.object_argument_names;
    let
      float_period_seconds = object_defaults.float_period_seconds,
      float_minimum_ratio = object_defaults.float_minimum_ratio,
      // Whether to display help and exit.
      boolean_print_help = !1;
    // Parse arguments.
    const object_arguments = object_parse_arguments({array_arguments: object_netscript.args});
    for (const string_argument in object_arguments)
      if (object_arguments.hasOwnProperty(string_argument)) {
        const argument_value = object_arguments[string_argument];
        switch (string_argument) {
          case object_argument_names.delay.short:
          // fall-through
          case object_argument_names.delay.long:
            float_period_seconds = argument_value;
            break;
          case object_argument_names.help.short:
          // fall-through
          case object_argument_names.help.long:
            boolean_print_help = argument_value;
            break;
          case object_argument_names.ratio.short:
          // fall-through
          case object_argument_names.ratio.long:
            float_minimum_ratio = argument_value;
            break;
          case "_":
            continue;
          default:
            const string_message_error = `Unknown argument passed: "${string_argument}".`;
            throw (object_netscript.tprint(`ERROR: ${string_message_error}`), new Error(string_message_error));
        }
      }

    if (boolean_print_help)
      return void_print_help(object_netscript);
    const float_period = 1e3 * float_period_seconds;
    // Make sure there's at least one node owned.
    for (
      ;
      object_netscript.hacknet.numNodes() <= 0;
  
    ) {
      // Wait a bit if funds are insufficient.
      -1 === object_netscript.hacknet.purchaseNode() && (await object_netscript.sleep(float_period));
    }
    for (
      ;
      ;
    
    ) {
      const string_property_counter = "integer_counter",
        object_node_upgrade = any_repeat({
          object_state: {
            [string_property_counter]: 0,
            object_node_upgrade: object_get_node_upgrade({}),
            integer_node: 0,
            integer_amount: 1,
          },
          integer_repeats: object_netscript.hacknet.numNodes(),
          any_function: object_get_node_upgrade_updated,
          string_property_counter: string_property_counter,
        }).object_node_upgrade;
      if (object_node_upgrade.float_gain_rate_increase_cost_ratio < float_minimum_ratio) break;
      object_node_upgrade.function_upgrade(...object_node_upgrade.array_arguments),
      await object_netscript.sleep(float_period);
    }
  };

  await void_main();
};
