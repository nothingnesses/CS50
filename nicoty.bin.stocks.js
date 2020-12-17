/**
 * @description nicoty.bin.start.stock.scripts.js - 8.9GB - Runs scripts related to hacking servers.
 * @license BlueOak-1.0.0
 * @todo Determine if the GUI is already running (main/hacker may have already started it?)
 * @todo Determine if there's enough RAM in the network to run both the trader and GUI (if the latter isn't already running). Do we make the GUI runnable manually as well?
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
 * @property {boolean} object_defaults.boolean_print_help - Whether or not to display help and exit.
 * @property {number} object_defaults.float_investment_capital - The default fraction of total assets to potentially be used for investing in the market.
 * @property {number} object_defaults.integer_prices_average_length - The default maximum length of the stock objects' average price array used for calculating the short range average.
 * @property {Object} object_helpers - Contains the names of helper scripts.
 * @property {Object} object_argument_names - Contains argument names.
 * @property {string[]} array_identifier_files_required - Contains identifiers for files that are required to be in all servers.
 * @property {string} string_property_trade - The property name used for the global property that indicates whether or not trading should occur.
 */
const object_constants = {
  object_defaults: {
    float_period_seconds: 10,
    boolean_print_help: !1,
    float_investment_capital: 1,
    integer_prices_average_length: 10,
    boolean_trade: !0,
  },
  object_helpers: {
    string_nop: "nicoty.sbin.nop.js",
    string_4s_tix_api: "nicoty.sbin.4s.tix.api.js",
    string_stock_trader: "nicoty.sbin.stock.trader.js",
  },
  object_argument_names: {
    investment_capital: { short: "c", long: "investment-capital" },
    help: { short: "h", long: "help" },
    trade: { short: "n", long: "trade" },
    delay: {
      short: "d",
      long: "delay",
    },
    prices_average_length: { short: "r", long: "range" },
  },
  array_identifier_files_required: ["nicoty.lib."],
  object_document: parent["document"],
  object_storage: parent["window"].localStorage,
  string_prefix: "nicoty_stocks_",
  get string_property_investment_capital() {
    return this.string_prefix + "float_investment_capital";
  },
  get string_property_prices_average_length() {
    return this.string_prefix + "integer_prices_average_length";
  },
  get string_property_trade() {
    return this.string_prefix + "boolean_trade";
  },
  get string_property_sell_profitable() {
    return this.string_prefix + "boolean_sell_profitable";
  },
  get string_property_sell_asap() {
    return this.string_prefix + "boolean_sell_asap";
  },
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
DESCRIPTION
  Starts stock-trading related scripts. Requires TIX API access.

USAGE
  run ${object_netscript.getScriptName()} [FLAGS ...] [OPTIONS ...]

FLAGS
  -${object_argument_names.help.short}, --${object_argument_names.help.long}
    Displays this message then exits.

  -${object_argument_names.trade.short}, --no-${
        object_argument_names.trade.long
      }
    Prevents the "${
      object_helpers.string_stock_trader
    }" script from trading right after it's spawned.

