/**
 * @description nicoty.sbin.servers.js - 8.85GB - Perpetually tries to buy the best server with the available cash if RAM utilisation of the network is over a threshold, unless there are 25 servers already, in which case deletes the worst server and replaces it with a better one, unless all 25 already have the maximum possible RAM.
 * @license BlueOak-1.0.0
 */

import {
  float_get_network_ram_utilisation,
  float_get_server_ram_total,
} from "nicoty.lib.ram.server.js";

/**
 * @description Constants.
 * @readonly
 * @property {number} BaseCostFor1GBOfRamServer - Cost of server per 1 GB of RAM.
 * @property {number} PurchasedServerLimit - Maximum amount of purchased servers allowed.
 * @property {number} integer_server_ram_min - Minimum RAM of purchased servers possible.
 * @property {number} PurchasedServerMaxRam - Maximum RAM of purchased servers possible. 2^20.
 * @see {@link https://github.com/danielyxie/bitburner/blob/master/src/Constants.ts|Bitburner's source code}.
 */
const object_constants = {
  BaseCostFor1GBOfRamServer: 55000,
  PurchasedServerLimit: 25,
  integer_server_ram_min: 2,
  PurchasedServerMaxRam: 1048576,
};

export const main = async (object_netscript) => {
  /**
   * @description Returns `true` if all the bought servers have maximum RAM, otherwise returns `false`.
   * @param {Object} object_arguments - Contains the arguments for the function.
   * @param {string[]} [object_arguments.array_servers_bought] - Contains the names of bought servers.
   * @returns {boolean} `true` if all the bought servers have maximum RAM, otherwise `false`.
   */
  const boolean_servers_bought_all_max = (
    array_servers_bought = object_netscript.getPurchasedServers()
  ) =>
    array_servers_bought.every(
      (string_server) =>
        float_get_server_ram_total({
          object_netscript: object_netscript,
          string_server: string_server,
        }) >= object_constants.PurchasedServerMaxRam
    );

  /**
   * @description Returns the name of the bought server with the smallest RAM.
   * @param {Object} object_arguments - Contains the arguments for the function.
   * @param {string[]} [object_arguments.array_servers_bought] - Contains the names of bought servers.
   * @returns {string|null} The name of the bought server with the smallest RAM.
   */
  const string_get_server_bought_smallest = (
    array_servers_bought = object_netscript.getPurchasedServers()
  ) =>
    array_servers_bought.reduce(
      (object_server_smallest, string_server) => {
        const integer_ram = float_get_server_ram_total({
          object_netscript: object_netscript,
          string_server: string_server,
        });
        return  integer_ram < object_server_smallest.integer_ram
          ? {
            string_server: string_server,
            integer_ram: integer_ram,
          }
          : object_server_smallest;
      },
      {
        string_server: null,
        integer_ram: 1 / 0,
      }
    ).string_server;

  /**
   * @description Returns the name of the bought server with the biggest RAM.
   * @param {Object} object_arguments - Contains the arguments for the function.
   * @param {string[]} [object_arguments.array_servers_bought] - Contains the names of bought servers.
   * @returns {string|null} The name of the bought server with the biggest RAM.
   */
  const string_get_server_bought_biggest = (
    array_servers_bought = object_netscript.getPurchasedServers()
  ) =>
    array_servers_bought.reduce(
      (object_server_biggest, string_server) => {
        const integer_ram = float_get_server_ram_total({
          object_netscript: object_netscript,
          string_server: string_server,
        });
        return integer_ram > object_server_biggest.integer_ram
          ? {
            string_server: string_server,
            integer_ram: integer_ram,
          }
          : object_server_biggest;
      },
      {
        string_server: null,
        integer_ram: -1 / 0,
      }
    ).string_server;

  /**
   * @description Returns the RAM of the server bought with the biggest amount of RAM.
   * @param {string} [string_server_bought_biggest] - The name of server bought with the biggest amount of RAM.
   * @returns {number} The RAM of the server bought with the biggest amount of RAM.
   */
  const integer_get_ram_server_bought_biggest = (
    string_server_bought_biggest = string_get_server_bought_biggest(
      object_netscript.getPurchasedServers()
    )
  ) =>
    float_get_server_ram_total({
      object_netscript: object_netscript,
      string_server: string_server_bought_biggest,
    });

  /**
   * @description Returns the most amount of RAM of a server that can be bought.
   * @returns {number} The most amount of RAM of a server that can be bought.
   */
  const integer_get_ram_biggest_can_buy = () =>
    Math.max(
      object_constants.PurchasedServerMaxRam,
      Math.pow(
        2,
        Math.trunc(
          Math.log2(
            object_netscript.getServerMoneyAvailable("home") /
              object_constants.BaseCostFor1GBOfRamServer
          ) / Math.log2(2)
        )
      )
    );

  /**
   * @description The first set of conditions that should be met before buying a server.
   * @param {Object} object_arguments - Contains the arguments for the function.
   * @param {number} [object_arguments.integer_servers_bought_amount] - The amount of servers bought.
   * @param {number} [object_arguments.integer_ram_biggest_can_buy] - The amount of RAM of the server with the biggest amount of RAM that can be bought.
   * @returns {boolean} `true` if the conditions are met, otherwise `false`.
   * @todo Don't hardcode "home", maybe pass it it as a function parameter?
   */
  const boolean_conditions_server_buy_a = ({
    integer_servers_bought_amount: a = object_netscript.getPurchasedServers()
      .length,
    integer_ram_biggest_can_buy: b = integer_get_ram_biggest_can_buy(),
  }) =>
    // There are no bought servers yet.
    0 === a &&
    // RAM is at least equal to the minimum RAM possible for bought servers.
    b >= object_constants.integer_server_ram_min &&
    // RAM is at least equal to the RAM of "home" (probably a bad idea to hardcode this since the name of "home" might change in the future) or maximum RAM.
    (b >=
      float_get_server_ram_total({
        object_netscript: object_netscript,
        string_server: "home",
      }) ||
      b >= object_constants.PurchasedServerMaxRam);

  /**
   * @description The second set of conditions that should be met before buying a server.
   * @param {Object} object_arguments - Contains the arguments for the function.
   * @param {number} [object_arguments.integer_servers_bought_amount] - The amount of servers bought.
   * @returns {boolean} `true` if the conditions are met, otherwise `false`.
   */
  const boolean_conditions_server_buy_b = (
    integer_servers_bought_amount = object_netscript.getPurchasedServers()
      .length
  ) =>
    // There is at least one bought server.
    integer_servers_bought_amount >= 1 &&
    // The amount of bought servers is less that the maximum allowed
    integer_servers_bought_amount < object_constants.PurchasedServerLimit;

  /**
   * @description The third set of conditions that should be met before buying a server.
   * @param {Object} object_arguments - Contains the arguments for the function.
   * @param {number} [object_arguments.integer_ram_biggest_can_buy] - The amount of RAM of the server with the biggest amount of RAM that can be bought.
   * @param {number} [object_arguments.integer_ram_server_bought_biggest] - The amount of RAM of the server bought with the biggest amount of RAM.
   * @returns {boolean} `true` if the conditions are met, otherwise `false`.
   */
  const boolean_conditions_server_buy_c = ({
    integer_ram_biggest_can_buy: c = integer_get_ram_biggest_can_buy(),
    integer_ram_server_bought_biggest: b = integer_get_ram_server_bought_biggest(
      string_get_server_bought_biggest(object_netscript.getPurchasedServers())
    ),
  }) =>
    // A server with the maximum amount of RAM hasn't been bought yet. A server with RAM greater than the amount of RAM of the server bought with the biggest amount of RAM should be bought.
    b < object_constants.PurchasedServerMaxRam &&
    b < c;

  /**
   * @description The fourth set of conditions that should be met before buying a server.
   * @param {Object} object_arguments - Contains the arguments for the function.
   * @param {number} [object_arguments.integer_ram_biggest_can_buy] - The amount of RAM of the server with the biggest amount of RAM that can be bought.
   * @param {number} [object_arguments.integer_ram_server_bought_biggest] - The amount of RAM of the server bought with the biggest amount of RAM.
   * @returns {boolean} `true` if the conditions are met, otherwise `false`.
   */
  const boolean_conditions_server_buy_d = ({
    integer_ram_biggest_can_buy: c = integer_get_ram_biggest_can_buy(),
    integer_ram_server_bought_biggest: b = integer_get_ram_server_bought_biggest(
      string_get_server_bought_biggest(object_netscript.getPurchasedServers())
    ),
  }) =>
    // A server with the maximum amount of RAM has already been bought. Another one should be bought.
    b == object_constants.PurchasedServerMaxRam &&
    c >= object_constants.PurchasedServerMaxRam;

  /**
   * @description The set of conditions that should be met before buying a server.
   * @param {number} float_ram_utilisation_threshold - The fraction of the network of rooted server's RAM that must be being used.
   * @returns {boolean} `true` if the conditions are met, otherwise `false`.
   */
  const boolean_conditions_server_buy = (float_ram_utilisation_threshold) => {
    const array_servers_bought = object_netscript.getPurchasedServers(),
      integer_ram_biggest_can_buy = integer_get_ram_biggest_can_buy(),
      integer_ram_server_bought_biggest = integer_get_ram_server_bought_biggest(
        string_get_server_bought_biggest(array_servers_bought)
      );
    return (
      !boolean_servers_bought_all_max(array_servers_bought) &&
      float_get_network_ram_utilisation(object_netscript) > float_ram_utilisation_threshold &&
      (boolean_conditions_server_buy_a({
          integer_servers_bought_amount: array_servers_bought.length,
          integer_ram_biggest_can_buy: integer_ram_biggest_can_buy,
        }) || (boolean_conditions_server_buy_b(array_servers_bought.length) &&
        (boolean_conditions_server_buy_c({
            integer_ram_biggest_can_buy: integer_ram_biggest_can_buy,
            integer_ram_server_bought_biggest: integer_ram_server_bought_biggest,
          }) || boolean_conditions_server_buy_d({
          integer_ram_biggest_can_buy: integer_ram_biggest_can_buy,
          integer_ram_server_bought_biggest: integer_ram_server_bought_biggest,
        }))))
    );
  };

  /**
   * @description The set of conditions that should be met before deleting servers and buying better ones.
   * @param {number} float_ram_utilisation_threshold - The fraction of the network of rooted server's RAM that must be being used.
   * @returns {boolean} `true` if the conditions are met, otherwise `false`.
   */
  const boolean_conditions_server_replace = (float_ram_utilisation_threshold) => {
    const array_servers_bought = object_netscript.getPurchasedServers();
    return (
      // The maximum amount of servers has been bought.
      array_servers_bought.length == object_constants.PurchasedServerLimit &&
      // Not all servers have the maximum amount of RAM.
      !boolean_servers_bought_all_max(array_servers_bought) &&
      // Cash is at least equal to the price of the cheapest server bought + the next highest server after that, which is twice the price of the former, thus 3. This check is so that a server with the same RAM as before isn't bought.
      object_netscript.getServerMoneyAvailable("home") >=
      3 *
      object_constants.BaseCostFor1GBOfRamServer *
      float_get_server_ram_total({
        object_netscript: object_netscript,
        string_server: string_get_server_bought_smallest(
          array_servers_bought
        ),
      }) &&
      // The utilisation of the network's RAM is greater than the threshold.
      float_get_network_ram_utilisation(object_netscript) > float_ram_utilisation_threshold
    );
  };

  const void_main = async () => {
    const
      float_period = object_netscript.args[0],
      string_servers_bought_name = object_netscript.args[1],
      float_ram_utilisation_threshold = object_netscript.args[2];
    for (
      ;
      ;

    ) {
      // Replace servers with better ones.
      for (
        ;
        boolean_conditions_server_replace(float_ram_utilisation_threshold);
  
      ) {
        object_netscript.deleteServer(
          string_get_server_bought_smallest(
            object_netscript.getPurchasedServers()
          )
        );
        const integer_ram_biggest_can_buy = integer_get_ram_biggest_can_buy();
        object_netscript.purchaseServer(
          `${string_servers_bought_name}-${integer_ram_biggest_can_buy}`,
          integer_ram_biggest_can_buy
        ),
        await object_netscript.sleep(float_period);
      }
      // Buy servers.
      for (
        ;
        boolean_conditions_server_buy(float_ram_utilisation_threshold);
  
      ) {
        const integer_ram_biggest_can_buy = integer_get_ram_biggest_can_buy();
        object_netscript.purchaseServer(
          `${string_servers_bought_name}-${integer_ram_biggest_can_buy}`,
          integer_ram_biggest_can_buy
        ),
        await object_netscript.sleep(float_period);
      }
      await object_netscript.sleep(float_period);
    }
  };

  await void_main();
};
