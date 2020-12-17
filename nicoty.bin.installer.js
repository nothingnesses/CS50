/**
 * @description nicoty.bin.installer.js - 2.6 GB - Installs the scripts from the local server.
 * @license BlueOak-1.0.0
 */

const object_constants = {
  string_url: "http://127.0.0.1:8080/",
  string_prefix: "nicoty.",
  get string_prefix_url() {
    return this.string_url + this.string_prefix;
  },
  string_suffix: ".js",
  array_lib: [
    "kill",
    "no.netscript",
    "time",
    "ls",
    "servers",
    "cp",
    "root",
    "score",
    "ram.server",
    "ps",
    "ram.script",
    "mri",
    "lodash",
    "guiframework",
  ],
  array_sbin: [
    "4s.tix.api",
    "botnet",
    "grow",
    "hack",
    "hacker",
    "nop",
    "programs",
    "ram",
    "servers",
    "stock.trader",
    "tor",
    "weaken.cyclic",
    "weaken",
    "weaken.manager",
  ],
  array_bin: [
    "contracts",
    "cp",
    "hacknet",
    "installer",
    "kill",
    "lshw",
    "main",
    "rm",
    "stocks",
    "gui",
  ],
};

export const main = async (object_netscript) => {
  // const string_fetch = async ({ string_source: s, string_destination: d }) => {
  //   await fetch(s).then(async (object_response) => {
  //     await object_response
  //       .text()
  //       .then((string_text) => object_netscript.write(d, string_text, "w"));
  //   });
  //   return d;
  // };

  // const array_fetch_external = async (array_files) =>
  //   await Promise.all(
  //     array_files.map(
  //       async ({ string_source, string_destination }) =>
  //         await string_fetch({
  //           string_source: string_source,
  //           string_destination: string_destination,
  //         })
  //     )
  //   );

  const array_fetch = async ({ string_prefix: p, array_files: a }) => {
    const string_prefix_concatenated_url =
        object_constants.string_prefix_url + p,
      string_prefix_concatenated_file = object_constants.string_prefix + p;
    return await Promise.all(
      a.map(
        async (string_file) =>
          await fetch(
            string_prefix_concatenated_url +
              string_file +
              object_constants.string_suffix
          ).then(async (object_response) => {
            const string_file_name =
              string_prefix_concatenated_file +
              string_file +
              object_constants.string_suffix;
            await object_response
              .text()
              .then((string_text) =>
                object_netscript.write(string_file_name, string_text, "w")
              );
            return string_file_name;
          })
      )
    );
  };

  const string_from_array = ({ array_input: a, string_delimiter: d }) =>
    a.reduce(
      (string_accumulator, string_element, integer_index, array_input) =>
        integer_index < array_input.length
          ? string_accumulator + string_element + d
          : string_accumulator + string_element,
      ""
    );

  const void_main = async () => {
    // const array_external = [
    //   // {
    //   //   string_source:
    //   //     object_constants.string_url + "node_modules/" + "mri/lib/index.mjs",
    //   //   string_destination:
    //   //     object_constants.string_prefix +
    //   //     "lib.mri" +
    //   //     object_constants.string_suffix,
    //   // },
    //   {
    //     string_source:
    //       object_constants.string_url +
    //       "node_modules/" +
    //       "rambda/dist/rambda.esm.js",
    //     string_destination:
    //       object_constants.string_prefix +
    //       "lib.rambda" +
    //       object_constants.string_suffix,
    //   },
    // ];
    object_netscript.tprint(
      "\nInstalled:\n" +
        [
          // await array_fetch_external(array_external),
          await array_fetch({
            string_prefix: "lib.",
            array_files: object_constants.array_lib,
          }),
          await array_fetch({
            string_prefix: "sbin.",
            array_files: object_constants.array_sbin,
          }),
          await array_fetch({
            string_prefix: "bin.",
            array_files: object_constants.array_bin,
          }),
        ].reduce(
          (string_accumulator, array_current) =>
            string_accumulator +
            string_from_array({
              array_input: array_current,
              string_delimiter: "\n",
            }),
          ""
        )
    );
  };

  await void_main();
};

