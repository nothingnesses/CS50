/**
 * @description nicoty.bin.lshw.js - 7.35GB - Displays information about one or more servers.
 * @license BlueOak-1.0.0
 * @todo Add flags that prevent certain information from being displayed.
 */

import {
  string_sanitise,
  object_parse_arguments,
} from "nicoty.lib.no.netscript.js";
import {
  float_get_time_hack,
  float_get_time_grow,
  float_get_time_weaken,
} from "nicoty.lib.time.js";
import {
  float_get_server_score,
} from "nicoty.lib.score.js";

/**
 * @description Constants.
 * @readonly
 * @property {number} float_commission - The cost of a transaction.
 * @property {number} float_period_update_stock - The delay between each market update in milliseconds. @see {@link msPerStockUpdate in src/StockMartket/StockMarket.tsx}
 * @property {Object} object_defaults - Contains default values for script's arguments.
 * @property {number} object_defaults.integer_precision - Decimal places to use for displaying numerical information.
 * @property {number} object_defaults.float_multiplier_factor_skill - Multiplier for skill factor used in server scoring system.
 * @property {number} object_defaults.float_multiplier_factor_max_cash - Multiplier for max cash factor used in server scoring system.
 * @property {number} object_defaults.float_multiplier_factor_growth - Multiplier for growth factor used in server scoring system.
 * @property {number} object_defaults.boolean_method_score_correction - Correction method for factors used in server scoring system. True = mean-normalisation, false = standardisation.
 * @property {number} object_defaults.float_period_seconds - The duration to wait per iteration of the script's main loop in seconds.
 * @property {Object} object_argument_names - Contains argument names.
 */
const object_constants = {
  object_defaults: {
    integer_precision: 2,
    float_multiplier_factor_skill: 1,
    float_multiplier_factor_max_cash: 1,
    float_multiplier_factor_growth: 1,
    boolean_method_score_correction: false,
    float_period_seconds: 0,
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
    precision: {
      short: "p",
      long: "precision",
    },
    normal: {
      short: "q",
      long: "normal",
    },
  },
};

/**
 * @param {Object} object_netscript - The Netscript environment.
 */