OPTIONS
  -${object_argument_names.investment_capital.short}, --${
        object_argument_names.investment_capital.long
      } <FRACTION>
    FRACTION = The fraction of your total cash (invested + not invested in the stock market) that can be used to invest in the stock market. Should be a floating point number > 0 <= 1. Defaults to ${
      object_defaults.float_investment_capital
    }.

  -${object_argument_names.delay.short}, --${
        object_argument_names.delay.long
      } <SECONDS>
    SECONDS = The duration of delay between each repeat of the helper scripts' main loops, in seconds. Should be a floating-point number > 0. Defaults to ${
      object_defaults.float_period_seconds
    }.

  -${object_argument_names.prices_average_length.short}, --${
        object_argument_names.prices_average_length.long
      } <RANGE>
    RANGE = The length of the stock objects' average price array used to calculate the short range simple moving average of the stock's average price growth. Should be an integer >= 1. Defaults to ${
      object_defaults.integer_prices_average_length
    }.`)
    );
  };

  const void_main = async () => {
    // variables
    const object_defaults = object_constants.object_defaults,
      object_argument_names = object_constants.object_argument_names,
      object_helpers = object_constants.object_helpers,
      // Threads of the non-operative script required to reserve enough RAM to run the stock trading script.
      integer_threads_nop = integer_get_threads_nop({
        object_netscript: object_netscript,
        string_script_first: object_helpers.string_stock_trader,
        string_script_second: object_netscript.getScriptName(),
        string_nop: object_constants.object_helpers.string_nop,
      });
    // If this server doesn't have enough RAM to run the stock trading script, eject.
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
    let float_investment_capital = object_defaults.float_investment_capital,
      integer_prices_average_length =
        object_defaults.integer_prices_average_length,
      float_period_seconds = object_defaults.float_period_seconds,
      boolean_print_help = object_defaults.boolean_print_help,
      boolean_trade = object_defaults.boolean_trade;

    // Parse arguments
    const object_arguments = object_parse_arguments({
      array_arguments: object_netscript.args,
    });
    for (const string_argument in object_arguments)
      if (object_arguments.hasOwnProperty(string_argument)) {
        const argument_value = object_arguments[string_argument];
        switch (string_argument) {
          case object_argument_names.investment_capital.short:
          // fall-through
          case object_argument_names.investment_capital.long:
            float_investment_capital = argument_value;
            break;
          case object_argument_names.prices_average_length.short:
          // fall-through
          case object_argument_names.prices_average_length.long:
            integer_prices_average_length = argument_value;
            break;
          case object_argument_names.trade.short:
            boolean_trade = !argument_value;
            break;
          case object_argument_names.trade.long:
            boolean_trade = argument_value;
            break;
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
          case "_":
            continue;
          default:
            const string_message_error = `Unknown argument passed: "${string_argument}".`;
            throw (
              (object_netscript.tprint(`ERROR: ${string_message_error}`),
              new Error(string_message_error))
            );
        }
      }

    const array_helpers = [
      {
        string_script: object_helpers.string_4s_tix_api,
        float_threads_or_fraction_botnet: 1,
        array_arguments: [1e3 * float_period_seconds],
      },
    ];

    // Main
    if (boolean_print_help) return void_print_help();
    try {
      object_netscript.getStockSymbols();
    } catch (object_exception) {
      return object_netscript.tprint(
        "ERROR: Unable to access TIX API! Did you forget to buy access?"
      );
    }
    object_constants.object_document[
      object_constants.string_property_trade
    ] = boolean_trade;
    object_constants.object_document[
      object_constants.string_property_sell_profitable
    ] = !1;
    object_constants.object_document[
      object_constants.string_property_sell_asap
    ] = !1;
    object_constants.object_document[
      object_constants.string_property_investment_capital
    ] = float_investment_capital;
    object_constants.object_document[
      object_constants.string_property_prices_average_length
    ] = integer_prices_average_length;
    // Copy library files to all servers.
    void_copy_files({
      object_netscript: object_netscript,
      string_substrings: object_constants.array_identifier_files_required,
    });
    // Reserve enough RAM for the stock-trading script.
    integer_exec({
      object_netscript: object_netscript,
      string_script: object_helpers.string_nop,
      string_server: object_netscript.getHostname(),
      integer_threads: integer_threads_nop,
    });
    void_schedule_script_runner({
      object_netscript: object_netscript,
      array_schedule: array_get_schedule_script({
        object_netscript: object_netscript,
        array_scripts: array_helpers,
      }),
    });
    // Kill the non-operative scripts to free RAM.
    void_kill_script_named_server_named({
      object_netscript: object_netscript,
      string_server: object_netscript.getHostname(),
      string_script: object_helpers.string_nop,
    });
    object_netscript.spawn(object_helpers.string_stock_trader, 1);
  };

  await void_main();
};

