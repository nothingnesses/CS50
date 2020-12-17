/**
 * @description nicoty.lib.ram.server.js - 2GB
 * @license BlueOak-1.0.0
 */

import {
  array_get_servers_rooted,
}
from "nicoty.lib.root.js";

/**
 * @description Returns the total RAM of a server.
 * @param {Object} object_arguments - Contains the arguments for the function.
 * @param {Object} object_arguments.object_netscript - The Netscript environment.
 * @param {string} object_arguments.string_server - The server to get the total RAM of.
 * @returns {number} The server's total RAM.
 */
export const float_get_server_ram_total = ({
  object_netscript: n,
  string_server: s,
}) => n.getServerRam(s)[0];

/**
 * @description Returns the used RAM of a server.
 * @param {Object} object_arguments - Contains the arguments for the function.
 * @param {Object} object_arguments.object_netscript - The Netscript environment.
 * @param {string} object_arguments.string_server - The server to get the used RAM of.
 * @returns {number} The server's used RAM.
 */
export const float_get_server_ram_used = ({
  object_netscript: n,
  string_server: s,
}) => n.getServerRam(s)[1];

/**
 * @description Returns the available RAM of a server.
 * @param {Object} object_arguments - Contains the arguments for the function.
 * @param {Object} object_arguments.object_netscript - The Netscript environment.
 * @param {string} object_arguments.string_server - The server to get the available RAM of.
 * @param {number} [object_arguments.float_server_ram_used] - Optional used RAM of the server. Defaults to the current used RAM.
 * @returns {number} The server's available RAM.
 */
export const float_get_server_ram_free = ({
  object_netscript: n,
  string_server: s,
  float_server_ram_used: u = float_get_server_ram_used({ object_netscript: n, string_server: s }),
}) =>
  float_get_server_ram_total({ object_netscript: n, string_server: s }) - u;

/**
 * @description Returns an object containing a server object and its free RAM.
 * @param {Object} object_arguments - Contains the arguments for the function.
 * @param {Object} object_arguments.object_netscript - The Netscript environment.
 * @param {Object} object_arguments.object_server - The server object.
 * @returns {Object} Contains a server object and its free RAM.
 */
const object_get_server_and_ram_free = ({
  object_netscript: n,
  object_server: s,
}) => ({
  object_server: s,
  float_ram_free: float_get_server_ram_free({
    object_netscript: n,
    string_server: s.string_server,
    float_server_ram_used: s.float_ram_used,
  })
});

/**
 * @description Returns the server object with the most free RAM from an array of server objects.
 * @param {Object} object_arguments - Contains the arguments for the function.
 * @param {Object} object_arguments.object_netscript - The Netscript environment.
 * @param {Object[]} object_arguments.array_servers_used - Array of useable server objects.
 * @returns {Object|null} The copy of the useable server object with the most free RAM.
 */
export const object_get_server_ram_free_biggest = ({
  object_netscript: n,
  array_servers_used: a,
}) =>
  a
    .reduce(
      (object_server_and_ram_free_biggest, object_server) => {
        const object_server_and_ram_free = object_get_server_and_ram_free({
          object_netscript: n,
          object_server: object_server,
        });
        return object_server_and_ram_free.float_ram_free > object_server_and_ram_free_biggest.float_ram_free
          ? object_server_and_ram_free
          : object_server_and_ram_free_biggest
      },
      {
        object_server: null,
        float_ram_free: -Infinity,
      }
    )
    .object_server;

/**
 * @description Returns the total RAM trait from all the servers you have root access to.
 * @param {Object} object_arguments - Contains the arguments for the function.
 * @param {Object} object_arguments.object_netscript - The Netscript environment.
 * @param {function} object_arguments.float_get_ram_trait - The function to use to get the RAM trait of a server.
 * @returns {number} The total RAM trait from all the rooted servers.
 */
export const float_get_network_ram_trait = ({
  object_netscript: n,
  float_get_ram_trait: f,
}) =>
  array_get_servers_rooted(n).reduce(
    (float_accumulator, string_current) =>
      float_accumulator +
      f({
        object_netscript: n,
        string_server: string_current,
      }),
    0
  );

/**
 * @description Returns the RAM utilisation of the botnet as a fraction.
 * @param {Object} object_netscript - The Netscript environment.
 * @returns {number} The RAM utilisation of the botnet as a fraction.
 */
export const float_get_network_ram_utilisation = (object_netscript) =>
  float_get_network_ram_trait({
    object_netscript: object_netscript,
    float_get_ram_trait: float_get_server_ram_used,
  }) /
  float_get_network_ram_trait({
    object_netscript: object_netscript,
    float_get_ram_trait: float_get_server_ram_total,
  });

/**
 * @description Returns an array of names of rooted servers that have total RAM > 0.
 * @param {Object} object_netscript - The Netscript environment.
 * @returns {string[]} Contains the names of rooted servers that have total RAM > 0.
 */
export const array_get_servers_useable = (object_netscript) =>
  array_get_servers_rooted(object_netscript).filter(
    (string_server) =>
      float_get_server_ram_total({
        object_netscript: object_netscript,
        string_server: string_server
      }) > 0
  );
