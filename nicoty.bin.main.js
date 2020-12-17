/**
 * @description nicoty.bin.main.js - 6.9GB - Runs scripts related to hacking servers.
 * @license BlueOak-1.0.0
 * @todo Add a way to choose which programs to buy.
 * @todo Separate logic that requires source files so that they are only ran when you have the required source file - need a cheap way to check if you have source file?
 * @todo Add a way to determine and notify if an unrecognised argument was passed.
 * @todo Figure out a better way for this to run "nicoty.bin.hacker.js".
 * @todo Maybe make a cache script that saves runtime constants like max money of servers to a cache file to potentially reduce RAM usage further.
 */

import {
  string_sanitise,
  object_parse_arguments,
} from "nicoty.lib.no.netscript.js";
import { float_get_server_ram_free } from "nicoty.lib.ram.server.js";
import {
  array_get_schedule_script,
  void_schedule_script_runner,
  integer_exec,
  boolean_can_server_run_script_threads,
  integer_get_threads_nop,
} from "nicoty.lib.ram.script.js";
import { void_kill_script_named_server_named } from "nicoty.lib.kill.js";
import { void_copy_files } from "nicoty.lib.cp.js";

/**
 * @description Constants.
 * @readonly
 * @property {Object} object_defaults - Contains default values for script's arguments.
 * @property {number} object_defaults.float_period_seconds - Time period used for checking the time in seconds.
 * @property {number} object_defaults.float_padding_seconds - Duration between each job used to prevent collisions between them to keep them in sequence.
 * @property {number} object_defaults.integer_job_cap - Maximum amount of jobs to execute per schedule, used to prevent using up too much IRL RAM.
 * @property {string} object_defaults.string_servers_bought_name - String to prefix to the names of purchased servers.
 * @property {string} object_defaults.string_server_target - Server to target.
 * @property {number} object_defaults.float_precision - Precision of the percentage to steal calculator.
 * @property {number} object_defaults.float_ram_utilisation_threshold - Ram utilisiation threshold. upgrade ram or buy or replace servers when reached.
 * @property {number} object_defaults.float_steal_cap - The maximum percentage of cash that should be stolen from a server.
 * @property {number} object_defaults.float_multiplier_factor_skill - Multiplier for skill factor used in server scoring system.
 * @property {number} object_defaults.float_multiplier_factor_max_cash - Multiplier for max cash factor used in server scoring system.
 * @property {number} object_defaults.float_multiplier_factor_growth - Multiplier for growth factor used in server scoring system.
 * @property {boolean} object_defaults.boolean_method_score_correction - Correction method for factors used in server scoring system. `true` = mean-normalisation, `false` = standardisation.
 * @property {boolean} object_defaults.float_ram_fraction_for_weaken_cyclic - Fraction of botnet's ram to use for cyclic weaken.
 * @property {boolean} object_defaults.boolean_print_help - Whether or not to display help and exit.
 * @property {Object} object_helpers - Contains the names of helper scripts.
 * @property {Object} object_argument_names - Contains argument names.
 * @property {string[]} array_programs - Contains buyable program names.
 * @property {string[]} array_identifier_files_required - Contains identifiers for files that are required to be in all servers.
 */
