/**
 * @description nicoty.lib.ps.js - 2.3GB.
 * @license BlueOak-1.0.0
 */

import {
  array_get_servers_rooted,
}
from "nicoty.lib.root.js";

import {
  float_get_server_ram_total,
  float_get_network_ram_trait,
}
from "nicoty.lib.ram.server.js";

/**
 * @description Returns the fraction of the network of rooted server's RAM used by a script.
 * @param {Object} object_arguments - Contains the arguments for the procedure.
 * @param {Object} object_arguments.object_netscript - The Netscript environment.
 * @param {string} object_arguments.string_script - The name of the script.
 * @return {number} The fraction of the network of rooted server's RAM used by a script.
 */
export const float_get_network_ram_fraction_used_by_script = ({
  object_netscript: n,
  string_script: c,
}) =>
  array_get_servers_rooted(n).reduce(
    (float_ram_used_accumulator, string_server) =>
      float_ram_used_accumulator +
      n
        .ps(string_server)
        .reduce(
          (float_ram_used_accumulator, object_script) =>
            float_ram_used_accumulator + (
              object_script.filename === c
                ? object_script.threads * n.getScriptRam(c, string_server)
                : 0
            ),
          0
        ),
    0
  ) / float_get_network_ram_trait({
    object_netscript: n,
    float_get_ram_trait: float_get_server_ram_total,
  });
