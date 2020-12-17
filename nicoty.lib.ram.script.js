/**
 * @description nicoty.lib.ram.script.js - 4GB
 * @license BlueOak-1.0.0
 * @todo: Check if any exports are not actually being used by external scripts.
 */

 import {
  array_make_servers,
  clamp,
  object_get_updated,
  clone,
  any_while,
} from "nicoty.lib.no.netscript.js";
import {
  float_get_server_ram_free,
  float_get_server_ram_total,
  float_get_server_ram_used,
  float_get_network_ram_trait,
  array_get_servers_useable,
  object_get_server_ram_free_biggest,
} from "nicoty.lib.ram.server.js";

/**
 * @description Returns a new useable server object.
 * @param {Object} object_arguments - Contains the arguments for the function.
 * @param {Object} object_arguments.object_netscript - The Netscript environment.
 * @param {string} object_arguments.string_server - The hostname of the server.
 * @returns {Object} The new useable server object.
 */
export const object_get_server_used = ({ object_netscript: n, string_server: s }) => ({
  string_server: s,
  float_ram_used: float_get_server_ram_used({ object_netscript: n, string_server: s }),
});

/**
 * @description Returns `true` if the available RAM is sufficient to run the specified amount of threads of a script, otherwise returns `false.
 * @param {Object} object_arguments - Contains the arguments for the procedure.
 * @param {Object} object_arguments.object_netscript - The Netscript environment.
 * @param {number} object_arguments.float_ram_free - The amount of RAM available.
 * @param {string} object_arguments.string_script - The script to run.
 * @param {number} object_arguments.integer_threads - The number of threads to run.
 * @returns {boolean} `true` if the available RAM is sufficient to run the specified amount of threads of the script, otherwise `false`.
 */
export const boolean_can_run_job = ({
  object_netscript: n,
  float_ram_free: f,
  string_script: s,
  integer_threads: t,
}) => f >= n.getScriptRam(s) * t;

/**
 * @description Returns the maximum amount of threads of a script that can be ran by a useable server object.
 * @param {Object} object_arguments - Contains the arguments for the procedure.
 * @param {Object} object_arguments.object_netscript - The Netscript environment.
 * @param {Object} object_arguments.object_server_used - The useable server object.
 * @param {Object} object_arguments.object_server_used.string_server - The hostname of the useable server.
 * @param {Object} object_arguments.object_server_used.float_ram_used - The used RAM value of the server.
 * @param {string} object_arguments.string_script - The script to run.
 * @returns {boolean} The maximum amount of threads of a script that can be ran by the useable server object.
 */
const integer_get_threads_max = ({
  object_netscript: n,
  object_server_used: u,
  string_script: s,
}) => Math.floor(float_get_server_ram_free({
  object_netscript: n,
  string_server: u.string_server,
  float_server_ram_used: u.float_ram_used,
}) / n.getScriptRam(s));

/**
 * @description Takes a useable server object and returns a new one based on the original, but with an updated used RAM value after simulating it running a job object.
 * @param {Object} object_arguments - Contains the arguments for the function.
 * @param {Object} object_arguments.object_netscript - The Netscript environment.
 * @param {Object} object_arguments.object_job The job object to simulate for the useable server object.
 * @param {number} object_arguments.object_job.string_script - The script value of the job object, representing the name of the script to execute.
 * @param {number} object_arguments.object_job.integer_threads - The threads value of the job object, representing the number of threads to run of the script.
 * @param {Object} object_arguments.object_server_used - The original useable server object.
 * @param {Object} object_arguments.object_server_used.float_ram_used - The amount of RAM of the server that's already used.
 * @returns {Object} The new stock object with values updated after selling some shares.
 */
const object_get_server_used_job_applied = ({
  object_netscript: n,
  object_job: j,
  object_server_used: s,
}) =>
  object_get_updated({
    object_original: s,
    object_properties_new: {
      float_ram_used:
        s.float_ram_used + j.integer_threads * n.getScriptRam(j.string_script),
    },
  });

/**
 * @description Returns a new array of useable server state objects after simulating a change based on a schedule item on to an older array of useable server state objects.
 * @param {Object} object_arguments - Contains the arguments for the function.
 * @param {Object} object_arguments.object_netscript - The Netscript environment.
 * @param {Object[]} object_arguments.array_servers_used - The array of server objects to simulate the changes on.
 * @param {Object} object_arguments.object_job - The job to apply on the server objects.
 * @returns {Object[]} The new array based on the original after simulating the changes.
 */
export const array_get_servers_used_updated = ({
  object_netscript: n,
  array_servers_used: a,
  object_job: j,
}) =>
  a.map((s) =>
    s.string_server === j.string_server_used
      ? object_get_server_used_job_applied({
          object_netscript: n,
          object_job: j,
          object_server_used: s,
        })
      : clone(s)
  );