const object_constants = {
  object_defaults: {
    float_period_seconds: 10,
    float_padding_seconds: 2,
    integer_job_cap: 100,
    string_servers_bought_name: "server",
    string_server_target: "",
    float_precision: 0.01,
    float_ram_utilisation_threshold: 0.9,
    float_steal_cap: 0.9,
    float_multiplier_factor_skill: 1,
    float_multiplier_factor_max_cash: 1,
    float_multiplier_factor_growth: 1,
    boolean_method_score_correction: false,
    float_ram_fraction_for_weaken_cyclic: 0.5,
    boolean_print_help: !1,
  },
  object_helpers: {
    string_nop: "nicoty.sbin.nop.js",
    string_hacker: "nicoty.sbin.hacker.js",
    string_ram: "nicoty.sbin.ram.js",
    string_servers: "nicoty.sbin.servers.js",
    string_tor: "nicoty.sbin.tor.js",
    string_programs: "nicoty.sbin.programs.js",
    string_botnet: "nicoty.sbin.botnet.js",
    string_weaken_manager: "nicoty.sbin.weaken.manager.js",
    string_cyclic_weaken: "nicoty.sbin.weaken.cyclic.js",
  },
  object_argument_names: {
    check_delay: {
      short: "c",
      long: "check-delay",
    },
    job_delay: {
      short: "d",
      long: "job-delay",
    },
    help: {
      short: "h",
      long: "help",
    },
    target: {
      short: "i",
      long: "target",
    },
    job_cap: {
      short: "j",
      long: "job-cap",
    },
    multiplier_skill: {
      short: "k",
      long: "multiplier-skill",
    },
    multiplier_cash: {
      short: "l",
      long: "multiplier-cash",
    },
    multiplier_growth: {
      short: "m",
      long: "multiplier-growth",
    },
    server_name: {
      short: "n",
      long: "server-name",
    },
    precision: {
      short: "p",
      long: "precision",
    },
    normal: {
      short: "q",
      long: "normal",
    },
    ram_utilisation: {
      short: "r",
      long: "ram-utilisation",
    },
    steal_cap: {
      short: "s",
      long: "steal-cap",
    },
    weaken_manager: {
      short: "u",
      long: "weaken-manager",
    },
    ram_cyclic_weaken: {
      short: "v",
      long: "ram-cyclic-weaken",
    },
    ram: {
      short: "a",
      long: "ram",
    },
    servers: {
      short: "e",
      long: "servers",
    },
    tor: {
      short: "o",
      long: "tor",
    },
    programs: {
      short: "g",
      long: "programs",
    },
    botnet: {
      short: "b",
      long: "botnet",
    },
  },
  array_programs: [
    "BruteSSH.exe",
    "FTPCrack.exe",
    "relaySMTP.exe",
    "HTTPWorm.exe",
    "SQLInject.exe",
    // "DeepscanV1.exe",
    // "DeepscanV2.exe",
    // "Autolink.exe",
  ],
  array_identifier_files_required: [
    "nicoty.lib.",
    "nicoty.sbin.weaken.cyclic.js",
  ],
};

/**
 * @description Main function
 * @param {Object} object_netscript - The Netscript environment.
 */
