/**
 * Prioritise lower "volatility" stocks as they have the greatest potential to keep increasing or keep decreasing in price for longer periods of time. In this case "volatility" is the amount of times peaks and troughs in price changes happen divided by amount of ticks - need to confirm if amount of flip flopping really is predicatable and constant though, or if it changes randomly.
 *
 * Assumptions: Using a constant SMA of growth works (for all stocks). Maybe should use volatility dependent smoothing instead though?
 *
 * Process for long (just inverse things for short):
 *
 * filter:
 * * remove stocks with sma5 growth (i.e., price change (curr tick price minus prev tick price) divided by price from previous tick) less than sma10 of growth (i.e., will buy only if sma5 of growth is greater than sma10 of growth as this indicates an upwards momentum) and
 * * stock with sma5 growth <= 0 (i.e., will only buy if stock is actually increasing in price and not just decreasing in price slower than it was before). we are using growth or price change rather than just price as the former also indicates direction in addition to magnitude rather than just magnitude which is the case for the latter.
 *
 * then sort by decreasing (biggest first) sma5 of growth * curr price * buyable shares
 *
 * buy if:
 * * (commission * 2) / (total price of buyable shares + (2 * commission)) < some fraction (default 1 = pays off 100% after one growth tick. if 0.5 = pays off after 2, etc.) of sma5 growth as this would indicate that growth is sufficient to break even from commission, and
 * * (highest price - curr price) * buyable shares > 2 * commission as we are assuming that highest price might actually be the cap, so we need to ensure that even if it's reached, we can still break even. can also filter to remove stocks using all these criteria in filter stage.
 *
 * sell if momentum reversed (i.e., sma5 growth is less than sma10, sma5 is negative) and we'd make a profit if we sell.
 *
 * @description nicoty.bin.stock.trader.js - 22.2GB - Trades stocks.
 * @license BlueOak-1.0.0
 * @todo Loading data should be done by start up script. Saving should be done by this (during updates), and the user interface.
 * @todo When loading state from local storage, rebuild the arrays of stocks invested in by iterating through the stocks object instead of deserialising from local storage. This will be a once every start up event, so shouldn't be too inefficient, and will also prevent having to save the array to the local storage for every transaction.
 * @todo Sell profitable currently only sells when forecast becomes bad. It should sell when there's profit to be made regardless of that.
 * @todo Remove unecessary cloning.
 * @todo Sell stocks to buy a better ones (when, how much better? by which metric?).
 * @todo Should we have a feature that allows orders to be placed manually? If so, use a global array to put tasks in, then process the array at the start of the loop until it's empty, and make an interface that can be used to manually buy and sell stocks if the user wishes. This is so that we can track and recalculate average price of owned shares (otherwise, if player transacts using game's interface, we can't track it without unless we use getStockPosition). Also, probably need to put order info in each stock object. Probably need a mapping of stock symbol to stock array's index for efficient lookup.
 * @todo Use absolute CMA of price growth when filtering stocks, instead of SMA? Maybe even use actual volatility if available (this will incur extra RAM though)?
 * @todo If using SMA, determine if number of ticks used in SMA should be greater if volatility is higher. i.e., use Kaufman's Adaptive Moving Average?
 */

import { object_get_updated, any_while } from "nicoty.lib.no.netscript.js";

/**
 * @description A stock object.
 * @typedef {Object} Stock
 * @property {string} string_symbol - The stock's symbol.
 * @property {number} integer_shares_long - The number owned shares of this stock in the long position.
 * @property {number} integer_shares_short - The number owned shares of this stock in the short position.
 * @property {number} float_average_cash_spent_per_share_long - The average cash spent per share owned in the long position.
 * @property {number} float_average_cash_spent_per_share_short - The average cash spent per share owned in the short position.
 * @property {number} float_price_average_biggest - The biggest observed average price of this stock.
 * @property {number[]} array_prices_average - An array of this stock's recent average prices.
 */

/**
 * @description A stocks object.
 * @typedef {Object.<string, Stock>} Stocks
 */

/**
 * @description A stock market object.
 * @typedef {Object} StockMarket
 * @property {Stocks} object_stocks - A stocks object.
 * @property {string[]} array_stocks_invested_long - Contains symbols of stocks in which shares in the long position are owned.
 * @property {string[]} array_stocks_invested_short - Contains symbols of stocks in which shares in the short position are owned.
 * @property {number} float_cash_invested - The amount of cash currently invested in the market.
 */

/**
 * @description Constants.
 * @readonly
 * @property {number} float_commission - The cost of a transaction.
 * @property {number} float_period_update_stock - The delay between each market update in milliseconds. @see {@link msPerStockUpdate in src/StockMartket/StockMarket.tsx}
 * @property {Object} object_document - Shortcut to `Document`.
 * @property {Object} object_storage - Shortcut to the local storage.
 * @property {string} string_server_home - The name of the player's home server.
 * @property {string} string_prefix - Prefix used for local storage keys to namespace them.
 * @property {string} string_prefix_stock - Prefix used for local storage keys of stock objects.
 * @property {string} string_property_cash_invested - The local storage key used for the cash invested value.
 * @property {string} string_property_investment_capital - The local storage key used for the investment capital value.
 * @property {string} string_property_prices_average_length - The local storage key used for the average price length value.
 * @property {string} string_property_trade - The local storage key used for the trade boolean value.
 * @property {string} string_property_liquidate_profitable - The local storage key used for the liquidate when profitable boolean value.
 * @property {string} string_property_liquidate_asap - The local storage key used for the liquidate as soon as possible boolean value.
 */