/**
 * @description Returns `true` if the rooted server with the biggest RAM free as enough free RAM to run at least one thread of the specified script and the number of threads to be ran is greater than 0, otherwise returns `false`.
 * @param {Object} object_arguments - Contains the arguments for the function.
 * @param {Object} object_arguments.object_netscript - The Netscript environment.
 * @param {Object[]} object_arguments.array_servers_used - The array of server objects to simulate the changes on.
 * @param {number} object_arguments.integer_threads - The number of threads to be ran.
 * @param {string} object_arguments.string_script - The name of the script to run.
 * @returns {boolean} `true` if the rooted server with the biggest RAM free as enough free RAM to run at least one thread of the specified script and the number of threads to be ran is greater than 0, otherwise `false`.
 */
const boolean_conditions_array_get_schedule_script = ({
  object_netscript: n,
  array_servers_used: u,
  integer_threads: t,
  string_script: c,
}) => {
  const object_server_ram_free_biggest = object_get_server_ram_free_biggest({
    object_netscript: n,
    array_servers_used: u,
  });
  return t > 0 &&
  boolean_can_run_job({
    object_netscript: n,
    float_ram_free: float_get_server_ram_free({
      object_netscript: n,
      string_server: object_server_ram_free_biggest.string_server,
      float_server_ram_used: object_server_ram_free_biggest.float_ram_used,
    }),
    string_script: c,
    integer_threads: 1,
  });
};

/**
 * @description Takes an older script schedule state object used for the recursive while function and returns a new one based on the original, but with updated values.
 * @param {Object} object_arguments - Contains the arguments for the function.
 * @param {Object} object_arguments.object_netscript - The Netscript environment.
 * @param {Object} object_arguments.object_script - The script object.
 * @param {Object} object_arguments.any_output - The object type that will be returned after the final recursion.
 * @returns {boolean} The updated script schedule state object.
 */
const object_get_schedule_script_updated = ({
  object_netscript: n,
  object_script: s,
  any_output: o,
}) => {
  const
    object_server_ram_free_biggest = object_get_server_ram_free_biggest({
      object_netscript: n,
      array_servers_used: o.array_servers_used,
    }),
    object_job = {
      string_script: s.string_script,
      string_server_used: object_server_ram_free_biggest.string_server,
      integer_threads: clamp({
        value: o.integer_threads,
        lower: 1,
        upper: integer_get_threads_max({
          object_netscript: n,
          object_server_used: object_server_ram_free_biggest,
          string_script: s.string_script,
        }),
      }),
      array_arguments: s.array_arguments,
    };
  return {
    object_netscript: n,
    object_script: s,
    any_output: {
      integer_threads: o.integer_threads - object_job.integer_threads,
      array_schedule: o.array_schedule.concat(object_job),
      array_servers_used: array_get_servers_used_updated({
        object_netscript: n,
        array_servers_used: o.array_servers_used,
        object_job: object_job,
      }),
    },
  };
};

/**
 * @description Takes in an array of script objects and returns an array of job objects.
 * @param {Object} object_arguments - Contains the arguments for the function.
 * @param {Object} object_arguments.object_netscript - The Netscript environment.
 * @param {Object[]} object_arguments.array_scripts - The array of script objects to make a schedule from.
 * @returns {Object[]} The schedule containing the job objects.
 */
export const array_get_schedule_script = ({
  object_netscript: n,
  array_scripts: s,
}) =>
  s.reduce(
    (object_state, object_script) => {
      const object_server_used_ram_free_biggest = object_get_server_ram_free_biggest({
        object_netscript: n,
        array_servers_used: object_state.array_servers_used,
      });
      if (
        boolean_can_run_job({
          object_netscript: n,
          float_ram_free: float_get_server_ram_free({
            object_netscript: n,
            string_server: object_server_used_ram_free_biggest.string_server,
            float_server_ram_used: object_server_used_ram_free_biggest.float_ram_used,
          }),
          string_script: object_script.string_script,
          integer_threads: 1,
        })
      ) {
        const object_schedule_script_updated = any_while({
          any_state: {
            object_netscript: n,
            object_script: object_script,
            any_output: {
              integer_threads:
                object_script.float_threads_or_fraction_botnet >= 1
                  // Assume this many threads are required.
                  ? object_script.float_threads_or_fraction_botnet
                  // Assume fraction of botnet's RAM is required instead.
                  : Math.floor(
                      (float_get_network_ram_trait({
                        object_netscript: n,
                        float_get_ram_trait: float_get_server_ram_total,
                      }) *
                        object_script.float_threads_or_fraction_botnet) /
                        n.getScriptRam(object_script.string_script)
                    ),
              array_schedule: object_state.array_schedule,
              array_servers_used: object_state.array_servers_used,
            },
          },
          boolean_condition: (object_state) =>
            boolean_conditions_array_get_schedule_script({
              object_netscript: object_state.object_netscript,
              array_servers_used: object_state.any_output.array_servers_used,
              integer_threads: object_state.any_output.integer_threads,
              string_script: object_state.object_script.string_script,
            }),
          any_function: object_get_schedule_script_updated,
        }).any_output;
        return (
          object_schedule_script_updated.integer_threads > 0 &&
            n.print(
              `WARNING: Failed to run the remaining ${object_schedule_script_updated.integer_threads} threads of "${object_script.string_script}". Skipped.`
            ),
          {
            array_schedule: object_schedule_script_updated.array_schedule,
            array_servers_used: object_schedule_script_updated.array_servers_used,
          }
        );
      }
      return (
        n.print(
          `WARNING: Unable to find a server to run "${object_script.string_script}". Skipped.`
        ),
        object_state
      );
    },
    // Use an object as initial value for the callback function to coerce `object_state` to be an object.
    {
      array_schedule: [],
      array_servers_used: array_make_servers({
        object_netscript: n,
        array_method_get_servers: array_get_servers_useable,
        object_method_make_server: object_get_server_used
      }),
    }
  ).array_schedule;

