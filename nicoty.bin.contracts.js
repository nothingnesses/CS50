/**
 * @description nicoty.bin.contracts.js - 22.05 GB - Attempts to solve existing coding contracts.
 * @license BlueOak-1.0.0
 */

import {
  string_sanitise,
  object_parse_arguments,
} from "nicoty.lib.no.netscript.js";
import {
  array_get_files_with_string,
} from "nicoty.lib.ls.js";
import {
  array_get_servers,
} from "nicoty.lib.servers.js";

/**
 * @description Constants.
 * @readonly
 * @property {Object} object_defaults - Contains default values for script's arguments.
 * @property {number} object_defaults.float_period_check_seconds - Time period used for checking the time in seconds.
 * @property {boolean} object_defaults.boolean_verbose - Whether to display notification messages or not.
 * @property {boolean} object_defaults.boolean_print_help - Whether to display help and exit.
 * @property {Object} object_argument_names - Contains argument names.
 * @property {Object} object_solvers - Contract solving functions. Adapted from functions in {@link https://github.com/danielyxie/bitburner/blob/master/src/data/codingcontracttypes.ts|Bitburner's source code}.
 */
const object_constants = {
  object_argument_names: {
    delay: {
      short: "d",
      long: "delay",
    },
    help: {
      short: "h",
      long: "help",
    },
    verbose: {
      short: "v",
      long: "verbose",
    },
  },
  object_defaults: {
    float_period_seconds: 0,
    boolean_verbose: !1,
    boolean_print_help: !1,
  },
  object_solvers: {
    "Find Largest Prime Factor": (data) => {
      let fac = 2;
      let n = data;
      while (n > ((fac - 1) * (fac - 1))) {
          while (n % fac === 0) {
              n = Math.round(n / fac);
          }
          ++fac;
      }
      return (n === 1 ? (fac - 1) : n);
    },
    "Subarray with Maximum Sum": (data) => {
      const nums = data.slice();
      for (let i = 1; i < nums.length; i++) {
          nums[i] = Math.max(nums[i], nums[i] + nums[i - 1]);
      }
      return Math.max(...nums);
    },
    "Total Ways to Sum": (data) => {
      const ways = [1];
      ways.length = data + 1;
      ways.fill(0, 1);
      for (let i = 1; i < data; ++i) {
          for (let j = i; j <= data; ++j) {
              ways[j] += ways[j - i];
          }
      }
      return ways[data];
    },
    "Spiralize Matrix": (data) => {
      const spiral = [];
      const m = data.length;
      const n = data[0].length;
      let u = 0;
      let d = m - 1;
      let l = 0;
      let r = n - 1;
      let k = 0;
      while (true) {
          // Up
          for (let col = l; col <= r; col++) {
              spiral[k] = data[u][col];
              ++k;
          }
          if (++u > d) {
              break;
          }
          // Right
          for (let row = u; row <= d; row++) {
              spiral[k] = data[row][r];
              ++k;
          }
          if (--r < l) {
              break;
          }
          // Down
          for (let col = r; col >= l; col--) {
              spiral[k] = data[d][col];
              ++k;
          }
          if (--d < u) {
              break;
          }
          // Left
          for (let row = d; row >= u; row--) {
              spiral[k] = data[row][l];
              ++k;
          }
          if (++l > r) {
              break;
          }
      }
      return spiral;
    },
    "Array Jumping Game": (data) => {
      const n = data.length;
      let i = 0;
      for (let reach = 0; i < n && i <= reach; ++i) {
          reach = Math.max(i + data[i], reach);
      }
      return i === n ? 1 : 0;
    },
    "Merge Overlapping Intervals": (data) => {
      const intervals = data.slice();
      intervals.sort((a, b) => {
          return a[0] - b[0];
      });
      const result = [];
      let start = intervals[0][0];
      let end = intervals[0][1];
      for (const interval of intervals) {
          if (interval[0] <= end) {
              end = Math.max(end, interval[1]);
          }
          else {
              result.push([start, end]);
              start = interval[0];
              end = interval[1];
          }
      }
      result.push([start, end]);
      return result;
    },
    "Generate IP Addresses": (data) => {
      const ret = [];
      for (let a = 1; a <= 3; ++a) {
          for (let b = 1; b <= 3; ++b) {
              for (let c = 1; c <= 3; ++c) {
                  for (let d = 1; d <= 3; ++d) {
                      if (a + b + c + d === data.length) {
                          const A = parseInt(data.substring(0, a), 10);
                          const B = parseInt(data.substring(a, a + b), 10);
                          const C = parseInt(data.substring(a + b, a + b + c), 10);
                          const D = parseInt(data.substring(a + b + c, a + b + c + d), 10);
                          if (A <= 255 && B <= 255 && C <= 255 && D <= 255) {
                              const ip = [A.toString(), ".",
                                  B.toString(), ".",
                                  C.toString(), ".",
                                  D.toString()].join("");
                              if (ip.length === data.length + 3) {
                                  ret.push(ip);
                              }
                          }
                      }
                  }
              }
          }
      }
      return ret;
    },
    "Algorithmic Stock Trader I": (data) => {
      let maxCur = 0;
      let maxSoFar = 0;
      for (let i = 1; i < data.length; ++i) {
          maxCur = Math.max(0, maxCur += data[i] - data[i - 1]);
          maxSoFar = Math.max(maxCur, maxSoFar);
      }
      return maxSoFar.toString();
    },
    "Algorithmic Stock Trader II": (data) => {
      let profit = 0;
      for (let p = 1; p < data.length; ++p) {
          profit += Math.max(data[p] - data[p - 1], 0);
      }
      return profit.toString();
    },
    "Algorithmic Stock Trader III": (data) => {
      let hold1 = Number.MIN_SAFE_INTEGER;
      let hold2 = Number.MIN_SAFE_INTEGER;
      let release1 = 0;
      let release2 = 0;
      for (const price of data) {
          release2 = Math.max(release2, hold2 + price);
          hold2 = Math.max(hold2, release1 - price);
          release1 = Math.max(release1, hold1 + price);
          hold1 = Math.max(hold1, price * -1);
      }
      return release2.toString();
    },
    "Algorithmic Stock Trader IV": (data) => {
      const k = data[0];
      const prices = data[1];
      const len = prices.length;
      if (len < 2) {
          return 0;
      }
      if (k > len / 2) {
          let res = 0;
          for (let i = 1; i < len; ++i) {
              res += Math.max(prices[i] - prices[i - 1], 0);
          }
          return res;
      }
      const hold = [];
      const rele = [];
      hold.length = k + 1;
      rele.length = k + 1;
      for (let i = 0; i <= k; ++i) {
          hold[i] = Number.MIN_SAFE_INTEGER;
          rele[i] = 0;
      }
      let cur;
      for (let i = 0; i < len; ++i) {
          cur = prices[i];
          for (let j = k; j > 0; --j) {
              rele[j] = Math.max(rele[j], hold[j] + cur);
              hold[j] = Math.max(hold[j], rele[j - 1] - cur);
          }
      }
      return rele[k];
    },
    "Minimum Path Sum in a Triangle": (data) => {
      let n = data.length;
      let dp = data[n - 1].slice();
      for (let i = n - 2; i > -1; --i) {
          for (let j = 0; j < data[i].length; ++j) {
              dp[j] = Math.min(dp[j], dp[j + 1]) + data[i][j];
          }
      }
      return dp[0];
    },
    "Unique Paths in a Grid I": (data) => {
      let n = data[0]; // Number of rows
      let m = data[1]; // Number of columns
      let currentRow = [];
      currentRow.length = n;
      for (let i = 0; i < n; i++) {
          currentRow[i] = 1;
      }
      for (let row = 1; row < m; row++) {
          for (let i = 1; i < n; i++) {
              currentRow[i] += currentRow[i - 1];
          }
      }
      return currentRow[n - 1];
    },
    "Unique Paths in a Grid II": (data) => {
      let obstacleGrid = [];
      obstacleGrid.length = data.length;
      for (let i = 0; i < obstacleGrid.length; ++i) {
          obstacleGrid[i] = data[i].slice();
      }
      for (let i = 0; i < obstacleGrid.length; i++) {
          for (let j = 0; j < obstacleGrid[0].length; j++) {
              if (obstacleGrid[i][j] == 1) {
                  obstacleGrid[i][j] = 0;
              }
              else if (i == 0 && j == 0) {
                  obstacleGrid[0][0] = 1;
              }
              else {
                  obstacleGrid[i][j] = (i > 0 ? obstacleGrid[i - 1][j] : 0) + (j > 0 ? obstacleGrid[i][j - 1] : 0);
              }
          }
      }
      return obstacleGrid[obstacleGrid.length - 1][obstacleGrid[0].length - 1];
    },
    "Sanitize Parentheses in Expression": (data) => {
      let left = 0;
      let right = 0;
      let res = [];
      for (let i = 0; i < data.length; ++i) {
          if (data[i] === '(') {
              ++left;
          }
          else if (data[i] === ')') {
              (left > 0) ? --left : ++right;
          }
      }
      function dfs(pair, index, left, right, s, solution, res) {
          if (s.length === index) {
              if (left === 0 && right === 0 && pair === 0) {
                  for (var i = 0; i < res.length; i++) {
                      if (res[i] === solution) {
                          return;
                      }
                  }
                  res.push(solution);
              }
              return;
          }
          if (s[index] === '(') {
              if (left > 0) {
                  dfs(pair, index + 1, left - 1, right, s, solution, res);
              }
              dfs(pair + 1, index + 1, left, right, s, solution + s[index], res);
          }
          else if (s[index] === ')') {
              if (right > 0)
                  dfs(pair, index + 1, left, right - 1, s, solution, res);
              if (pair > 0)
                  dfs(pair - 1, index + 1, left, right, s, solution + s[index], res);
          }
          else {
              dfs(pair, index + 1, left, right, s, solution + s[index], res);
          }
      }
      dfs(0, 0, left, right, data, "", res);
      return res;
    },
    "Find All Valid Math Expressions": (data) => {
      const num = data[0];
      const target = data[1];
      function helper(res, path, num, target, pos, evaluated, multed) {
          if (pos === num.length) {
              if (target === evaluated) {
                  res.push(path);
              }
              return;
          }
          for (let i = pos; i < num.length; ++i) {
              if (i != pos && num[pos] == '0') {
                  break;
              }
              let cur = parseInt(num.substring(pos, i + 1));
              if (pos === 0) {
                  helper(res, path + cur, num, target, i + 1, cur, cur);
              }
              else {
                  helper(res, path + "+" + cur, num, target, i + 1, evaluated + cur, cur);
                  helper(res, path + "-" + cur, num, target, i + 1, evaluated - cur, -cur);
                  helper(res, path + "*" + cur, num, target, i + 1, evaluated - multed + multed * cur, multed * cur);
              }
          }
      }
      let result = [];
      helper(result, "", num, target, 0, 0, 0);
      return result;
    },
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
    const object_argument_names = object_constants.object_argument_names;
    object_netscript.tprint(
      string_sanitise(`
DESCRIPTION
  Attempts to solve existing coding contracts in the network.

USAGE
  run ${object_netscript.getScriptName()} [FLAGS ...] [OPTIONS]

FLAGS
  -${object_argument_names.help.short}, --${object_argument_names.help.long}
    Displays this message then exits.
  
  -${object_argument_names.verbose.short}, --${object_argument_names.verbose.long}
    If set, displays messages regarding successful attempts (in addition to standard failed attempt messages).

OPTIONS
  -${object_argument_names.delay.short}, --${object_argument_names.delay.long} <SECONDS>
    SECONDS = The duration of delay between each network-wide contract search and solve attempts, in seconds. Should be a floating-point number >= 0.001. By default, the script will only search for and attempt to solve contracts once, unless this option is manually set.`)
    );
  };

  /**
   * @description Returns an array of existing coding contract objects.
   * @returns {Object[]} Contains existing coding contract objects.
   */
  const array_get_contracts = () =>
    array_get_servers({ object_netscript: object_netscript })
      .flatMap((string_server) =>
        array_get_files_with_string({
          object_netscript: object_netscript,
          string_server: string_server,
          substrings: ".cct"
        })
          // Check if this really is a contract or just a file with ".cct" in its name.
          .filter((string_file) =>
            "string" ===
            typeof object_netscript.codingcontract.getContractType(
              string_file,
              string_server
            )
          )
          .map((string_contract) =>
            ({
              string_name: string_contract,
              string_location: string_server,
              string_type: object_netscript.codingcontract.getContractType(
                string_contract,
                string_server
              ),
              any_data: object_netscript.codingcontract.getData(string_contract, string_server),
              boolean_or_string_attempt: ({
                any_answer,
                boolean_verbose
              }) =>
                object_netscript.codingcontract.attempt(
                  any_answer,
                  string_contract,
                  string_server,
                  {
                    returnReward: boolean_verbose,
                  }
                ),
            })
          )
      );

  /**
   * @description Attempts to solve existing coding contracts in the network.
   * @param {boolean} boolean_verbose - Whether or not to display extra messages.
   * @todo Return things?
   */
  const void_contracts_solver = (boolean_verbose) =>
    array_get_contracts().forEach((object_contract) => {
      const
        any_answer = object_constants.object_solvers[object_contract.string_type](object_contract.any_data),
        boolean_or_string_output = object_contract.boolean_or_string_attempt({
          any_answer: any_answer,
          boolean_verbose: boolean_verbose
        });
      switch (boolean_or_string_output) {
        case "":
        // fall-through
        case !1:
          object_netscript.tprint(`
Failed to solve:
${JSON.stringify(object_contract)}
Using input:
${any_answer}`);
          break;
        case !0:
          break;
        default:
          object_netscript.tprint(`
${boolean_or_string_output}`);
          break;
      }
    });

  const void_main = async () => {
    // Parse arguments.
    const
      object_defaults = object_constants.object_defaults,
      object_argument_names = object_constants.object_argument_names;
    let
      float_period_seconds = object_defaults.float_period_seconds,
      boolean_verbose = object_defaults.boolean_verbose,
      boolean_print_help = object_defaults.boolean_print_help;
    const object_arguments = object_parse_arguments({ array_arguments: object_netscript.args });
    for (const string_argument in object_arguments)
      if (object_arguments.hasOwnProperty(string_argument)) {
        const argument_value = object_arguments[string_argument];
        switch (string_argument) {
          case object_argument_names.delay.short:
          // fall-through
          case object_argument_names.delay.long:
            float_period_seconds = argument_value;
            break;
          case object_argument_names.verbose.short:
          // fall-through
          case object_argument_names.verbose.long:
            boolean_verbose = argument_value;
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
            throw (object_netscript.tprint(`ERROR: ${string_message_error}`), new Error(string_message_error));
        }
      }
  
    if (boolean_print_help)
      return void_print_help(object_netscript);
    const float_period = 1e3 * float_period_seconds;
    if (float_period > 0)
      for (;;)
        void_contracts_solver(boolean_verbose),
        await object_netscript.sleep(float_period);
    else void_contracts_solver(boolean_verbose);
  };

  await void_main();
};