const object_constants = {
  float_commission: 100e3,
  get float_commission_double() {
    return this.float_commission * 2;
  },
  float_period_update_stock: 6e3,
  object_document: parent["document"],
  object_storage: parent["window"].localStorage,
  string_server_home: "home",
  string_prefix: "nicoty_stocks_",
  get string_prefix_stock() {
    return this.string_prefix + "object_stock_";
  },
  get string_property_cash_invested() {
    return this.string_prefix + "float_cash_invested";
  },
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
   * @description Returns a new stock object.
   * @param {Object} object_arguments - Contains the arguments for the function.
   * @param {string} object_arguments.string_symbol - The stock's symbol.
   * @param {number} object_arguments.integer_shares_long - The number owned shares of this stock in the long position.
   * @param {number} object_arguments.integer_shares_short - The number owned shares of this stock in the short position.
   * @param {number} object_arguments.float_average_cash_spent_per_share_long - The average cash spent per share owned in the long position.
   * @param {number} object_arguments.float_average_cash_spent_per_share_short - The average cash spent per share owned in the short position.
   * @param {number} object_arguments.float_price_average_biggest - The biggest observed average price of this stock.
   * @param {number[]} object_arguments.array_prices_average - An array of this stock's recent average prices.
   * @returns {Stock} Stock object.
   */
  const object_get_stock = ({
    string_symbol,
    integer_shares_long,
    integer_shares_short,
    float_average_cash_spent_per_share_long,
    float_average_cash_spent_per_share_short,
    float_price_average_biggest,
    array_prices_average,
  }) => ({
    string_symbol: string_symbol,
    integer_shares_long: integer_shares_long,
    integer_shares_short: integer_shares_short,
    float_average_cash_spent_per_share_long: float_average_cash_spent_per_share_long,
    float_average_cash_spent_per_share_short: float_average_cash_spent_per_share_short,
    float_price_average_biggest: float_price_average_biggest,
    array_prices_average: array_prices_average,
  });

  /**
   * @description Returns the number of shares of this stock in existence.
   * @param {string} string_symbol - The stock's symbol.
   * @returns {number} The number of shares of this stock in existence.
   */
  const integer_shares_max = (string_symbol) =>
    object_netscript.getStockMaxShares(string_symbol);

  /**
   * @description Returns this stock's current ask price.
   * @param {string} string_symbol - The stock's symbol.
   * @returns {number} This stock's current ask price.
   */
  const float_get_price_ask = (string_symbol) =>
    object_netscript.getStockAskPrice(string_symbol);

  /**
   * @description Returns this stock's current bid price.
   * @param {string} string_symbol - The stock's symbol.
   * @returns {number} This stock's current bid price.
   */
  const float_get_price_bid = (string_symbol) =>
    object_netscript.getStockBidPrice(string_symbol);

  /**
   * @description Returns this stock's current average price.
   * @param {string} string_symbol - The stock's symbol.
   * @returns {number} This stock's current average price.
   */
  const float_get_price_average = (string_symbol) =>
    (float_get_price_ask(string_symbol) + float_get_price_bid(string_symbol)) /
    2;

  /**
   * @description Returns the current forecast for this stock.
   * @param {string} string_symbol - The stock's symbol.
   * @returns {number} This stock's forecast.
   */
  const float_get_forecast = (string_symbol) =>
    object_netscript.getStockForecast(string_symbol);

  /**
   * @description Buys shares in the long position and returns the amount bought if the transaction was sucessful, otherwise returns `0`.
   * @param {Object} object_arguments - Contains the arguments for the function.
   * @param {string} object_arguments.string_symbol - The stock's symbol.
   * @param {number} object_arguments.integer_shares - The amount of shares to buy.
   * @returns {number} The amount of shares bought if transaction was successful, otherwise `0`.
   */
  const integer_buy_long = ({ string_symbol, integer_shares }) =>
    object_netscript.buyStock(string_symbol, integer_shares);

  /**
   * @description Buys shares in the short position and returns the amount bought if the transaction was sucessful, otherwise returns `0`.
   * @param {Object} object_arguments - Contains the arguments for the function.
   * @param {string} object_arguments.string_symbol - The stock's symbol.
   * @param {number} object_arguments.integer_shares - The amount of shares to buy.
   * @returns {number} The amount of shares bought if transaction was successful, otherwise `0`.
   */
  const integer_buy_short = ({ string_symbol, integer_shares }) =>
    object_netscript.shortStock(string_symbol, integer_shares);

  /**
   * @description Sells shares in the long position and returns the amount sold if the transaction was sucessful, otherwise returns `0`.
   * @param {Object} object_arguments - Contains the arguments for the function.
   * @param {string} object_arguments.string_symbol - The stock's symbol.
   * @param {number} object_arguments.integer_shares - The amount of shares to sell.
   * @returns {number} The amount of shares sold if transaction was successful, otherwise `0`.
   */
  const integer_sell_long = ({ string_symbol, integer_shares }) =>
    object_netscript.sellStock(string_symbol, integer_shares);

  /**
   * @description Sells shares in the short position and returns the amount sold if the transaction was sucessful, otherwise returns `0`.
   * @param {Object} object_arguments - Contains the arguments for the function.
   * @param {string} object_arguments.string_symbol - The stock's symbol.
   * @param {number} object_arguments.integer_shares - The amount of shares to sell.
   * @returns {number} The amount of shares sold if transaction was successful, otherwise `0`.
   */
  const integer_sell_short = ({ string_symbol, integer_shares }) =>
    object_netscript.sellShort(string_symbol, integer_shares);

  /**
   * @description Returns the server's current cash.
   * @param {string} string_server - The server to get the cash of.
   * @returns {number} The server's current cash.
   */
  const float_get_cash_server = (string_server) =>
    object_netscript.getServerMoneyAvailable(string_server);

  /**
   * @description Returns the player's current cash.
   * @returns {number} The player's current cash.
   */
  const float_get_cash_player = () =>
    float_get_cash_server(object_constants.string_server_home);

  /**
   * @description Buys shares and returns the amount bought if the transaction was sucessful, otherwise returns `0`.
   * @param {Object} object_arguments - Contains the arguments for the function.
   * @param {string} object_arguments.string_symbol - The stock's symbol.
   * @param {number} object_arguments.integer_shares - The amount of shares to buy.
   * @param {boolean} object_arguments.boolean_long - Whether the shares transacted are in the long or short position. `true` = long, `false` = short.
   * @returns {number} The amount of shares bought if transaction was successful, otherwise `0`.
   */
  const integer_buy = ({ string_symbol, integer_shares, boolean_long }) =>
    boolean_long
      ? integer_buy_long({ string_symbol, integer_shares })
      : integer_buy_short({ string_symbol, integer_shares });

  /**
   * @description Sells shares and returns the amount sold if the transaction was sucessful, otherwise returns `0`.
   * @param {Object} object_arguments - Contains the arguments for the function.
   * @param {string} object_arguments.string_symbol - The stock's symbol.
   * @param {number} object_arguments.integer_shares - The amount of shares to sell.
   * @param {boolean} object_arguments.boolean_long - Whether the shares transacted are in the long or short position. `true` = long, `false` = short.
   * @returns {number} The amount of shares sold if transaction was successful, otherwise `0`.
   */
  const integer_sell = ({ string_symbol, integer_shares, boolean_long }) =>
    boolean_long
      ? integer_sell_long({ string_symbol, integer_shares })
      : integer_sell_short({ string_symbol, integer_shares });

  /**
   * @description Sells shares and returns the amount sold if the transaction was sucessful, otherwise returns `0`.
   * @param {Object} object_arguments - Contains the arguments for the function.
   * @param {Stock} object_arguments.object_stock - The stock object.
   * @param {boolean} object_arguments.boolean_long - Whether the shares transacted are in the long or short position. `true` = long, `false` = short.
   * @returns {number} The amount of shares sold if transaction was successful, otherwise `0`.
   */
  const integer_get_shares_owned = ({ object_stock, boolean_long }) =>
    boolean_long
      ? object_stock.integer_shares_long
      : object_stock.integer_shares_short;

  /**
   * @description Returns an array of symbols of stocks in the game.
   * @returns {string[]} Contains the stocks' symbols.
   */
  const array_get_stocks_symbols = () => object_netscript.getStockSymbols();

  /**
   * @description Returns an updated array of a stock's recent average prices.
   * @param {Object} object_arguments - Contains the arguments for the function.
   * @param {Stock} object_arguments.object_stock - The stock object.
   * @param {number} object_arguments.integer_prices_average_length - The maximum length of the stock's average price array.
   * @returns {number[]} Updated array of a stock's recent average prices.
   */
  const array_get_prices_average_updated = ({
    object_stock,
    integer_prices_average_length,
  }) => {
    const array_prices_average = object_stock.array_prices_average.concat(
        float_get_price_average(object_stock.string_symbol)
      ),
      integer_prices_average_length_current = array_prices_average.length;
    return integer_prices_average_length_current > integer_prices_average_length
      ? array_prices_average.slice(
          integer_prices_average_length_current - integer_prices_average_length
        )
      : array_prices_average;
  };

  /**
   * @description Takes a stock object and returns a new one based on the original, but with an updated average price array and biggest average price value. This is ran after a stock market tick.
   * @param {Object} object_arguments - Contains the arguments for the function.
   * @param {Stock} object_arguments.object_stock - The original stock object.
   * @param {number} object_arguments.integer_prices_average_length - The maximum length of the stock's average price array.
   * @returns {Stock} The new stock object with an updated average price array and biggest average price value.
   */
  const object_get_stock_tick_updated = ({
    object_stock,
    integer_prices_average_length,
  }) => {
    const float_price_average = float_get_price_average(
      object_stock.string_symbol
    );
    return object_get_updated({
      object_original: object_stock,
      object_properties_new:
        float_price_average > object_stock.float_price_average_biggest
          ? {
              array_prices_average: array_get_prices_average_updated({
                object_stock: object_stock,
                integer_prices_average_length: integer_prices_average_length,
              }),
              float_price_average_biggest: float_price_average,
            }
          : {
              array_prices_average: array_get_prices_average_updated({
                object_stock: object_stock,
                integer_prices_average_length: integer_prices_average_length,
              }),
            },
    });
  };

  /**
   * @description Returns `true` if the 4S Market Data API is accessible, otherwise returns `false`.
   * @param {string} [string_symbol] - A valid stock symbol.
   * @returns {boolean} `true` if the 4S Market Data API is accessible, otherwise `false`.
   */
  const boolean_have_4S = (string_symbol = array_get_stocks_symbols()[0]) => {
    try {
      float_get_forecast(string_symbol);
      return true;
    } catch (object_exception) {
      return false;
    }
  };

  /**
   * @description Returns `true` if shorting stocks is possible, otherwise returns `false`.
   * @param {string} [string_symbol] - A valid stock symbol.
   * @returns {boolean} `true` if shorting stocks is possible, otherwise `false`.
   */
  const boolean_can_short = (string_symbol = array_get_stocks_symbols()[0]) => {
    try {
      integer_sell_short(string_symbol, 0);
      return true;
    } catch (object_exception) {
      return false;
    }
  };

  /**
   * @description Returns the profit to be made if shares are sold.
   * @param {Object} object_arguments - Contains the arguments for the function.
   * @param {Stock} object_arguments.object_stock - The stock object.
   * @param {number} object_arguments.integer_shares - The amount of shares to sell.
   * @param {boolean} object_arguments.boolean_long - Whether the value is being calculated for shares in the long or short position. `true` = long, `false` = short.
   * @returns {number} The profit to be made if shares are sold.
   */
  const float_get_profit = ({ object_stock, integer_shares, boolean_long }) =>
    integer_shares *
      (boolean_long
        ? float_get_price_bid(object_stock.string_symbol) -
          object_stock.float_average_cash_spent_per_share_long
        : float_get_price_ask(object_stock.string_symbol) -
          object_stock.float_average_cash_spent_per_share_short) -
    object_constants.float_commission;

  /**
   * @description Returns the current number of available shares of this stock.
   * @param {Stock} object_stock - The stock object.
   * @returns {number} The current number of available shares of this stock.
   */
  const integer_get_shares_available = ({
    string_symbol,
    integer_shares_long,
    integer_shares_short,
  }) =>
    integer_shares_max(string_symbol) -
    (integer_shares_long + integer_shares_short);

  /**
   * @description Returns the current number of affordable shares of this stock in either the long or short position.
   * @param {Object} object_arguments - Contains the arguments for the function.
   * @param {Stock} object_arguments.object_stock - The stock object.
   * @param {number} object_arguments.float_cash - The amount of cash that can be spent.
   * @param {boolean} object_arguments.boolean_long - Whether the value is being calculated for shares in the long or short position. `true` = long, `false` = short.
   * @returns {number} The number of affordable shares of this stock in either the long or short position.
   */
  const integer_get_shares_buyable = ({
    object_stock,
    float_cash,
    boolean_long,
  }) => {
    const integer_can_buy = Math.floor(
        (float_cash - object_constants.float_commission_double) /
          (boolean_long
            ? float_get_price_ask(object_stock.string_symbol)
            : float_get_price_bid(object_stock.string_symbol))
      ),
      integer_available_shares = integer_get_shares_available(object_stock);
    return integer_can_buy > integer_available_shares
      ? integer_available_shares
      : integer_can_buy;
  };

  /**
   * @description Takes a stock object and returns a new one based on the original, but with an updated average cash per share value. This is ran after buying shares.
   * @param {Object} object_arguments - Contains the arguments for the function.
   * @param {Stock} object_arguments.object_stock The original stock object.
   * @param {boolean} object_arguments.boolean_long - Whether the value is being calculated for shares in the long or short position. `true` = long, `false` = short.
   * @param {number} object_arguments.integer_shares - The amount of shares to add.
   * @returns {Stock} The new stock object with an updated average cash per share value.
   */
  const object_get_stock_updated_average_cash_spent_per_share = ({
    object_stock,
    boolean_long,
    integer_shares,
  }) => {
    const integer_shares_current = boolean_long
        ? object_stock.integer_shares_long
        : object_stock.integer_shares_short,
      integer_shares_total = integer_shares_current + integer_shares;
    return object_get_updated({
      object_original: object_stock,
      object_properties_new: boolean_long
        ? {
            float_average_cash_spent_per_share_long:
              (integer_shares_current *
                object_stock.float_average_cash_spent_per_share_long) /
                integer_shares_total +
              (integer_shares *
                (float_get_price_ask(object_stock.string_symbol) +
                  object_constants.float_commission / integer_shares)) /
                integer_shares_total,
          }
        : {
            float_average_cash_spent_per_share_short:
              (integer_shares_current *
                object_stock.float_average_cash_spent_per_share_short) /
                integer_shares_total +
              (integer_shares *
                (float_get_price_bid(object_stock.string_symbol) +
                  object_constants.float_commission / integer_shares)) /
                integer_shares_total,
          },
    });
  };

  /**
   * @description Takes a stock object and returns a new one based on the original, but with values updated after buying some shares.
   * @param {Object} object_arguments - Contains the arguments for the function.
   * @param {Stock} object_arguments.object_stock The original stock object.
   * @param {boolean} object_arguments.boolean_long - Whether the value is being calculated for shares in the long or short position. `true` = long, `false` = short.
   * @param {number} object_arguments.integer_shares - The amount of shares to add.
   * @returns {Stock} The new stock object with values updated after buying some shares.
   */
  const object_get_stock_updated_after_buying = ({
    object_stock,
    boolean_long,
    integer_shares,
  }) => {
    const integer_shares_owned = boolean_long
        ? object_stock.integer_shares_long
        : object_stock.integer_shares_short,
      integer_shares_available = integer_get_shares_available(object_stock),
      integer_shares_total = integer_shares_owned + integer_shares;
    return object_get_updated({
      object_original: object_get_stock_updated_average_cash_spent_per_share({
        object_stock: object_stock,
        boolean_long: boolean_long,
        integer_shares:
          integer_shares_total > integer_shares_available
            ? integer_shares_available
            : integer_shares,
      }),
      object_properties_new: boolean_long
        ? {
            integer_shares_long:
              integer_shares_total > integer_shares_available
                ? integer_shares_owned + integer_shares_available
                : integer_shares_owned + integer_shares,
          }
        : {
            integer_shares_short:
              integer_shares_total > integer_shares_available
                ? integer_shares_owned + integer_shares_available
                : integer_shares_owned + integer_shares,
          },
    });
  };

  /**
   * @description Takes a stock object and returns a new one based on the original, but with values updated after selling some shares.
   * @param {Object} object_arguments - Contains the arguments for the function.
   * @param {Stock} object_arguments.object_stock The original stock object.
   * @param {boolean} object_arguments.boolean_long - Whether the value is being calculated for shares in the long or short position. `true` = long, `false` = short.
   * @param {number} object_arguments.integer_shares - The amount of shares to sell.
   * @returns {Stock} The new stock object with values updated after selling some shares.
   */
  const object_get_stock_updated_after_selling = ({
    object_stock,
    boolean_long,
    integer_shares,
  }) => {
    const integer_shares_total =
      (boolean_long
        ? object_stock.integer_shares_long
        : object_stock.integer_shares_short) - integer_shares;
    return object_get_updated({
      object_original: object_stock,
      object_properties_new: boolean_long
        ? {
            integer_shares_long: Math.max(0, integer_shares_total),
            float_average_cash_spent_per_share_long:
              integer_shares_total <= 0
                ? 0
                : object_stock.float_average_cash_spent_per_share_long,
          }
        : {
            integer_shares_short: Math.max(0, integer_shares_total),
            float_average_cash_spent_per_share_short:
              integer_shares_total <= 0
                ? 0
                : object_stock.float_average_cash_spent_per_share_short,
          },
    });
  };

  /**
   * @description Returns an object containing stock objects for all existing stock symbols.
   * @returns {Stocks} Contains stock objects for all existing stock symbols.
   */
  const object_get_stocks = () =>
    Object.fromEntries(
      array_get_stocks_symbols().map((string_symbol) => {
        const float_price_average = float_get_price_average(string_symbol);
        return [
          string_symbol,
          object_get_stock({
            string_symbol: string_symbol,
            integer_shares_long: 0,
            integer_shares_short: 0,
            float_average_cash_spent_per_share_long: 0,
            float_average_cash_spent_per_share_short: 0,
            float_price_average_biggest: float_price_average,
            array_prices_average: [float_price_average],
          }),
        ];
      })
    );

  /**
   * @description Takes a stocks object and returns a new one based on the original, but updated after selling shares in a stock.
   * @param {Object} object_arguments - Contains the arguments for the function.
   * @param {Stocks} object_arguments.object_stocks The original stocks object.
   * @param {string} object_arguments.string_symbol - The stock's symbol.
   * @param {boolean} object_arguments.boolean_long - Whether the shares transacted were in the long or short position. `true` = long, `false` = short.
   * @param {number} object_arguments.integer_shares - The amount of shares removed.
   * @returns {Stocks} The new array of stock objects with the updated stock object.
   */
  const object_get_stocks_updated_after_selling = ({
    object_stocks,
    string_symbol,
    boolean_long,
    integer_shares,
  }) =>
    object_get_updated({
      object_original: object_stocks,
      object_properties_new: {
        [string_symbol]: object_get_stock_updated_after_selling({
          object_stock: object_stocks[string_symbol],
          boolean_long: boolean_long,
          integer_shares: integer_shares,
        }),
      },
    });

  /**
   * @description Takes a stocks object and returns a new one based on the original, but with values updated after one market tick.
   * @param {Object} object_arguments - Contains the arguments for the function.
   * @param {Stocks} object_arguments.object_stocks The original stocks objects.
   * @param {number} object_arguments.integer_prices_average_length - The maximum length of the stock objects' average price arrays.
   * @returns {Stocks} The new stocks object with values updated after one market tick.
   */
  const object_get_stocks_updated_after_tick = ({
    object_stocks,
    integer_prices_average_length,
  }) =>
    Object.fromEntries(
      Object.entries(object_stocks).map(([string_symbol, object_stock]) => [
        string_symbol,
        object_get_stock_tick_updated({
          object_stock: object_stock,
          integer_prices_average_length: integer_prices_average_length,
        }),
      ])
    );

  /**
   * @description Returns the remaining amount of cash that can be used for investment.
   * @param {Object} object_arguments - Contains the arguments for the function.
   * @param {number} object_arguments.float_cash_invested - The amount of cash currently invested in the market.
   * @param {number} object_arguments.float_investment_capital - The fraction of cash that can be used for investment.
   * @returns {number} The remaining amount of cash that can be used for investment.
   */
  const float_get_capital_left = ({
    float_cash_invested,
    float_investment_capital,
  }) => {
    return (
      (float_get_cash_player() + float_cash_invested) *
        float_investment_capital -
      float_cash_invested
    );
  };

  /**
   * @description Returns the growth rate between two numbers.
   * @param {Object} object_numbers - The array of numbers to calculate growth rate of.
   * @param {number} object_numbers.float_old - The old number.
   * @param {number} object_numbers.float_new - The new number.
   * @returns {number} The growth rate.
   */
  const float_get_growth = ({ float_old, float_new }) =>
    float_old < Number.MIN_VALUE
      ? (float_new - Number.MIN_VALUE) / Number.MIN_VALUE
      : (float_new - float_old) / float_old;

  /**
   * @description Returns the average growth rate of an array of numbers.
   * @param {number[]} array_numbers - The array of numbers to calculate the average growth rate of.
   * @returns {number} The average growth rate.
   */
  const float_get_growth_average = (array_numbers) =>
    array_numbers.length > 1
      ? array_numbers.reduce(
          (float_accumulator, float_current, integer_index) =>
            integer_index > 0
              ? float_get_growth({
                  float_old: array_numbers[integer_index - 1],
                  float_new: float_current,
                }) + float_accumulator
              : 0,
          0
        ) /
        (array_numbers.length - 1)
      : 0;

  /**
   * @description Returns the absolute average growth rate of an array of numbers.
   * @param {number[]} array_numbers - The array of numbers to calculate the absolute average growth rate of.
   * @returns {number} The absolute average growth rate.
   */
  const float_get_growth_average_absolute = (array_numbers) =>
    array_numbers.length > 1
      ? array_numbers.reduce(
          (float_accumulator, float_current, integer_index) =>
            integer_index > 0
              ? Math.abs(
                  float_get_growth({
                    float_old: array_numbers[integer_index - 1],
                    float_new: float_current,
                  })
                ) + float_accumulator
              : 0,
          0
        ) /
        (array_numbers.length - 1)
      : 0;

  /**
   * @description Returns the average of the latest growth rates of an array of numbers.
   * @param {Object} object_arguments - Contains the arguments for the function.
   * @param {number[]} object_arguments.array_numbers - Array of numbers to average the growth rates of.
   * @param {number} object_arguments.integer_latest_length - Number of last growth rates to average.
   * @returns Average growth rate.
   */
  const float_get_growth_average_range_latest = ({
    array_numbers,
    integer_latest_length,
  }) => {
    const integer_numbers_length = array_numbers.length;
    return integer_numbers_length > integer_latest_length
      ? float_get_growth_average(
          array_numbers.slice(integer_numbers_length - integer_latest_length)
        )
      : float_get_growth_average(array_numbers);
  };

  /**
   * @description Returns the average of the lagging growth rates of an array of numbers.
   * @param {Object} object_arguments - Contains the arguments for the function.
   * @param {number[]} object_arguments.array_numbers - Array of numbers to average the growth rates of.
   * @param {number} object_arguments.integer_lagging_length - Number of last growth rates to average.
   * @returns Average growth rate.
   */
  const float_get_growth_average_range_lagging = ({
    array_numbers,
    integer_lagging_length,
  }) => {
    const integer_numbers_length = array_numbers.length,
      integer_difference = integer_numbers_length - integer_lagging_length;
    return integer_numbers_length > integer_lagging_length
      ? float_get_growth_average(
          array_numbers.slice(
            integer_difference - integer_lagging_length,
            integer_difference
          )
        )
      : float_get_growth_average(array_numbers);
  };

  /**
   * @description Returns true if shares of a stock should be bought, otherwise false.
   * @param {Object} object_arguments - Contains the arguments for the function.
   * @param {Stock} object_arguments.object_stock - The stock object.
   * @param {number} object_arguments.integer_shares - The amount of shares to buy.
   * @param {boolean} object_arguments.boolean_long - Whether the value is being calculated for shares in the long or short position. True = long, false = short.
   * @param {number} object_arguments.integer_smoothing - The amount of values to average for the shorter ranger average growth rate, which is compared with the longer range average growth rate when 4S Market Data API is inaccessible.
   * @returns {boolean} True if shares should be bought, otherwise false.
   */
  const boolean_should_buy = ({
    object_stock,
    integer_shares,
    boolean_long,
    integer_smoothing,
  }) => {
    if (boolean_have_4S(object_stock.string_symbol)) {
      return boolean_long
        ? float_get_forecast(object_stock.string_symbol) > 0.5 &&
            // Ensure that growth is sufficient to break even from commissions.
            object_constants.float_commission_double /
              (integer_shares *
                float_get_price_ask(object_stock.string_symbol) +
                object_constants.float_commission_double) <
              float_get_growth_average_absolute(
                object_stock.array_prices_average
              ) &&
            // Assume that the biggest recorded price is the biggest the price can reach, so need to ensure that even if it's reached, we can still break even.
            (object_stock.float_price_average_biggest -
              float_get_price_average(object_stock.string_symbol)) *
              integer_shares >
              object_constants.float_commission_double
        : float_get_forecast(object_stock.string_symbol) < 0.5 &&
            // Ensure that growth is sufficient to break even from commissions.
            object_constants.float_commission_double /
              (integer_shares *
                float_get_price_bid(object_stock.string_symbol) +
                object_constants.float_commission_double) <
              float_get_growth_average_absolute(
                object_stock.array_prices_average
              ) &&
            // Assume that 0 is the lowest the price can reach, so need to ensure that even if it's reached, we can still break even.
            float_get_price_average(object_stock.string_symbol) *
              integer_shares >
              object_constants.float_commission_double;
    } else {
      const float_growth_average_range_latest = float_get_growth_average_range_latest(
        {
          array_numbers: object_stock.array_prices_average,
          integer_latest_length: integer_smoothing,
        }
      );
      return boolean_long
        ? // Buy only if latest SMA of growth is greater than lagging as this indicates an upwards momentum.
          float_growth_average_range_latest >
            float_get_growth_average_range_lagging({
              array_numbers: object_stock.array_prices_average,
              integer_lagging_length: integer_smoothing,
            }) &&
            // Buy only if stock has actually been increasing in price and not just decreasing in price at a slower rate than it was before.
            float_growth_average_range_latest > 0 &&
            // Just to be extra safe, ensure that the stock's latest growth was also positive.
            float_get_growth_average_range_latest({
              array_numbers: object_stock.array_prices_average,
              integer_latest_length: 2,
            }) > 0 &&
            // Ensure that growth is sufficient to break even from commissions.
            object_constants.float_commission_double /
              (integer_shares *
                float_get_price_ask(object_stock.string_symbol) +
                object_constants.float_commission_double) <
              float_get_growth_average_absolute(
                object_stock.array_prices_average
              ) &&
            // Assume that the biggest recorded price is the biggest the price can reach, so need to ensure that even if it's reached, we can still break even.
            (object_stock.float_price_average_biggest -
              float_get_price_average(object_stock.string_symbol)) *
              integer_shares >
              object_constants.float_commission_double
        : // Buy only if latest SMA of growth is less than lagging as this indicates a downwards momentum.
          float_growth_average_range_latest <
            float_get_growth_average_range_lagging({
              array_numbers: object_stock.array_prices_average,
              integer_lagging_length: integer_smoothing,
            }) &&
            // Buy only if stock has actually been decreasing in price and not just increasing in price at a slower rate than it was before.
            float_growth_average_range_latest < 0 &&
            // Just to be extra safe, ensure that the stock's latest growth was also negative.
            float_get_growth_average_range_latest({
              array_numbers: object_stock.array_prices_average,
              integer_latest_length: 2,
            }) < 0 &&
            // Ensure that growth is sufficient to break even from commissions.
            object_constants.float_commission_double /
              (integer_shares *
                float_get_price_bid(object_stock.string_symbol) +
                object_constants.float_commission_double) <
              float_get_growth_average_absolute(
                object_stock.array_prices_average
              ) &&
            // Assume that 0 is the lowest the price can reach, so need to ensure that even if it's reached, we can still break even.
            float_get_price_average(object_stock.string_symbol) *
              integer_shares >
              object_constants.float_commission_double;
    }
  };

  /**
   * @description Returns a new stock market object.
   * @param {Object} object_arguments - Contains the arguments for the function.
   * @param {Stocks} object_arguments.object_stocks - A stocks object.
   * @param {string[]} object_arguments.array_stocks_invested_long - Contains symbols of stocks in which shares in the long position are owned.
   * @param {string[]} object_arguments.array_stocks_invested_short - Contains symbols of stocks in which shares in the short position are owned.
   * @param {number} object_arguments.float_cash_invested - The amount of cash currently invested in the market.
   * @returns {StockMarket} The new stock market object.
   */
  const object_get_stock_market = ({
    object_stocks,
    array_stocks_invested_long,
    array_stocks_invested_short,
    float_cash_invested,
  }) => ({
    object_stocks: object_stocks,
    array_stocks_invested_long: array_stocks_invested_long,
    array_stocks_invested_short: array_stocks_invested_short,
    float_cash_invested: float_cash_invested,
  });

  /**
   * @description Takes a stocks object and returns the stock object that's best for buying shares, or `null` if none of the objects are ideal.
   * @param {Object} object_arguments - Contains the arguments for the function.
   * @param {StockMarket} object_arguments.object_stock_market The original stock market object.
   * @param {boolean} object_arguments.boolean_long - Whether the forecast values are being calculated for shares in the long or short position. `true` = long, `false` = short.
   * @param {number} object_arguments.integer_smoothing - The amount of values to average for the shorter range average growth rate, which is compared with the longer range average growth rate when 4S Market Data API is inaccessible.
   * @param {number} object_arguments.float_investment_capital - The fraction of total cash that can be used for investment.
   * @returns {Stock|null} The stock object that's best for buying shares, or `null` if none of the objects are ideal.
   * @todo It's inefficient that we check for 4S Market Data TIX API access and whether or not we're transacting longs or shorts every iteration. Maybe we shouldn't in-line those checks?
   */
  const object_or_null_get_stock_buy = ({
    object_stock_market,
    boolean_long,
    integer_smoothing,
    float_investment_capital,
  }) => {
    const array_stocks_filtered = Object.entries(
      object_stock_market.object_stocks
    )
      .map(([string_symbol, object_stock]) => object_stock)
      .filter((object_stock) =>
        boolean_should_buy({
          object_stock: object_stock,
          integer_shares: integer_get_shares_buyable({
            object_stock: object_stock,
            float_cash: float_get_capital_left({
              float_cash_invested: object_stock_market.float_cash_invested,
              float_investment_capital: float_investment_capital,
            }),
            boolean_long: boolean_long,
          }),
          boolean_long: boolean_long,
          integer_smoothing: integer_smoothing,
        })
      );
    return array_stocks_filtered.length === 0
      ? null
      : array_stocks_filtered.reduce(
          (object_stock_and_score_best, object_stock) => {
            const object_stock_and_score = {
              float_score: boolean_have_4S(
                array_stocks_filtered[0].string_symbol
              )
                ? float_get_forecast(object_stock.string_symbol)
                : float_get_growth_average_range_latest({
                    array_numbers: object_stock.array_prices_average,
                    integer_latest_length: integer_smoothing,
                  }),
              object_stock: object_stock,
            };
            return (
              boolean_long
                ? object_stock_and_score.float_score >
                  object_stock_and_score_best.float_score
                : object_stock_and_score.float_score <
                  object_stock_and_score_best.float_score
            )
              ? object_stock_and_score
              : object_stock_and_score_best;
          },
          {
            float_score: (boolean_long ? -1 : 1) / 0,
            object_stock: null,
          }
        ).object_stock;
  };

  /**
   * @description Takes a stocks object and returns a new one based on the original, but updated after buying shares in a stock.
   * @param {Object} object_arguments - Contains the arguments for the function.
   * @param {Stocks} object_arguments.object_stocks The original array of stock objects.
   * @param {string} object_arguments.string_symbol - The stock's symbol.
   * @param {boolean} object_arguments.boolean_long - Whether the shares transacted were in the long or short position. `true` = long, `false` = short.
   * @param {number} object_arguments.integer_shares - The amount of shares added.
   * @returns {Stocks} The new stocks object with the updated stock object.
   */
  const object_get_stocks_updated_after_buying = ({
    object_stocks,
    string_symbol,
    boolean_long,
    integer_shares,
  }) =>
    object_get_updated({
      object_original: object_stocks,
      object_properties_new: {
        [string_symbol]: object_get_stock_updated_after_buying({
          object_stock: object_stocks[string_symbol],
          boolean_long: boolean_long,
          integer_shares: integer_shares,
        }),
      },
    });

  /**
   * @description Takes a stock market object and returns a new one based on the original, but with values updated after one market tick.
   * @param {Object} object_arguments - Contains the arguments for the function.
   * @param {StockMarket} object_arguments.object_stock_market - The original stock market object.
   * @param {number} object_arguments.integer_prices_average_length - The maximum length of the stock objects' average price arrays.
   * @returns {StockMarket} Stocks object.
   */
  const object_get_stock_market_updated_after_tick = ({
    object_stock_market,
    integer_prices_average_length,
  }) =>
    object_get_updated({
      object_original: object_stock_market,
      object_properties_new: {
        object_stocks: object_get_stocks_updated_after_tick({
          object_stocks: object_stock_market.object_stocks,
          integer_prices_average_length: integer_prices_average_length,
        }),
      },
    });

  /**
   * @description Takes a stock market object and returns a new one based on the original, but with values updated after buying some shares of a stock.
   * @param {Object} object_arguments - Contains the arguments for the function.
   * @param {StockMarket} object_arguments.object_stock_market - The original stock market object.
   * @param {string} object_arguments.string_symbol - The stock's symbol.
   * @param {boolean} object_arguments.boolean_long - Whether the shares transacted were in the long or short position. `true` = long, `false` = short.
   * @param {number} object_arguments.integer_shares - The amount of shares added.
   * @returns {StockMarket} The updated stock market object.
   */
  const object_get_stock_market_updated_after_buying = ({
    object_stock_market,
    string_symbol,
    boolean_long,
    integer_shares,
  }) =>
    boolean_long
      ? object_stock_market.array_stocks_invested_long.includes(string_symbol)
        ? object_get_updated({
            object_original: object_stock_market,
            object_properties_new: {
              object_stocks: object_get_stocks_updated_after_buying({
                object_stocks: object_stock_market.object_stocks,
                string_symbol: string_symbol,
                boolean_long: boolean_long,
                integer_shares: integer_shares,
              }),
              float_cash_invested:
                object_stock_market.float_cash_invested +
                object_constants.float_commission +
                integer_shares * float_get_price_ask(string_symbol),
            },
          })
        : object_get_updated({
            object_original: object_stock_market,
            object_properties_new: {
              object_stocks: object_get_stocks_updated_after_buying({
                object_stocks: object_stock_market.object_stocks,
                string_symbol: string_symbol,
                boolean_long: boolean_long,
                integer_shares: integer_shares,
              }),
              array_stocks_invested_long: object_stock_market.array_stocks_invested_long.concat(
                string_symbol
              ),
              float_cash_invested:
                object_stock_market.float_cash_invested +
                object_constants.float_commission +
                integer_shares * float_get_price_ask(string_symbol),
            },
          })
      : object_stock_market.array_stocks_invested_short.includes(string_symbol)
      ? object_get_updated({
          object_original: object_stock_market,
          object_properties_new: {
            object_stocks: object_get_stocks_updated_after_buying({
              object_stocks: object_stock_market.object_stocks,
              string_symbol: string_symbol,
              boolean_long: boolean_long,
              integer_shares: integer_shares,
            }),
            float_cash_invested:
              object_stock_market.float_cash_invested +
              object_constants.float_commission +
              integer_shares * float_get_price_bid(string_symbol),
          },
        })
      : object_get_updated({
          object_original: object_stock_market,
          object_properties_new: {
            object_stocks: object_get_stocks_updated_after_buying({
              object_stocks: object_stock_market.object_stocks,
              string_symbol: string_symbol,
              boolean_long: boolean_long,
              integer_shares: integer_shares,
            }),
            array_stocks_invested_short: object_stock_market.array_stocks_invested_short.concat(
              string_symbol
            ),
            float_cash_invested:
              object_stock_market.float_cash_invested +
              object_constants.float_commission +
              integer_shares * float_get_price_bid(string_symbol),
          },
        });

  /**
   * @description Takes a stock market object and returns a new one based on the original, but with values updated after selling some shares of a stock.
   * @param {Object} object_arguments - Contains the arguments for the function.
   * @param {StockMarket} object_arguments.object_stock_market - The original stock market object.
   * @param {string} object_arguments.string_symbol - The stock's symbol.
   * @param {boolean} object_arguments.boolean_long - Whether the shares transacted were in the long or short position. `true` = long, `false` = short.
   * @param {number} object_arguments.integer_shares - The amount of shares removed.
   * @returns {StockMarket} Stocks object.
   */
  const object_get_stock_market_updated_after_selling = ({
    object_stock_market,
    string_symbol,
    boolean_long,
    integer_shares,
  }) =>
    boolean_long
      ? integer_shares >=
        object_stock_market.object_stocks[string_symbol].integer_shares_long
        ? object_get_updated({
            object_original: object_stock_market,
            object_properties_new: {
              object_stocks: object_get_stocks_updated_after_selling({
                object_stocks: object_stock_market.object_stocks,
                string_symbol: string_symbol,
                boolean_long: boolean_long,
                integer_shares: integer_shares,
              }),
              float_cash_invested:
                object_stock_market.float_cash_invested -
                float_get_profit({
                  object_stock:
                    object_stock_market.object_stocks[string_symbol],
                  integer_shares: integer_shares,
                  boolean_long: boolean_long,
                }),
              array_stocks_invested_long: object_stock_market.array_stocks_invested_long.filter(
                (string_symbol_invested) =>
                  string_symbol != string_symbol_invested
              ),
            },
          })
        : object_get_updated({
            object_original: object_stock_market,
            object_properties_new: {
              object_stocks: object_get_stocks_updated_after_selling({
                object_stocks: object_stock_market.object_stocks,
                string_symbol: string_symbol,
                boolean_long: boolean_long,
                integer_shares: integer_shares,
              }),
              float_cash_invested:
                object_stock_market.float_cash_invested -
                float_get_profit({
                  object_stock:
                    object_stock_market.object_stocks[string_symbol],
                  integer_shares: integer_shares,
                  boolean_long: boolean_long,
                }),
            },
          })
      : integer_shares >=
        object_stock_market.object_stocks[string_symbol].integer_shares_short
      ? object_get_updated({
          object_original: object_stock_market,
          object_properties_new: {
            object_stocks: object_get_stocks_updated_after_selling({
              object_stocks: object_stock_market.object_stocks,
              string_symbol: string_symbol,
              boolean_long: boolean_long,
              integer_shares: integer_shares,
            }),
            float_cash_invested:
              object_stock_market.float_cash_invested -
              float_get_profit({
                object_stock: object_stock_market.object_stocks[string_symbol],
                integer_shares: integer_shares,
                boolean_long: boolean_long,
              }),
            array_stocks_invested_short: object_stock_market.array_stocks_invested_short.filter(
              (string_symbol_invested) =>
                string_symbol != string_symbol_invested
            ),
          },
        })
      : object_get_updated({
          object_original: object_stock_market,
          object_properties_new: {
            object_stocks: object_get_stocks_updated_after_selling({
              object_stocks: object_stock_market.object_stocks,
              string_symbol: string_symbol,
              boolean_long: boolean_long,
              integer_shares: integer_shares,
            }),
            float_cash_invested:
              object_stock_market.float_cash_invested -
              float_get_profit({
                object_stock: object_stock_market.object_stocks[string_symbol],
                integer_shares: integer_shares,
                boolean_long: boolean_long,
              }),
          },
        });

  /**
   * @description Returns true if shares should be sold, otherwise false.
   * @param {Object} object_arguments - Contains the arguments for the function.
   * @param {Stock} object_arguments.object_stock - The stock object.
   * @param {number} object_arguments.integer_shares - The amount of shares to sell.
   * @param {boolean} object_arguments.boolean_long - Whether the value is being calculated for shares in the long or short position. True = long, false = short.
   * @param {number} object_arguments.integer_smoothing - The amount of values to average for the shorter ranger average growth rate, which is compared with the longer range average growth rate when 4S Market Data API is inaccessible.
   * @returns {boolean} True if shares should be sold, otherwise false.
   */
  const boolean_should_sell = ({
    object_stock,
    integer_shares,
    boolean_long,
    integer_smoothing,
  }) =>
    boolean_have_4S(object_stock.string_symbol)
      ? float_get_profit({
          object_stock: object_stock,
          integer_shares: integer_shares,
          boolean_long: boolean_long,
        }) > 0 &&
        (boolean_long
          ? float_get_forecast(object_stock.string_symbol) < 0.5
          : float_get_forecast(object_stock.string_symbol) > 0.5)
      : float_get_profit({
          object_stock: object_stock,
          integer_shares: integer_shares,
          boolean_long: boolean_long,
        }) > 0 &&
        (boolean_long
          ? float_get_growth_average_range_latest({
              array_numbers: object_stock.array_prices_average,
              integer_latest_length: integer_smoothing,
            }) <
              float_get_growth_average_range_lagging({
                array_numbers: object_stock.array_prices_average,
                integer_lagging_length: integer_smoothing,
              }) &&
            float_get_growth_average_range_latest({
              array_numbers: object_stock.array_prices_average,
              integer_latest_length: 2,
            }) < 0
          : float_get_growth_average_range_latest({
              array_numbers: object_stock.array_prices_average,
              integer_latest_length: integer_smoothing,
            }) >
              float_get_growth_average_range_lagging({
                array_numbers: object_stock.array_prices_average,
                integer_lagging_length: integer_smoothing,
              }) &&
            float_get_growth_average_range_latest({
              array_numbers: object_stock.array_prices_average,
              integer_latest_length: 2,
            }) > 0);

  /**
   * @description Takes a stocks object and returns a stock object that should be sold, or `null` if none of the objects should be sold.
   * @param {Object} object_arguments - Contains the arguments for the function.
   * @param {StockMarket} object_arguments.object_stock_market The stock market object.
   * @param {boolean} object_arguments.boolean_long - Whether the shares transacted are in the long or short position. `true` = long, `false` = short.
   * @param {number} object_arguments.integer_smoothing - The amount of values to average for the shorter range average growth rate, which is compared with the longer range average growth rate when 4S Market Data API is inaccessible.
   * @returns {Stock|undefined} The stock object that's best for buying shares, or `null` if none of the objects are ideal.
   */
  const object_get_stock_sell = ({
    object_stock_market,
    boolean_long,
    integer_smoothing,
  }) =>
    array_get_stocks_invested({
      object_stock_market: object_stock_market,
      boolean_long: boolean_long,
    }).find((object_stock) =>
      boolean_should_sell({
        object_stock: object_stock,
        integer_shares: boolean_long
          ? object_stock.integer_shares_long
          : object_stock.integer_shares_short,
        boolean_long: boolean_long,
        integer_smoothing: integer_smoothing,
      })
    );

  /**
   * @description Returns an array of stock symbols in which shares are owned.
   * @param {Object} object_arguments - Contains the arguments for the function.
   * @param {StockMarket} object_arguments.object_stock_market - The original stock market object.
   * @param {boolean} object_arguments.boolean_long - Whether the stocks to get are in the the long or short position. `true` = long, `false` = short.
   * @returns {string[]} Contains the stock symbols in which shares are owned.
   */
  const array_get_stock_symbols_invested = ({
    object_stock_market,
    boolean_long,
  }) =>
    boolean_long
      ? object_stock_market.array_stocks_invested_long
      : object_stock_market.array_stocks_invested_short;

  /**
   * @description Serialises some data and saves it into local storage using the specified key.
   * @param {Object} object_arguments - Contains the arguments for the function.
   * @param {any} object_arguments.any_data - The data to save.
   * @param {string} object_arguments.string_key - The key to use.
   */
  const void_save = ({ any_data, string_key }) =>
    object_constants.object_storage.setItem(
      string_key,
      JSON.stringify(any_data)
    );

  /**
   * @description Loads some data from local storage using the specified key then deserialises and returns it.
   * @param {string} string_key - The key to use.
   * @return {any} The loaded, deserialised data.
   * @todo Handle failure cases.
   */
  const any_load = (string_key) =>
    JSON.parse(object_constants.object_storage.getItem(string_key));

  /**
   * @description Returns an array of stock objects in which shares are owned.
   * @param {Object} object_arguments - Contains the arguments for the function.
   * @param {StockMarket} object_arguments.object_stock_market - The original stock market object.
   * @param {boolean} object_arguments.boolean_long - Whether the stocks to get are in the the long or short position. `true` = long, `false` = short.
   * @returns {Stock[]} Contains the stock objects in which shares are owned.
   */
  const array_get_stocks_invested = ({ object_stock_market, boolean_long }) =>
    array_get_stock_symbols_invested({
      object_stock_market: object_stock_market,
      boolean_long: boolean_long,
    }).map((string_symbol) => object_stock_market.object_stocks[string_symbol]);

  /**
   * @description Sells invested shares if the conditions of the provided function is met and returns an updated stock market object. This function is effectful and impure.
   * @param {Object} object_arguments - Contains the arguments for the function.
   * @param {StockMarket} object_arguments.object_stock_market - The original stocks object.
   * @param {boolean} object_arguments.boolean_long - Whether the shares transacted are in the long or short position. `true` = long, `false` = short.
   * @param {function} object_arguments.object_get_stock - The function to used to get the stock object to sell shares of.
   * @param {function} object_arguments.integer_get_shares - The function to determine how many shares of the stock to sell.
   * @param {number} object_arguments.integer_smoothing - The amount of values to average for the shorter range average growth rate, which is compared with the longer range average growth rate when 4S Market Data API is inaccessible.
   * @returns {StockMarket} The updated stock market object.
   * @todo Should saving to local storage happen here?
   * @todo Handle cases when transaction fails.
   */
  const object_get_stock_market_updated_after_selling_conditional = ({
    object_stock_market,
    boolean_long,
    object_get_stock,
    integer_get_shares,
    integer_smoothing,
  }) => {
    const object_stock_to_sell_initial = object_get_stock({
      object_stock_market: object_stock_market,
      boolean_long: boolean_long,
      integer_smoothing: integer_smoothing,
    });
    if (
      null === object_stock_to_sell_initial ||
      void 0 === object_stock_to_sell_initial
    )
      return object_stock_market;
    const integer_shares_to_sell = integer_get_shares({
      object_stock_market: object_stock_market,
      boolean_long: boolean_long,
      object_stock: object_stock_to_sell_initial,
    });
    if (null === integer_shares_to_sell || void 0 === integer_shares_to_sell)
      return object_stock_market;
    return any_while({
      any_state: {
        object_stock_market: object_stock_market,
        boolean_long: boolean_long,
        object_get_stock: object_get_stock,
        object_stock: object_stock_to_sell_initial,
        integer_get_shares: integer_get_shares,
        integer_shares: integer_shares_to_sell,
        integer_smoothing: integer_smoothing,
      },
      boolean_condition: (object_state) =>
        (void 0 != object_state.object_stock ||
          null != object_state.object_stock) &&
        0 < object_state.integer_shares &&
        object_constants.float_commission <= float_get_cash_player(),
      any_function: (object_state) => {
        const object_stock = object_state.object_stock;
        if (
          0 <
          integer_sell({
            string_symbol: object_stock.string_symbol,
            integer_shares: object_state.integer_shares,
            boolean_long: object_state.boolean_long,
          })
        ) {
          /**
           * @description Transaction was successful, return updated state object.
           * @type {StockMarket}
           */
          const object_stock_market = object_get_stock_market_updated_after_selling(
            {
              object_stock_market: object_state.object_stock_market,
              string_symbol: object_stock.string_symbol,
              boolean_long: object_state.boolean_long,
              integer_shares: object_state.integer_shares,
            }
          );
          void_save({
            any_data:
              object_stock_market.object_stocks[object_stock.string_symbol],
            string_key:
              object_constants.string_prefix_stock + object_stock.string_symbol,
          });
          void_save({
            any_data: object_stock_market.float_cash_invested,
            string_key: object_constants.string_property_cash_invested,
          });
          const object_stock_to_sell = object_state.object_get_stock({
            object_stock_market: object_stock_market,
            boolean_long: object_state.boolean_long,
            integer_smoothing: object_state.integer_smoothing,
          });
          return null === object_stock_to_sell ||
            void 0 === object_stock_to_sell
            ? object_get_updated({
                object_original: object_state,
                object_properties_new: {
                  object_stock_market: object_stock_market,
                  object_stock: object_stock_to_sell,
                  integer_shares: null,
                },
              })
            : object_get_updated({
                object_original: object_state,
                object_properties_new: {
                  object_stock_market: object_stock_market,
                  object_stock: object_stock_to_sell,
                  integer_shares: object_state.integer_get_shares({
                    object_stock_market: object_stock_market,
                    boolean_long: object_state.boolean_long,
                    object_stock: object_stock_to_sell,
                  }),
                },
              });
        }
      },
    }).object_stock_market;
  };

  /**
   * @description Buys shares of a stock that returns `true` when passed to the provided function and returns an updated stock market object. This function is effectful and impure.
   * @param {Object} object_arguments - Contains the arguments for the function.
   * @param {StockMarket} object_arguments.object_stock_market - The original stock market object.
   * @param {number} object_arguments.float_investment_capital - The fraction of total assets to potentially be used for investing in the market.
   * @param {boolean} object_arguments.boolean_long - Whether the shares transacted are in the long or short position. `true` = long, `false` = short.
   * @param {function} object_arguments.object_get_stock - The function to used to get the stock object to buy shares of.
   * @param {function} object_arguments.integer_get_shares - The function to determine how many shares of the stock to buy.
   * @param {number} object_arguments.integer_smoothing - The amount of values to average for the shorter range average growth rate, which is compared with the longer range average growth rate when 4S Market Data API is inaccessible.
   * @returns {StockMarket} The updated stock market object.
   * @todo Should saving to local storage happen here?
   * @todo Handle cases when transaction fails.
   */
  const object_get_stock_market_updated_after_buying_conditional = ({
    object_stock_market,
    float_investment_capital,
    boolean_long,
    object_get_stock,
    integer_get_shares,
    integer_smoothing,
  }) => {
    const object_stock_to_buy_initial = object_get_stock({
      object_stock_market: object_stock_market,
      boolean_long: boolean_long,
      float_investment_capital: float_investment_capital,
      integer_smoothing: integer_smoothing,
    });
    if (
      null === object_stock_to_buy_initial ||
      void 0 === object_stock_to_buy_initial
    )
      return object_stock_market;
    const integer_shares_to_buy = integer_get_shares({
      object_stock_market: object_stock_market,
      boolean_long: boolean_long,
      float_investment_capital: float_investment_capital,
      object_stock: object_stock_to_buy_initial,
    });
    if (null === integer_shares_to_buy || void 0 === integer_shares_to_buy)
      return object_stock_market;
    return any_while({
      any_state: {
        object_stock_market: object_stock_market,
        boolean_long: boolean_long,
        float_investment_capital: float_investment_capital,
        object_get_stock: object_get_stock,
        object_stock: object_stock_to_buy_initial,
        integer_get_shares: integer_get_shares,
        integer_shares: integer_shares_to_buy,
        integer_smoothing: integer_smoothing,
      },
      boolean_condition: (object_state) =>
        (void 0 != object_state.object_stock ||
          null != object_state.object_stock) &&
        0 < object_state.integer_shares &&
        object_constants.float_commission_double <=
          float_get_capital_left({
            float_cash_invested:
              object_state.object_stock_market.float_cash_invested,
            float_investment_capital: object_state.float_investment_capital,
          }),
      any_function: (object_state) => {
        const object_stock = object_state.object_stock;
        if (
          0 <
          integer_buy({
            string_symbol: object_stock.string_symbol,
            integer_shares: object_state.integer_shares,
            boolean_long: object_state.boolean_long,
          })
        ) {
          /**
           * @description Transaction was successful, return updated state object.
           * @type {StockMarket}
           */
          const object_stock_market = object_get_stock_market_updated_after_buying(
            {
              object_stock_market: object_state.object_stock_market,
              string_symbol: object_stock.string_symbol,
              boolean_long: object_state.boolean_long,
              integer_shares: object_state.integer_shares,
            }
          );
          void_save({
            any_data:
              object_stock_market.object_stocks[object_stock.string_symbol],
            string_key:
              object_constants.string_prefix_stock + object_stock.string_symbol,
          });
          void_save({
            any_data: object_stock_market.float_cash_invested,
            string_key: object_constants.string_property_cash_invested,
          });
          const object_stock_to_buy = object_state.object_get_stock({
            object_stock_market: object_stock_market,
            boolean_long: object_state.boolean_long,
            float_investment_capital: object_state.float_investment_capital,
            integer_smoothing: object_state.integer_smoothing,
          });
          return null === object_stock_to_buy || void 0 === object_stock_to_buy
            ? object_get_updated({
                object_original: object_state,
                object_properties_new: {
                  object_stock_market: object_stock_market,
                  object_stock: object_stock_to_buy,
                  integer_shares: null,
                },
              })
            : object_get_updated({
                object_original: object_state,
                object_properties_new: {
                  object_stock_market: object_stock_market,
                  object_stock: object_stock_to_buy,
                  integer_shares: object_state.integer_get_shares({
                    object_stock_market: object_stock_market,
                    boolean_long: object_state.boolean_long,
                    float_investment_capital:
                      object_state.float_investment_capital,
                    object_stock: object_stock_to_buy,
                  }),
                },
              });
        }
      },
    }).object_stock_market;
  };

  /**
   * @description Serialises stock objects and saves them into local storage.
   * @param {Stocks} object_stocks - The data to save.
   */
  const void_save_stocks = (object_stocks) =>
    Object.entries(object_stocks).map(([string_symbol, object_stock]) =>
      void_save({
        any_data: object_stock,
        string_key: object_constants.string_prefix_stock + string_symbol,
      })
    );

  /**
   * @description Main entry point to the script.
   * @todo This whole function sucks and doesn't follow the principle of separation of concerns. Figure out a way to better write it.
   */
  const void_main = async () => {
    let integer_time = Date.now(),
      integer_prices_average_length =
        object_constants.object_document[
          object_constants.string_property_prices_average_length
        ],
      string_cash_invested_buffer = object_constants.object_storage.getItem(
        object_constants.string_property_cash_invested
      );
    /**
     * @type {StockMarket}
     * @todo Coercing its type here seems bad?
     */
    let object_stock_market;
    // Load data from storage if it exists, otherwise create a new one.
    if (string_cash_invested_buffer === null) {
      // Need to initialise new data.
      object_stock_market = object_get_stock_market({
        object_stocks: object_get_stocks(),
        array_stocks_invested_long: [],
        array_stocks_invested_short: [],
        float_cash_invested: 0,
      });
      void_save({
        any_data:
          object_constants.object_document[
            object_constants.string_property_sell_asap
          ],
        string_key: object_constants.string_property_sell_asap,
      });
      void_save({
        any_data:
          object_constants.object_document[
            object_constants.string_property_sell_profitable
          ],
        string_key: object_constants.string_property_sell_profitable,
      });
      void_save({
        any_data:
          object_constants.object_document[
            object_constants.string_property_trade
          ],
        string_key: object_constants.string_property_trade,
      });
    } else {
      if (
        await object_netscript.prompt(`Existing stock market information detected. Do you want to keep it?
Select "No" if you've just reset after installing augmentations or defeating a BitNode, otherwise select "Yes".`)
      ) {
        // Need to parse existing data.
        const array_stock_symbols = array_get_stocks_symbols(),
          object_stocks = Object.fromEntries(
            array_stock_symbols.map((string_symbol) => [
              string_symbol,
              any_load(object_constants.string_prefix_stock + string_symbol),
            ])
          );
        object_stock_market = object_get_stock_market({
          object_stocks: object_stocks,
          array_stocks_invested_long: array_stock_symbols.filter(
            (string_symbol) =>
              object_stocks[string_symbol].integer_shares_long > 0
          ),
          array_stocks_invested_short: array_stock_symbols.filter(
            (string_symbol) =>
              object_stocks[string_symbol].integer_shares_short > 0
          ),
          float_cash_invested: JSON.parse(string_cash_invested_buffer),
        });
        object_constants.object_document[
          object_constants.string_property_sell_asap
        ] = any_load(object_constants.string_property_sell_asap);
        object_constants.object_document[
          object_constants.string_property_sell_profitable
        ] = any_load(object_constants.string_property_sell_profitable);
        object_constants.object_document[
          object_constants.string_property_trade
        ] = any_load(object_constants.string_property_trade);
      } else {
        // Need to initialise new data.
        object_stock_market = object_get_stock_market({
          object_stocks: object_get_stocks(),
          array_stocks_invested_long: [],
          array_stocks_invested_short: [],
          float_cash_invested: 0,
        });
        void_save({
          any_data:
            object_constants.object_document[
              object_constants.string_property_sell_asap
            ],
          string_key: object_constants.string_property_sell_asap,
        });
        void_save({
          any_data:
            object_constants.object_document[
              object_constants.string_property_sell_profitable
            ],
          string_key: object_constants.string_property_sell_profitable,
        });
        void_save({
          any_data:
            object_constants.object_document[
              object_constants.string_property_trade
            ],
          string_key: object_constants.string_property_trade,
        });
      }
    }
    const string_symbol_any = Object.entries(
      object_stock_market.object_stocks
    )[0][0];
    let integer_prices_average_length_double =
      integer_prices_average_length * 2;
    for (;;) {
      // Increase amount of recorded prices if necessary.
      for (
        ;
        integer_prices_average_length_double >
        object_stock_market.object_stocks[string_symbol_any]
          .array_prices_average.length;

      ) {
        integer_prices_average_length =
          object_constants.object_document[
            object_constants.string_property_prices_average_length
          ];
        integer_prices_average_length_double =
          integer_prices_average_length * 2;
        await object_netscript.sleep(
          Math.max(
            1,
            object_constants.float_period_update_stock +
              integer_time -
              Date.now()
          )
        );
        integer_time = Date.now();
        object_stock_market = object_get_stock_market_updated_after_tick({
          object_stock_market: object_stock_market,
          integer_prices_average_length: integer_prices_average_length_double,
        });
        void_save_stocks(object_stock_market.object_stocks);
      }
      // Maximum length of arrays reached, can now begin transacting.
      let float_investment_capital =
        object_constants.object_document[
          object_constants.string_property_investment_capital
        ];
      (integer_prices_average_length =
        object_constants.object_document[
          object_constants.string_property_prices_average_length
        ]),
        (integer_prices_average_length_double =
          integer_prices_average_length * 2);
      // Force liquidate - sell all shares if cash is sufficient for commission fees.
      if (
        object_constants.object_document[
          object_constants.string_property_sell_asap
        ]
      ) {
        object_stock_market = object_get_stock_market_updated_after_selling_conditional(
          {
            object_stock_market: boolean_have_4S
              ? object_get_stock_market_updated_after_selling_conditional({
                  object_stock_market: object_stock_market,
                  boolean_long: false,
                  object_get_stock: ({ object_stock_market, boolean_long }) => {
                    const array_stocks_invested = array_get_stocks_invested({
                      object_stock_market: object_stock_market,
                      boolean_long: boolean_long,
                    });
                    return 0 >= array_stocks_invested.length
                      ? null
                      : array_stocks_invested[0];
                  },
                  integer_get_shares: integer_get_shares_owned,
                  integer_smoothing: integer_prices_average_length,
                })
              : object_stock_market,
            boolean_long: true,
            object_get_stock: ({ object_stock_market, boolean_long }) => {
              const array_stocks_invested = array_get_stocks_invested({
                object_stock_market: object_stock_market,
                boolean_long: boolean_long,
              });
              return 0 >= array_stocks_invested.length
                ? null
                : array_stocks_invested[0];
            },
            integer_get_shares: integer_get_shares_owned,
            integer_smoothing: integer_prices_average_length,
          }
        );
      }
      // Liquidate when profitable.
      if (
        object_constants.object_document[
          object_constants.string_property_sell_profitable
        ]
      ) {
        object_stock_market = object_get_stock_market_updated_after_selling_conditional(
          {
            object_stock_market: boolean_have_4S
              ? object_get_stock_market_updated_after_selling_conditional({
                  object_stock_market: object_stock_market,
                  boolean_long: false,
                  object_get_stock: ({ object_stock_market, boolean_long }) =>
                    array_get_stocks_invested({
                      object_stock_market: object_stock_market,
                      boolean_long: boolean_long,
                    }).find(
                      (object_stock) =>
                        0 <
                        float_get_profit({
                          object_stock: object_stock,
                          integer_shares: boolean_long
                            ? object_stock.integer_shares_long
                            : object_stock.integer_shares_short,
                          boolean_long: boolean_long,
                        })
                    ),
                  integer_get_shares: integer_get_shares_owned,
                  integer_smoothing: integer_prices_average_length,
                })
              : object_stock_market,
            boolean_long: true,
            object_get_stock: ({ object_stock_market, boolean_long }) =>
              array_get_stocks_invested({
                object_stock_market: object_stock_market,
                boolean_long: boolean_long,
              }).find(
                (object_stock) =>
                  0 <
                  float_get_profit({
                    object_stock: object_stock,
                    integer_shares: boolean_long
                      ? object_stock.integer_shares_long
                      : object_stock.integer_shares_short,
                    boolean_long: boolean_long,
                  })
              ),
            integer_get_shares: integer_get_shares_owned,
            integer_smoothing: integer_prices_average_length,
          }
        );
      }
      // Trade.
      if (
        object_constants.object_document[object_constants.string_property_trade]
      ) {
        object_stock_market = boolean_can_short(string_symbol_any)
          ? object_get_stock_market_updated_after_buying_conditional({
              object_stock_market: object_get_stock_market_updated_after_selling_conditional(
                {
                  object_stock_market: object_get_stock_market_updated_after_buying_conditional(
                    {
                      object_stock_market: object_get_stock_market_updated_after_selling_conditional(
                        {
                          object_stock_market: object_stock_market,
                          boolean_long: true,
                          object_get_stock: object_get_stock_sell,
                          integer_get_shares: integer_get_shares_owned,
                          integer_smoothing: integer_prices_average_length,
                        }
                      ),
                      float_investment_capital: float_investment_capital,
                      boolean_long: false,
                      object_get_stock: object_or_null_get_stock_buy,
                      integer_get_shares: ({
                        object_stock_market,
                        boolean_long,
                        float_investment_capital,
                        object_stock,
                      }) =>
                        integer_get_shares_buyable({
                          object_stock: object_stock,
                          float_cash: float_get_capital_left({
                            float_cash_invested:
                              object_stock_market.float_cash_invested,
                            float_investment_capital: float_investment_capital,
                          }),
                          boolean_long: boolean_long,
                        }),
                      integer_smoothing: integer_prices_average_length,
                    }
                  ),
                  boolean_long: false,
                  object_get_stock: object_get_stock_sell,
                  integer_get_shares: integer_get_shares_owned,
                  integer_smoothing: integer_prices_average_length,
                }
              ),
              float_investment_capital: float_investment_capital,
              boolean_long: true,
              object_get_stock: object_or_null_get_stock_buy,
              integer_get_shares: ({
                object_stock_market,
                boolean_long,
                float_investment_capital,
                object_stock,
              }) =>
                integer_get_shares_buyable({
                  object_stock: object_stock,
                  float_cash: float_get_capital_left({
                    float_cash_invested:
                      object_stock_market.float_cash_invested,
                    float_investment_capital: float_investment_capital,
                  }),
                  boolean_long: boolean_long,
                }),
              integer_smoothing: integer_prices_average_length,
            })
          : object_get_stock_market_updated_after_buying_conditional({
              object_stock_market: object_get_stock_market_updated_after_selling_conditional(
                {
                  object_stock_market: object_stock_market,
                  boolean_long: true,
                  object_get_stock: object_get_stock_sell,
                  integer_get_shares: integer_get_shares_owned,
                  integer_smoothing: integer_prices_average_length,
                }
              ),
              float_investment_capital: float_investment_capital,
              boolean_long: true,
              object_get_stock: object_or_null_get_stock_buy,
              integer_get_shares: ({
                object_stock_market,
                boolean_long,
                float_investment_capital,
                object_stock,
              }) =>
                integer_get_shares_buyable({
                  object_stock: object_stock,
                  float_cash: float_get_capital_left({
                    float_cash_invested:
                      object_stock_market.float_cash_invested,
                    float_investment_capital: float_investment_capital,
                  }),
                  boolean_long: boolean_long,
                }),
              integer_smoothing: integer_prices_average_length,
            });
      }
      // Update after market tick.
      await object_netscript.sleep(
        Math.max(
          1,
          object_constants.float_period_update_stock + integer_time - Date.now()
        )
      );
      integer_time = Date.now();
      object_stock_market = object_get_stock_market_updated_after_tick({
        object_stock_market: object_stock_market,
        integer_prices_average_length: integer_prices_average_length_double,
      });
      void_save_stocks(object_stock_market.object_stocks);
    }
  };

  await void_main();
};

