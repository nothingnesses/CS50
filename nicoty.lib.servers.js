/**
 * @description nicoty.lib.servers.js - 1.85GB
 * @license BlueOak-1.0.0
 */

import { array_get_strings_matching_regexes } from "nicoty.lib.no.netscript.js";

/**
 * @description Returns an array of the names of all discoverable servers in the game.
 * @param {Object} object_arguments - Contains the arguments for the function.
 * @param {Object} object_arguments.object_netscript - The Netscript environment.
 * @param {string[]} [object_arguments.array_found] - Optional array containing found servers.
 * @param {string[]} [object_arguments.array_visited] - Optional array containing visited servers.
 * @returns {string[]} Contains the names of all discoverable servers in the game.
 * @todo Return any errors?
 */
export const array_get_servers = ({
  object_netscript: n,
  array_found: f = [n.getHostname()],
  array_visited: v = [],
}) => {
  const object_document = parent["document"];
  if (
    Array.isArray(object_document.nicoty_array_servers) &&
    object_document.nicoty_array_servers.length > 0
  ) {
    return object_document.nicoty_array_servers;
  } else {
    const array_found_new = f
      // Find new servers
      .flatMap((string_found) => n.scan(string_found))
      // Remove duplicates. The following check assumes that none of the results of the current search are any of the nodes in the parent array.
      .reduce(
        (array_accumulator, string_found_new) =>
          -1 === v.indexOf(string_found_new) &&
          -1 === array_accumulator.indexOf(string_found_new)
            ? array_accumulator.concat(string_found_new)
            : array_accumulator,
        // Use an empty array as initial value for the callback function to coerce `array_accumulator` to be an array.
        []
      );
    if (0 === array_found_new.length) {
      // No new servers found, cache and return the array.
      object_document.nicoty_array_servers = v.concat(f);
      return object_document.nicoty_array_servers;
    }
    // New servers found, keep recursing.
    return array_get_servers({
      object_netscript: n,
      array_found: array_found_new,
      array_visited: v.concat(f),
    });
  }
};

/**
 * @description If the provided array is empty, returns an array containing all discoverable servers in the game, otherwise, returns an array containing server names that matches some or all of an array of regular expression objects.
 * @param {Object} object_arguments - Contains the arguments for the function.
 * @param {Object} object_arguments.object_netscript - The Netscript environment.
 * @param {Object[]} object_arguments.array_regexes - Contains regular expression objects that server names will be checked against.
 * @param {boolean} object_arguments.boolean_all - Whether or not server names should match all or only some of the regular expressions.
 * @returns {string[]} If the provided array was empty, contains all discoverable servers in the game, otherwise contains server names that matches some or all of an array of regular expression objects.
 * @see {@link `updateMoneyGainRate`} {@link https://github.com/danielyxie/bitburner/blob/master/src/Hacknet/HacknetNode.ts|GitHub}.
 */
export const array_get_servers_matching_regexes = ({
  object_netscript: n,
  array_regexes: r = [],
  boolean_all: a = !1,
}) =>
  r.length === 0
    ? array_get_servers({ object_netscript: n })
    : array_get_strings_matching_regexes({
        array_strings: array_get_servers({ object_netscript: n }),
        array_regexes: r,
        boolean_all: a,
      });