export const main = async (object_netscript) => {
  /**
   * @description Prints a help message to the terminal.
   */
  const void_print_help = () => {
    const object_defaults = object_constants.object_defaults,
      object_argument_names = object_constants.object_argument_names,
      object_helpers = object_constants.object_helpers;
    object_netscript.tprint(
      string_sanitise(`
USAGE
  run ${object_netscript.getScriptName()} [FLAGS ...] [OPTIONS ...]

FLAGS
  -${object_argument_names.ram.short}, --no-${object_argument_names.ram.long}
    Prevents the "${
      object_helpers.string_ram
    }" script from being started which is responsible for upgrading the RAM of the "home" server.

  -${object_argument_names.botnet.short}, --no-${
        object_argument_names.botnet.long
      }
    Prevents the "${
      object_helpers.string_botnet
    }" script from being started which is responsible for rooting servers in the network.

  -${object_argument_names.servers.short}, --no-${
        object_argument_names.servers.long
      }
    Prevents the "${
      object_helpers.string_servers
    }" script from being started which is responsible for buying and replacing bought servers.

  -${object_argument_names.programs.short}, --no-${
        object_argument_names.programs.long
      }
    Prevents the "${
      object_helpers.string_programs
    }" script from being started which is responsible for buying programs from the "darkweb" server.

  -${object_argument_names.help.short}, --${object_argument_names.help.long}
    Displays this message then exits.

  -${object_argument_names.tor.short}, --no-${object_argument_names.tor.long}
    Prevents the "${
      object_helpers.string_tor
    }" script from being started which is responsible for buying a TOR Router.

  -${object_argument_names.normal.short}, --${object_argument_names.normal.long}
    Use mean-normalised correction for the server scoring system instead of standard correction.
  
  -${object_argument_names.weaken_manager.short}, --no-${
        object_argument_names.weaken_manager.long
      }
    Prevents the "${
      object_helpers.string_weaken_manager
    }" script from being started which is responsible for running threads of "${
        object_helpers.string_cyclic_weaken
      }" to gain hacking experience.

OPTIONS
  -${object_argument_names.check_delay.short}, --${
        object_argument_names.check_delay.long
      } <SECONDS>
    SECONDS = The duration of delay between each repeat of the helper scripts' main loops, in seconds. Should be a floating-point number > 0. Defaults to ${
      object_defaults.float_period_seconds
    }.

  -${object_argument_names.job_delay.short}, --${
        object_argument_names.job_delay.long
      } <SECONDS>
    SECONDS = The duration of delay between each job, in seconds. Should be a floating-point number > 0. Defaults to ${
      object_defaults.float_padding_seconds
    }.

  -${object_argument_names.target.short}, --${
        object_argument_names.target.long
      } <SERVER>
    SERVER = The server that should be targetted by the \`weaken\`, \`grow\` and \`hack\` functions. Should be a string. Defaults to choosing an optimal target using a scoring system based on the server's maximum cash, growth, required hacking level, and the player's current hacking level.

  -${object_argument_names.job_cap.short}, --${
        object_argument_names.job_cap.long
      } <CAP>
    CAP = The maximum amount of jobs to execute per schedule. This is ignored when running in continuous mode. Should be an integer > 0. Defaults to ${
      object_defaults.integer_job_cap
    }.

  -${object_argument_names.server_name.short}, --${
        object_argument_names.server_name.long
      } <NAME>
    NAME = The name to be used for purchased servers. Should be a string. Defaults to "${
      object_defaults.string_servers_bought_name
    }".

  -${object_argument_names.precision.short}, --${
        object_argument_names.precision.long
      } <PRECISION>
    PRECISION = A value used in determining how many cycles of bisection the binary search algorithm used for the percentage to steal calculator should use. Should be a floating point number > 0 <= 1. Values closer to 0 will result in greater precision in the calculation, but potentially longer run-times and compared to values closer to 1. Defaults to ${
      object_defaults.float_precision
    }.

  -${object_argument_names.ram_utilisation.short}, --${
        object_argument_names.ram_utilisation.long
      } <THRESHOLD>
    THRESHOLD = The botnet's ram utilisation threshold after which upgrades/replacements should be bought for servers and the RAM of "home". Should be a floating point number >= 0 <= 1. Values closer to 0 will result in attempting more frequent upgrades/replacements at the cost of less efficient RAM utilisation to cash spenditure ratios. Defaults to ${
      object_defaults.float_ram_utilisation_threshold
    }.

  -${object_argument_names.steal_cap.short}, --${
        object_argument_names.steal_cap.long
      } <CAP>
    CAP = The maximum fraction of cash to steal from the target server per \`hack\` job. Should be a floating point number >= 0 <=1. Defaults to ${
      object_defaults.float_steal_cap
    }.

  -${object_argument_names.multiplier_skill.short}, --${
        object_argument_names.multiplier_skill.long
      } <FLOAT>
    FLOAT = The multiplier used to change the weight of the factor representing your skill against the target server used in the server scoring system. Should a floating point number. 1 = factor has normal importance, > 1 = factor has more importance, < 1 = factor has less importance, 0 = factor is not used, < 0 = factor has negative effect. Defaults to ${
      object_defaults.float_multiplier_factor_skill
    }.

  -${object_argument_names.multiplier_cash.short}, --${
        object_argument_names.multiplier_cash.long
      } <FLOAT>
    FLOAT = The multiplier used to change the weight of the factor representing the target server's maximum cash used in the server scoring system. Should a floating point number. 1 = factor has normal importance, > 1 = factor has more importance, < 1 = factor has less importance, 0 = factor is not used, < 0 = factor has negative effect. Defaults to ${
      object_defaults.float_multiplier_factor_max_cash
    }.

  -${object_argument_names.multiplier_growth.short}, --${
        object_argument_names.multiplier_growth.long
      } <FLOAT>
    FLOAT = The multiplier used to change the weight of the factor representing the target server's growth used in the server scoring system. Should a floating point number. 1 = factor has normal importance, > 1 = factor has more importance, < 1 = factor has less importance, 0 = factor is not used, < 0 = factor has negative effect. Defaults to ${
      object_defaults.float_multiplier_factor_growth
    }.

  -${object_argument_names.ram_cyclic_weaken.short}, --${
        object_argument_names.ram_cyclic_weaken.long
      } <FLOAT>
    FLOAT = The fraction of the botnet's current available RAM to be used by "${
      object_helpers.string_weaken_manager
    }" to run threads of "${
        object_helpers.string_cyclic_weaken
      }". Should be a floating point number > 0. Defaults to ${
        object_defaults.float_ram_fraction_for_weaken_cyclic
      }.`)
    );
  };

  const void_main = async () => {
    // variables
    const object_defaults = object_constants.object_defaults,
      object_argument_names = object_constants.object_argument_names,
      object_helpers = object_constants.object_helpers,
      // Threads of the non-operative script required to reserve enough RAM to run the hacking script.
      integer_threads_nop = integer_get_threads_nop({
        object_netscript: object_netscript,
        string_script_first: object_helpers.string_hacker,
        string_script_second: object_netscript.getScriptName(),
        string_nop: object_constants.object_helpers.string_nop,
      });
    // If this server doesn't have enough RAM to run the hacking script, eject.
    if (
      !boolean_can_server_run_script_threads({
        object_netscript: object_netscript,
        float_server_used_ram_free: float_get_server_ram_free({
          object_netscript: object_netscript,
          string_server: object_netscript.getHostname(),
        }),
        integer_threads: integer_threads_nop,
        string_script: object_helpers.string_nop,
      })
    ) {
      const string_message_error = `This server has insufficient RAM to run "${object_helpers.string_nop}" with "${integer_threads_nop}" thread(s).`;
      throw (
        (object_netscript.tprint(`ERROR: ${string_message_error}`),
        new Error(string_message_error))
      );
    }
    let string_servers_bought_name = object_defaults.string_servers_bought_name,
      integer_job_cap = object_defaults.integer_job_cap,
      float_padding_seconds = object_defaults.float_padding_seconds,
      float_precision = object_defaults.float_precision,
      float_steal_cap = object_defaults.float_steal_cap,
      float_period_seconds = object_defaults.float_period_seconds,
      string_server_target = object_defaults.string_server_target,
      float_ram_utilisation_threshold =
        object_defaults.float_ram_utilisation_threshold,
      float_multiplier_factor_skill =
        object_defaults.float_multiplier_factor_skill,
      float_multiplier_factor_max_cash =
        object_defaults.float_multiplier_factor_max_cash,
      float_multiplier_factor_growth =
        object_defaults.float_multiplier_factor_growth,
      boolean_method_score_correction =
        object_defaults.boolean_method_score_correction,
      float_ram_fraction_for_weaken_cyclic =
        object_defaults.float_ram_fraction_for_weaken_cyclic,
      boolean_print_help = object_defaults.boolean_print_help;

    // Parse arguments
    const object_arguments = object_parse_arguments({
      array_arguments: object_netscript.args,
    });
    for (const string_argument in object_arguments)
      if (object_arguments.hasOwnProperty(string_argument)) {
        const argument_value = object_arguments[string_argument];
        switch (string_argument) {
          case object_argument_names.check_delay.short:
          // fall-through
          case object_argument_names.check_delay.long:
            float_period_seconds = argument_value;
            break;
          case object_argument_names.job_delay.short:
          // fall-through
          case object_argument_names.job_delay.long:
            float_padding_seconds = argument_value;
            break;
          case object_argument_names.help.short:
          // fall-through
          case object_argument_names.help.long:
            boolean_print_help = argument_value;
            break;
          case object_argument_names.target.short:
          // fall-through
          case object_argument_names.target.long:
            string_server_target = argument_value;
            break;
          case object_argument_names.job_cap.short:
          // fall-through
          case object_argument_names.job_cap.long:
            integer_job_cap = argument_value;
            break;
          case object_argument_names.multiplier_skill.short:
          // fall-through
          case object_argument_names.multiplier_skill.long:
            float_multiplier_factor_skill = argument_value;
            break;
          case object_argument_names.multiplier_cash.short:
          // fall-through
          case object_argument_names.multiplier_cash.long:
            float_multiplier_factor_max_cash = argument_value;
            break;
          case object_argument_names.multiplier_growth.short:
          // fall-through
          case object_argument_names.multiplier_growth.long:
            float_multiplier_factor_growth = argument_value;
            break;
          case object_argument_names.server_name.short:
          // fall-through
          case object_argument_names.server_name.long:
            string_servers_bought_name = argument_value;
            break;
          case object_argument_names.precision.short:
          // fall-through
          case object_argument_names.precision.long:
            float_precision = argument_value;
            break;
          case object_argument_names.normal.short:
          // fall-through
          case object_argument_names.normal.long:
            boolean_method_score_correction = argument_value;
            break;
          case object_argument_names.ram_utilisation.short:
          // fall-through
          case object_argument_names.ram_utilisation.long:
            float_ram_utilisation_threshold = argument_value;
            break;
          case object_argument_names.steal_cap.short:
          // fall-through
          case object_argument_names.steal_cap.long:
            float_steal_cap = argument_value;
            break;
          case object_argument_names.ram_cyclic_weaken.short:
          // fall-through
          case object_argument_names.ram_cyclic_weaken.long:
            float_ram_fraction_for_weaken_cyclic = argument_value;
            break;
        }
      }

    const float_period = 1e3 * float_period_seconds,
      float_padding = 1e3 * float_padding_seconds,
      array_helpers = [
        {
          string_script: object_helpers.string_ram,
          float_threads_or_fraction_botnet: 1,
          array_arguments: [float_period, float_ram_utilisation_threshold],
        },
        {
          string_script: object_helpers.string_servers,
          float_threads_or_fraction_botnet: 1,
          array_arguments: [
            float_period,
            string_servers_bought_name,
            float_ram_utilisation_threshold,
          ],
        },
        {
          string_script: object_helpers.string_tor,
          float_threads_or_fraction_botnet: 1,
          array_arguments: [float_period],
        },
        {
          string_script: object_helpers.string_programs,
          float_threads_or_fraction_botnet: 1,
          array_arguments: [float_period, object_constants.array_programs],
        },
        {
          string_script: object_helpers.string_botnet,
          float_threads_or_fraction_botnet: 1,
          array_arguments: [float_period],
        },
        {
          string_script: object_helpers.string_weaken_manager,
          float_threads_or_fraction_botnet: 1,
          array_arguments: [
            float_period,
            object_constants.object_helpers.string_cyclic_weaken,
            float_ram_fraction_for_weaken_cyclic,
            object_netscript.getHostname(),
            object_helpers.string_hacker,
            [float_padding],
          ],
        },
      ];

    const array_helpers_parsed = array_helpers.filter((object_helper) => {
      switch (object_helper.string_script) {
        case object_helpers.string_ram:
          return object_arguments.hasOwnProperty(
            object_argument_names.ram.short
          )
            ? !object_arguments[object_argument_names.ram.short]
            : !object_arguments.hasOwnProperty(
                object_argument_names.ram.long
              ) || !!object_arguments[object_argument_names.ram.long];
        case object_helpers.string_servers:
          return object_arguments.hasOwnProperty(
            object_argument_names.servers.short
          )
            ? !object_arguments[object_argument_names.servers.short]
            : !object_arguments.hasOwnProperty(
                object_argument_names.servers.long
              ) || !!object_arguments[object_argument_names.servers.long];
        case object_helpers.string_tor:
          return object_arguments.hasOwnProperty(
            object_argument_names.tor.short
          )
            ? !object_arguments[object_argument_names.tor.short]
            : !object_arguments.hasOwnProperty(
                object_argument_names.tor.long
              ) || !!object_arguments[object_argument_names.tor.long];
        case object_helpers.string_programs:
          return object_arguments.hasOwnProperty(
            object_argument_names.programs.short
          )
            ? !object_arguments[object_argument_names.programs.short]
            : !object_arguments.hasOwnProperty(
                object_argument_names.programs.long
              ) || !!object_arguments[object_argument_names.programs.long];
        case object_helpers.string_botnet:
          return object_arguments.hasOwnProperty(
            object_argument_names.botnet.short
          )
            ? !object_arguments[object_argument_names.botnet.short]
            : !object_arguments.hasOwnProperty(
                object_argument_names.botnet.long
              ) || !!object_arguments[object_argument_names.botnet.long];
        case object_helpers.string_weaken_manager:
          return object_arguments.hasOwnProperty(
            object_argument_names.weaken_manager.short
          )
            ? !object_arguments[object_argument_names.weaken_manager.short]
            : !object_arguments.hasOwnProperty(
                object_argument_names.weaken_manager.long
              ) ||
                !!object_arguments[object_argument_names.weaken_manager.long];
        default:
          const string_message_error = `"${object_helper.string_script}" is an unrecognised script.`;
          throw (
            (object_netscript.tprint(`ERROR: ${string_message_error}`),
            new Error(string_message_error))
          );
      }
    });

    // Main
    if (boolean_print_help) return void_print_help();
    // Copy required files to all servers.
    void_copy_files({
      object_netscript: object_netscript,
      string_substrings: object_constants.array_identifier_files_required,
    });
    // Reserve enough RAM for the hacking script.
    integer_exec({
      object_netscript: object_netscript,
      string_script: object_helpers.string_nop,
      string_server: object_netscript.getHostname(),
      integer_threads: integer_threads_nop,
    });
    // Run helper scripts.
    void_schedule_script_runner({
      object_netscript: object_netscript,
      array_schedule: array_get_schedule_script({
        object_netscript: object_netscript,
        array_scripts: array_helpers_parsed,
      }),
    });
    // Kill the non-operative scripts to free RAM.
    void_kill_script_named_server_named({
      object_netscript: object_netscript,
      string_server: object_netscript.getHostname(),
      string_script: object_helpers.string_nop,
    });
    // Set options for the hacking script.
    const object_document = parent["document"];
    object_document.nicoty_hacker_string_server_target_manual = string_server_target;
    object_document.nicoty_hacker_boolean_method_score_correction = boolean_method_score_correction;
    object_document.nicoty_hacker_float_multiplier_factor_skill = float_multiplier_factor_skill;
    object_document.nicoty_hacker_float_multiplier_factor_max_cash = float_multiplier_factor_max_cash;
    object_document.nicoty_hacker_float_multiplier_factor_growth = float_multiplier_factor_growth;
    object_document.nicoty_hacker_integer_job_cap = integer_job_cap;
    object_document.nicoty_hacker_float_precision = float_precision;
    object_document.nicoty_hacker_float_steal_cap = float_steal_cap;
    object_document.nicoty_hacker_float_padding = float_padding;
    // Spawn the hacking script.
    object_netscript.spawn(object_helpers.string_hacker, 1);
  };

  await void_main();
};