export const main = async (object_netscript) => {
  /**
   * @description Prints a help message to the terminal.
   */
  const void_print_help = () => {
    const
      object_argument_names = object_constants.object_argument_names,
      object_defaults = object_constants.object_defaults;
    object_netscript.tprint(
      string_sanitise(`
DESCRIPTION
  Display information about one or more servers.
  Optionally, display the information at regular intervals.

USAGE
  run ${object_netscript.getScriptName()} [OPTIONS ...] <ARGUMENT [ARGUMENT ...]>

  ARGUMENT = Server to display the information about.

FLAGS
  -${object_argument_names.help.short}, --${object_argument_names.help.long}
    Displays this message then exits.

  -${object_argument_names.normal.short}, --${object_argument_names.normal.long}
    Use mean-normalised correction for the server scoring system instead of standard correction.
  
OPTIONS
  -${object_argument_names.delay.short}, --${object_argument_names.delay.long} <SECONDS>
    SECONDS = The duration of delay between updates, in seconds. Should be a floating-point number >= 0.001. By default, the script will only display server information once, unless this option is manually set.

  -${object_argument_names.multiplier_skill.short}, --${object_argument_names.multiplier_skill.long} <FLOAT>
    FLOAT = The multiplier used to change the weight of the factor representing your skill against the target server used in the server scoring system. Should a floating point number. 1 = factor has normal importance, > 1 = factor has more importance, < 1 = factor has less importance, 0 = factor is not used, < 0 = factor has negative effect. Defaults to ${object_defaults.float_multiplier_factor_skill}.

  -${object_argument_names.multiplier_cash.short}, --${object_argument_names.multiplier_cash.long} <FLOAT>
    FLOAT = The multiplier used to change the weight of the factor representing the target server's maximum cash used in the server scoring system. Should a floating point number. 1 = factor has normal importance, > 1 = factor has more importance, < 1 = factor has less importance, 0 = factor is not used, < 0 = factor has negative effect. Defaults to ${object_defaults.float_multiplier_factor_max_cash}.

  -${object_argument_names.multiplier_growth.short}, --${object_argument_names.multiplier_growth.long} <FLOAT>
    FLOAT = The multiplier used to change the weight of the factor representing the target server's growth used in the server scoring system. Should a floating point number. 1 = factor has normal importance, > 1 = factor has more importance, < 1 = factor has less importance, 0 = factor is not used, < 0 = factor has negative effect. Defaults to ${object_defaults.float_multiplier_factor_growth}.

  -${object_argument_names.precision.short}, --${object_argument_names.precision.long} <INTEGER>
    INTEGER = The decimal places to display floating point values with. Should be an integer >= 0. Defaults to ${object_defaults.integer_precision}.`
      )
    );
  };
  
  /**
   * @description Returns a new stock object.
   * @param {Object} object_arguments - Contains the arguments for the function.
   * @param {string} object_arguments.string_server - The server to print information of.
   * @param {number} object_arguments.integer_precision - Decimal places to use for displaying numerical information.
   * @param {boolean} object_arguments.boolean_method_score_correction - Correction method for factors used in server scoring system. True = mean-normalisation, false = standardisation.
   * @param {number} object_arguments.float_multiplier_factor_skill - Multiplier for skill factor used in server scoring system.
   * @param {number} object_arguments.float_multiplier_factor_max_cash - Multiplier for max cash factor used in server scoring system.
   * @param {number} object_arguments.float_multiplier_factor_growth - Multiplier for growth factor used in server scoring system.
   */
  const void_print_information = ({
    string_server: s,
    integer_precision: p,
    boolean_method_score_correction: c,
    float_multiplier_factor_skill: k,
    float_multiplier_factor_max_cash: m,
    float_multiplier_factor_growth: g,
  }) => {
    const
      float_cash_max = object_netscript.getServerMaxMoney(s),
      float_cash_current = object_netscript.getServerMoneyAvailable(s),
      float_security_minimum = object_netscript.getServerMinSecurityLevel(s),
      float_security_current = object_netscript.getServerSecurityLevel(s),
      array_ram = object_netscript.getServerRam(s),
      float_ram_total = array_ram[0],
      float_ram_used = array_ram[1],
      float_ram_free = array_ram[0] - array_ram[1],
      // Comment unneeded info.
      string_server_information =`
Time:			${new Date().toISOString()}
Name:			${s}
Root access:		${object_netscript.hasRootAccess(s)}
Maximum cash ($):	${float_cash_max.toFixed(p)}
Current cash ($):	${float_cash_current.toFixed(p)}
Current cash (%):	${((float_cash_current * 100) / float_cash_max).toFixed(p)}
Minimum security:	${float_security_minimum.toFixed(p)}
Current security:	${float_security_current.toFixed(p)}
Current security (x):	${(
      float_security_current / float_security_minimum
    ).toFixed(p)}
Growth rate:		${object_netscript.getServerGrowth(s)}
hack() time (s):	${float_get_time_hack({object_netscript: object_netscript, string_server: s, float_server_security: float_security_current}).toFixed(p)}
grow() time (s):	${float_get_time_grow({object_netscript: object_netscript, string_server: s, float_server_security: float_security_current}).toFixed(p)}
weaken() time (s):	${float_get_time_weaken({object_netscript: object_netscript, string_server: s, float_server_security: float_security_current}).toFixed(p)}
Hacking level needed:	${object_netscript.getServerRequiredHackingLevel(s)}
Score:			${float_get_server_score({
  object_netscript: object_netscript,
  string_server: s,
  boolean_method_score_correction: c,
  float_multiplier_factor_skill: k,
  float_multiplier_factor_max_cash: m,
  float_multiplier_factor_growth: g,
}).toFixed(p)}
Ports needed for root:	${object_netscript.getServerNumPortsRequired(s)}
RAM total (GB):		${float_ram_total.toFixed(p)}
RAM used (GB):		${float_ram_used.toFixed(p)}
RAM used (%):		${((float_ram_used * 100) / float_ram_total).toFixed(p)}
RAM free (GB):		${float_ram_free.toFixed(p)}
RAM free (%):		${((float_ram_free * 100) / float_ram_total).toFixed(p)}`;
    object_netscript.tprint(string_server_information);
  };

  const void_main = async () => {
    // variables
    const
      // defaults
      object_defaults = object_constants.object_defaults,
      // argument names
      object_argument_names = object_constants.object_argument_names;
    let
      float_multiplier_factor_skill = object_defaults.float_multiplier_factor_skill,
      float_multiplier_factor_max_cash = object_defaults.float_multiplier_factor_max_cash,
      float_multiplier_factor_growth = object_defaults.float_multiplier_factor_growth,
      boolean_method_score_correction = object_defaults.boolean_method_score_correction,
      float_period_seconds = object_defaults.float_period_seconds,
      integer_precision = object_defaults.integer_precision,
      array_servers = [],
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
          case object_argument_names.precision.short:
          // fall-through
          case object_argument_names.precision.long:
            integer_precision = argument_value;
            break;
          case object_argument_names.normal.short:
          // fall-through
          case object_argument_names.normal.long:
            boolean_method_score_correction = argument_value;
            break;
          case "_":
            array_servers = argument_value;
            break;
          default:
            const string_message_error = `Unknown argument passed: "${string_argument}".`;
            throw (object_netscript.tprint(`ERROR: ${string_message_error}`), new Error(string_message_error));
        }
      }
  
    if (boolean_print_help)
      return void_print_help(object_netscript);
    const float_period = 1e3 * float_period_seconds;
    0 === array_servers.length && array_servers.push(object_netscript.getHostname());
    array_servers.forEach((string_server) => {
      void_print_information({
        string_server: string_server,
        integer_precision: integer_precision,
        boolean_method_score_correction: boolean_method_score_correction,
        float_multiplier_factor_skill: float_multiplier_factor_skill,
        float_multiplier_factor_max_cash: float_multiplier_factor_max_cash,
        float_multiplier_factor_growth: float_multiplier_factor_growth,
      });
    });
    if (float_period === 0) return;
    for (
      ;
      ;

    ) {
      array_servers.forEach((string_server) => {
        void_print_information({
          string_server: string_server,
          integer_precision: integer_precision,
          boolean_method_score_correction: boolean_method_score_correction,
          float_multiplier_factor_skill: float_multiplier_factor_skill,
          float_multiplier_factor_max_cash: float_multiplier_factor_max_cash,
          float_multiplier_factor_growth: float_multiplier_factor_growth,
        });
      }),
      await object_netscript.sleep(float_period);
    }
  };

  await void_main();
};
