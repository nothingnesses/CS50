/**
 * @description nicoty.bin.gui.js - 1.6GB - Exposes a GUI that can be used to control other scripts.
 * @license BlueOak-1.0.0
 * @todo Use `most` to implement GUI instead.
 * @todo Improve `--help` flag output and documentation.
 * @toto Probably needs to save state to localStorage when changing them.
 */

import * as object_framework from "nicoty.lib.guiframework.js";
import {
  string_sanitise,
  object_parse_arguments,
} from "nicoty.lib.no.netscript.js";

/**
 * @description Constants.
 * @readonly
 * @property {Object} object_defaults - Contains default values for script's arguments.
 * @property {boolean} object_defaults.boolean_print_help - Whether or not to display help and exit.
 * @property {Object} object_argument_names - Contains argument names.
 */
const object_constants = {
  object_defaults: {
    boolean_print_help: !1,
  },
  object_argument_names: {
    help: { short: "h", long: "help" },
  },
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
},
  object_document = parent["document"],
  object_window = parent["window"],
  integer_rows_max = object_framework.maxRows;

export const main = async (object_netscript) => {
  /**
   * @description Prints a help message to the terminal.
   */
  const void_print_help = () => {
    const object_argument_names = object_constants.object_argument_names;
    object_netscript.tprint(
      string_sanitise(`
DESCRIPTION
  Exposes a GUI that can be used to control other scripts.

USAGE
  run ${object_netscript.getScriptName()} [FLAGS ...]

FLAGS
  -${object_argument_names.help.short}, --${object_argument_names.help.long}
    Displays this message then exits.`)
    );
  };

  /**
   * @description Adds an HTML element to the GUI and returns it.
   * @param {Object} object_arguments - Contains the arguments for the function.
   * @param {string} [object_arguments.string_tag] - The HTML element tag to use.
   * @param {string} object_arguments.string_id - The element id to use.
   * @param {CSSStyleDeclaration} [object_arguments.object_style] - The CSS styles to apply.
   * @param {Object} [object_arguments.object_gui] - The GUI object.
   * @param {Object} object_arguments.string_text - Text to add to the element.
   * @param {function} object_arguments.void_on_mouse_over - The function to use during mouse over events.
   * @param {function} object_arguments.void_on_mouse_out - The function to use during mouse out events.
   * @param {function} [object_arguments.void_on_click] - The function to use during on-click events.
   * @returns {Object} The new element.
   */
  const object_get_element_new = ({
    string_tag: e = "div",
    string_id: i,
    object_style: s = object_framework.optionsStyle,
    object_gui: g = object_framework.gui,
    string_text: t,
    void_on_mouse_over: y,
    void_on_mouse_out: n,
    void_on_click: c,
  }) => {
    const object_element = object_document.createElement(e);
    object_element.setAttribute("id", i);
    object_element.appendChild(object_document.createTextNode(t));
    for (const string_property in s) {
      if (s.hasOwnProperty(string_property)) {
        object_element.style[string_property] = s[string_property];
      }
    }
    if (y !== undefined) {
      object_element.onmouseover = y;
    }
    if (n !== undefined) {
      object_element.onmouseout = n;
    }
    if (c !== undefined) {
      object_element.onclick = c;
    }
    g.appendChild(object_element);
    return object_element;
  };

  /**
   * @description Returns to the previous menu.
   * @param {Object} object_arguments - Contains the arguments for the function.
   * @param {MouseEvent} object_arguments.object_mouse_event - The mouse event passed from the calling function.
   * @param {Number} [object_arguments.integer_rows_max_old] - The maximum number of rows of the previous menu.
   * @param {function} [object_arguments.void_menu_previous] - The function used to generate the previous menu.
   */
  const void_menu_back = ({
    object_mouse_event: e,
    integer_rows_max_old: m = integer_rows_max,
    void_menu_previous: p = void_menu_main,
  }) => {
    const string_text = e.target.textContent;
    object_framework.clearMenu();
    object_framework.appendElement(
      object_framework.gui.id,
      object_get_element_new({
        string_id: "extraGUIcontainer2",
        object_style: object_framework.mergeStyles(
          object_framework.optionsStyle,
          { backgroundColor: "#777" }
        ),
        string_text: string_text,
        void_on_mouse_over: (object_mouse_event) =>
          (object_mouse_event.target.style.backgroundColor = "#999"),
        void_on_mouse_out: (object_mouse_event) =>
          (object_mouse_event.target.style.backgroundColor = "#777"),
        void_on_click: () => {
          object_framework.clearMenu();
          if (m !== undefined) {
            object_framework.SetMaxRows(m);
          }
          p();
        },
      })
    );
  };

  const object_get_button_toggle = ({
    string_id: i,
    boolean_condition: b,
    void_function: _,
    string_text_true: t,
    string_text_false: f,
    string_colour_inactive_out: a = "#555",
    string_colour_inactive_over: c = "#777",
    string_colour_active_out: d = "#777",
    string_colour_active_over: e = "#999",
  }) =>
    object_get_element_new({
      string_id: i,
      string_text: b()
        ? t
        : f,
      void_on_click: (object_mouse_event) => {
        if (b()) {
          _(false);
          object_mouse_event.target.style.backgroundColor = c;
          object_mouse_event.target.textContent = f;
        } else {
          _(true);
          object_mouse_event.target.style.backgroundColor = e;
          object_mouse_event.target.textContent = t;
        }
      },
      void_on_mouse_over: (object_mouse_event) => {
        if (b()) {
          object_mouse_event.target.style.backgroundColor = e;
        } else {
          object_mouse_event.target.style.backgroundColor = c;
        }
      },
      void_on_mouse_out: (object_mouse_event) => {
        if (b()) {
          object_mouse_event.target.style.backgroundColor = d;
        } else {
          object_mouse_event.target.style.backgroundColor = a;
        }
      },
    });

  /**
   * @description Generates the hacking menu.
   * @param {Object} object_arguments - Contains the arguments for the function.
   * @param {MouseEvent} object_arguments.object_mouse_event - The mouse event passed from the calling function.
   * @param {function} [object_arguments.void_menu_previous] - The function used to generate the previous menu.
   */
  const void_menu_hacker = ({
    object_mouse_event: e,
    void_menu_previous: p = void_menu_main,
  }) => {
    const integer_rows_max = object_framework.maxRows;
    void_menu_back({
      object_mouse_event: e,
      integer_rows_max_old: integer_rows_max,
      void_menu_previous: p,
    });
    object_framework.verifyHeight();
  };

  /**
   * @description Generates the stocks menu.
   * @param {Object} object_arguments - Contains the arguments for the function.
   * @param {MouseEvent} object_arguments.object_mouse_event - The mouse event passed from the calling function.
   * @param {function} [object_arguments.void_menu_previous] - The function used to generate the previous menu.
   */
  const void_menu_stocks = ({
    object_mouse_event: e,
    void_menu_previous: p,
  }) => {
    const integer_rows_max = object_framework.maxRows;
    void_menu_back({
      object_mouse_event: e,
      integer_rows_max_old: integer_rows_max,
      void_menu_previous: p,
    });
    object_get_button_toggle({
      string_id: "trade",
      boolean_condition: () => object_document.nicoty_stocks_boolean_trade,
      void_function: (boolean_condition) => {
        object_document.nicoty_stocks_boolean_trade = boolean_condition;
      },
      string_text_true: "Trading",
      string_text_false: "Not Trading",
    });
    object_get_button_toggle({
      string_id: "sell_profitable",
      boolean_condition: () => object_document.nicoty_stocks_boolean_sell_profitable,
      void_function: (boolean_condition) => {
        object_document.nicoty_stocks_boolean_sell_profitable = boolean_condition;
      },
      string_text_true: "Selling When Profitable",
      string_text_false: "Not Selling When Profitable",
    });
    object_get_button_toggle({
      string_id: "sell_profitable",
      boolean_condition: () => object_document.nicoty_stocks_boolean_sell_asap,
      void_function: (boolean_condition) => {
        object_document.nicoty_stocks_boolean_sell_asap = boolean_condition;
      },
      string_text_true: "Selling ASAP",
      string_text_false: "Not Selling ASAP",
    });
    object_framework.verifyHeight();
  };

  /**
   * @description Generates the main menu.
   */
  const void_menu_main = () => {
    object_get_element_new({
      string_id: "hacker",
      string_text: "Hacker",
      void_on_mouse_over: (object_mouse_event) =>
        (object_mouse_event.target.style.backgroundColor = "#777"),
      void_on_mouse_out: (object_mouse_event) =>
        (object_mouse_event.target.style.backgroundColor = "#555"),
      void_on_click: (object_mouse_event) =>
        void_menu_hacker({
          object_mouse_event: object_mouse_event,
          void_menu_previous: void_menu_main,
        }),
    });
    object_get_element_new({
      string_id: "stocks",
      string_text: "Stocks",
      void_on_mouse_over: (object_mouse_event) =>
        (object_mouse_event.target.style.backgroundColor = "#777"),
      void_on_mouse_out: (object_mouse_event) =>
        (object_mouse_event.target.style.backgroundColor = "#555"),
      void_on_click: (object_mouse_event) =>
        void_menu_stocks({
          object_mouse_event: object_mouse_event,
          void_menu_previous: void_menu_main,
        }),
    });
    object_framework.verifyHeight();
  };

  const void_main = async () => {
    // variables
    const object_defaults = object_constants.object_defaults,
      object_argument_names = object_constants.object_argument_names;
      let boolean_print_help = object_defaults.boolean_print_help;

      // Parse arguments
      const object_arguments = object_parse_arguments({
        array_arguments: object_netscript.args,
      });
      for (const string_argument in object_arguments)
        if (object_arguments.hasOwnProperty(string_argument)) {
          const argument_value = object_arguments[string_argument];
          switch (string_argument) {
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

    // Main
    if (boolean_print_help) return void_print_help();
    object_framework.initialize(
      object_netscript,
      object_document,
      object_window
    );
    object_framework.setPos(0, 0);
    void_menu_main();
    for (;;) {
      await object_netscript.sleep(9e9);
    }
  };

  await void_main();
};