/**
 * @description Copies (a) script(s) in the current server to a target server.
 * @param {Object} object_arguments - Contains the arguments for the procedure.
 * @param {Object} object_arguments.object_netscript - The Netscript environment.
 * @param {string|string[]} object_arguments.scripts - The script or array of scripts to copy to the target server.
 * @param {string} object_arguments.string_server_destination - The server to copy the script(s) to.
 * @returns {boolean} `true` if at least one of the scripts were copied, otherwise `false`.
 */
export const boolean_copy_script_to = ({
  object_netscript: n,
  scripts: s,
  string_server_destination: d,
}) => n.scp(s, n.getHostname(), d);

/**
 * @description Wrapper around the `exec` Netscript procedure.
 * @param {Object} object_arguments - Contains the arguments for the procedure.
 * @param {Object} object_arguments.object_netscript - The Netscript environment.
 * @param {string} object_arguments.string_script - Filename of script to execute.
 * @param {string} object_arguments.string_server - IP or hostname of the ‘target server’ on which to execute the script.
 * @param {number} [object_arguments.integer_threads] - Optional thread count for new script. Set to 1 by default. Will be rounded to nearest integer.
 * @param {any[]} [object_arguments.array_arguments] - Additional arguments to pass into the new script that is being run. Note that if any arguments are being passed into the new script, then the third argument `integer_threads` must be filled in with a value.
 * @returns {number} PID of script if it was started successfully, otherwise `0`.
 */
export const integer_exec = ({
  object_netscript: n,
  string_script: c,
  string_server: e,
  integer_threads: t = 1,
  array_arguments: a,
}) => (void 0 === a ? n.exec(c, e, t) : n.exec(c, e, t, ...a));

/**
 * @description Runs a script schedule.
 * @param {Object} object_arguments - Contains the arguments for the procedure.
 * @param {Object} object_arguments.object_netscript - The Netscript environment.
 * @param {Object[]} object_arguments.array_schedule - The script schedule containing script objects.
 * @todo Return whether or not scripts in the schedule were executed successfully? Maybe as an array (using `map`)?
 */
export const void_schedule_script_runner = ({
  object_netscript: n,
  array_schedule: s,
}) => {
  s.forEach((object_job, integer_index) => {
    boolean_copy_script_to({
      object_netscript: n,
      scripts: object_job.string_script,
      string_server_destination: object_job.string_server_used,
    }),
      integer_exec({
        object_netscript: n,
        string_script: object_job.string_script,
        string_server: object_job.string_server_used,
        integer_threads: object_job.integer_threads,
        array_arguments: object_job.array_arguments.concat(integer_index),
      });
  });
};

/**
 * @description Returns `true` if a server has enough RAM to run a script with a stated number of threads, otherwise, returns `false`.
 * @param {Object} object_arguments - Contains the arguments for the function.
 * @param {Object} object_arguments.object_netscript - The Netscript environment.
 * @param {number} object_arguments.float_server_used_ram_free - The amount of RAM free that the server has.
 * @param {number} object_arguments.integer_threads - The amount of threads of the script to run.
 * @param {number} object_arguments.string_script - The name of the script to run.
 * @returns {boolean} `true` if a server has enough RAM to run a script with a stated number of threads, otherwise, `false`.
 */
export const boolean_can_server_run_script_threads = ({
  object_netscript: n,
  float_server_used_ram_free: f,
  integer_threads: t,
  string_script: c,
}) => f >= t * n.getScriptRam(c);

/**
 * @description Returns the amount of threads of the non-operative script required to make up the RAM difference between two scripts.
 * @param {Object} object_arguments - Contains the arguments for the function.
 * @param {Object} object_arguments.object_netscript - The Netscript environment.
 * @param {string} object_arguments.string_script_first - The first script.
 * @param {string} object_arguments.string_script_second - The second script.
 * @param {string} object_arguments.string_nop - The non-operative script's name.
 * @returns {number} The amount of threads of the non-operative script required to make up the RAM difference between two scripts.
 */
export const integer_get_threads_nop = ({
  object_netscript: n,
  string_script_first: a,
  string_script_second: b,
  string_nop: _,
}) =>
  Math.ceil(
    (n.getScriptRam(a) - n.getScriptRam(b)) /
      n.getScriptRam(
        _
      )
  );
