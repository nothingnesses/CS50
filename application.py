import os

from cs50 import SQL
from flask import Flask, flash, jsonify, redirect, render_template, request, session
from flask_session import Session
from tempfile import mkdtemp
from werkzeug.exceptions import default_exceptions, HTTPException, InternalServerError
from werkzeug.security import check_password_hash, generate_password_hash

from helpers import apology, login_required, lookup, usd

# Configure application
app = Flask(__name__)

# Ensure templates are auto-reloaded
app.config["TEMPLATES_AUTO_RELOAD"] = True

# Ensure responses aren't cached


@app.after_request
def after_request(response):
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Expires"] = 0
    response.headers["Pragma"] = "no-cache"
    return response


# Custom filter
app.jinja_env.filters["usd"] = usd

# Configure session to use filesystem (instead of signed cookies)
app.config["SESSION_FILE_DIR"] = mkdtemp()
app.config["SESSION_PERMANENT"] = False
app.config["SESSION_TYPE"] = "filesystem"
Session(app)

# Configure CS50 Library to use SQLite database
db = SQL("sqlite:///finance.db")

# Make sure API key is set
if not os.environ.get("API_KEY"):
    raise RuntimeError("API_KEY not set")


def create_table_shares():
    # # Using generated column syntax for `total` would've been better here, but CS50 uses an old version of `sqlite3` (3.22.0 2018-01-22 18:45:57 0c55d179733b46d8d0ba4d88e01a25e10677046ee3da1d5b1581e86726f2alt1), so it's not possible.
    # db.execute("CREATE TABLE IF NOT EXISTS shares ( share_id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL UNIQUE, user_id INTEGER NOT NULL, symbol TEXT NOT NULL, name TEXT NOT NULL, price_share_average REAL NOT NULL, shares INTEGER NOT NULL, total REAL AS (price_share_average*shares), FOREIGN KEY(user_id) REFERENCES users(id), FOREIGN KEY(symbol) REFERENCES stocks(symbol), FOREIGN KEY(name) REFERENCES stocks(name) )")
    db.execute("CREATE TABLE IF NOT EXISTS shares ( share_id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL UNIQUE, user_id INTEGER NOT NULL, symbol TEXT NOT NULL, name TEXT NOT NULL, price_share_average REAL NOT NULL, shares INTEGER NOT NULL, total REAL NOT NULL, FOREIGN KEY(user_id) REFERENCES users(id), FOREIGN KEY(symbol) REFERENCES stocks(symbol), FOREIGN KEY(name) REFERENCES stocks(name) )")


def create_table_stocks():
    db.execute("CREATE TABLE IF NOT EXISTS stocks( symbol_id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, symbol TEXT NOT NULL UNIQUE, name TEXT NOT NULL UNIQUE )")


# Create transactions table if required. `buy_or_sell`: 0 = buy, 1 = sell.
def create_table_transactions():
    db.execute("CREATE TABLE IF NOT EXISTS transactions ( transaction_id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL UNIQUE, user_id INTEGER NOT NULL, symbol TEXT NOT NULL, price_share REAL NOT NULL, shares INTEGER NOT NULL, time_stamp TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL, FOREIGN KEY(user_id) REFERENCES users(id), FOREIGN KEY(symbol) REFERENCES stocks(symbol) )")


def stocks_usd(stock):
    return {
        "symbol": stock["symbol"],
        "name": stock["name"],
        "shares": stock["shares"],
        "price_share_average": usd(stock["price_share_average"]),
        "total": usd(stock["total"])
    }


def transactions_usd(transaction):
    return {
        "symbol": transaction["symbol"],
        "shares": transaction["shares"],
        "price_share": usd(transaction["price_share"]),
        "time_stamp": transaction["time_stamp"]
    }


@app.route("/")
@login_required
def index():
    """Show portfolio of stocks"""
    user_id = session["user_id"]
    cash = db.execute("SELECT * FROM users WHERE id = :user_id", user_id=user_id)[0]["cash"]
    cash_usd = usd(cash)
    # Create shares table if required
    create_table_shares()
    stocks = db.execute("SELECT * FROM shares WHERE user_id = :user_id AND shares > 0", user_id=user_id)
    if not stocks:
        return render_template("portfolio.html", stocks=(), cash=cash_usd, total=cash_usd)
    else:
        return render_template("portfolio.html", stocks=map(stocks_usd, stocks), cash=cash_usd, total=usd(cash + db.execute("SELECT SUM(total) FROM shares WHERE user_id = :user_id", user_id=user_id)[0]["SUM(total)"]))


@app.route("/buy", methods=["GET", "POST"])
@login_required
def buy():
    """Buy shares of stock"""
    # need to add other tables to keep track of what stock was bought, how many shares was bought, who bought the stock

    # User reached route via POST (as by submitting a form via POST)
    if "POST" == request.method:

        symbol_input = request.form.get("symbol")

        # Ensure symbol was submitted
        if not symbol_input:
            return apology("must provide symbol", 403)

        string_shares_to_add = request.form.get("shares")

        # Ensure shares was submitted
        if not string_shares_to_add:
            return apology("must provide shares", 403)

        shares_to_add = int(string_shares_to_add)

        # Ensure shares are greater than 0
        if 0 >= shares_to_add:
            return apology("shares must be > 0", 403)

        quote = lookup(symbol_input)

        if not quote:
            return apology("symbol was not recognised", 403)

        # Create stocks table if it doesn't exist
        create_table_stocks()

        # Add stock to database if it doesn't have an entry
        symbol = quote["symbol"]
        name = quote["name"]
        if 0 == db.execute("SELECT COUNT(*) FROM stocks WHERE symbol = :symbol", symbol=symbol)[0]["COUNT(*)"]:
            db.execute("INSERT INTO stocks (symbol, name) VALUES (?, ?)", symbol, name)

        user_id = session["user_id"]
        cash = db.execute("SELECT * FROM users WHERE id = :user_id", user_id=user_id)[0]["cash"]
        price_share_current = quote["price"]
        cost = price_share_current * shares_to_add

        if cash < cost:
            return apology("you have insufficient funds", 403)

        # Create transactions table if required.
        create_table_transactions()

        # Record transaction
        db.execute("INSERT INTO transactions (user_id, symbol, price_share, shares) VALUES (?, ?, ?, ?)",
                   user_id, symbol, price_share_current, shares_to_add)

        # Create shares table if required
        create_table_shares()

        # Create stock entry if it doesn't exists, or update it if it does
        stock = db.execute("SELECT * FROM shares WHERE symbol = :symbol AND user_id = :user_id", symbol=symbol, user_id=user_id)
        if 0 == len(stock):
            db.execute("INSERT INTO shares (user_id, symbol, name, price_share_average, shares, total) VALUES (?, ?, ?, ?, ?, ?)",
                       user_id, symbol, name, price_share_current, shares_to_add, price_share_current * shares_to_add)
        else:
            shares_current = stock[0]["shares"]
            shares_total = shares_current + shares_to_add
            price_share_average = ((shares_current * stock[0]["price_share_average"]) + price_share_current) / shares_total
            db.execute("UPDATE shares SET price_share_average = ?, shares = ?, total = ? WHERE user_id = ? AND symbol = ?",
                       price_share_average, shares_total, price_share_average * shares_total, user_id, symbol)

        # Update cash
        db.execute("UPDATE users SET cash = ? WHERE id = ?", cash - cost, user_id)

        return redirect("/")

    # User reached route via GET (as by clicking a link or via redirect)
    else:
        return render_template("buy.html")


@app.route("/history")
@login_required
def history():
    """Show history of transactions"""
    # Create transactions table if required
    create_table_transactions()
    transactions = db.execute("SELECT * FROM transactions WHERE user_id = :user_id", user_id=session["user_id"])
    if not transactions:
        return render_template("history.html", transactions=())
    else:
        return render_template("history.html", transactions=map(transactions_usd, transactions))


@app.route("/login", methods=["GET", "POST"])
def login():
    """Log user in"""

    # Forget any user_id
    session.clear()

    # User reached route via POST (as by submitting a form via POST)
    if request.method == "POST":

        # Ensure username was submitted
        if not request.form.get("username"):
            return apology("must provide username", 403)

        # Ensure password was submitted
        elif not request.form.get("password"):
            return apology("must provide password", 403)

        # Query database for username
        rows = db.execute("SELECT * FROM users WHERE username = :username",
                          username=request.form.get("username"))

        # Ensure username exists and password is correct
        if len(rows) != 1 or not check_password_hash(rows[0]["hash"], request.form.get("password")):
            return apology("invalid username and/or password", 403)

        # Remember which user has logged in
        session["user_id"] = rows[0]["id"]

        # Redirect user to home page
        return redirect("/")

    # User reached route via GET (as by clicking a link or via redirect)
    else:
        return render_template("login.html")


@app.route("/logout")
def logout():
    """Log user out"""

    # Forget any user_id
    session.clear()

    # Redirect user to login form
    return redirect("/")


@app.route("/quote", methods=["GET", "POST"])
@login_required
def quote():
    """Get stock quote."""

    # User reached route via POST (as by submitting a form via POST)
    if "POST" == request.method:

        symbol = request.form.get("symbol")

        # Ensure symbol was submitted
        if not symbol:
            return apology("must provide symbol", 403)

        quote = lookup(symbol)

        if not quote:
            return apology("symbol was not recognised", 403)

        return render_template("quoted.html", name=quote["name"], price=quote["price"], symbol=quote["symbol"])

    # User reached route via GET (as by clicking a link or via redirect)
    else:
        return render_template("quote.html")


@app.route("/register", methods=["GET", "POST"])
def register():
    """Register user"""

    # User reached route via POST (as by submitting a form via POST)
    if request.method == "POST":

        # Ensure username was submitted
        username = request.form.get("username")

        if not username:
            return apology("must provide username", 403)

        # Ensure username is available
        if 1 >= db.execute("SELECT COUNT(*) FROM users WHERE username = :username",
                           username=username)[0]["COUNT(*)"]:
            return apology("username taken, please choose a different one", 403)

        password = request.form.get("password")

        # Ensure password was submitted
        if not password:
            return apology("must provide password", 403)

        confirmation = request.form.get("confirmation")

        # Ensure confirmation was submitted
        if not confirmation:
            return apology("must provide password confirmation", 403)

        # Ensure password == confirmation
        if not password == confirmation:
            return apology("password and confirmation must be equal", 403)

        # Store new user into database
        db.execute("INSERT INTO users (username, hash) VALUES (?, ?)", username, generate_password_hash(password))

        # Redirect user to home page
        return redirect("/")

    # User reached route via GET (as by clicking a link or via redirect)
    else:
        return render_template("register.html")


@app.route("/sell", methods=["GET", "POST"])
@login_required
def sell():
    """Sell shares of stock"""
    # need to add other tables to keep track of what stock was bought, how many shares was bought, who bought the stock

    # User reached route via POST (as by submitting a form via POST)
    if "POST" == request.method:

        symbol_input = request.form.get("symbol")

        # Ensure symbol was submitted
        if not symbol_input:
            return apology("must provide symbol", 403)

        string_shares_to_remove = request.form.get("shares")

        # Ensure shares was submitted
        if not string_shares_to_remove:
            return apology("must provide shares", 403)

        shares_to_remove = int(string_shares_to_remove)

        # Ensure shares are greater than 0
        if 0 >= shares_to_remove:
            return apology("shares must be > 0", 403)

        quote = lookup(symbol_input)

        if not quote:
            return apology("symbol was not recognised", 403)

        symbol = quote["symbol"]

        # Create shares table if required
        create_table_shares()

        user_id = session["user_id"]
        stock = db.execute("SELECT * FROM shares WHERE symbol = :symbol AND user_id = :user_id", symbol=symbol, user_id=user_id)

        if 0 >= len(stock) or 0 >= stock[0]["shares"]:
            return apology("no shares of this stock owned", 403)

        price_share_current = quote["price"]

        shares_current = stock[0]["shares"]
        if shares_to_remove > shares_current:
            return apology("can't sell more shares than amount owned", 403)
        shares_total = shares_current - shares_to_remove

        # Record transaction
        db.execute("INSERT INTO transactions (user_id, symbol, price_share, shares) VALUES (?, ?, ?, ?)",
                   user_id, symbol, price_share_current, shares_to_remove * -1)

        # Update stock entry
        if shares_total <= 0:
            db.execute("UPDATE shares SET price_share_average = ?, shares = ?, total = ? WHERE user_id = ? AND symbol = ?",
                       0, 0, 0, user_id, symbol)
        else:
            db.execute("UPDATE shares SET shares = ?, total = ? WHERE user_id = ? AND symbol = ?",
                       shares_total, stock[0]["price_share_average"] * shares_total, user_id, symbol)

        # Update cash
        db.execute("UPDATE users SET cash = ? WHERE id = ?", db.execute("SELECT * FROM users WHERE id = :user_id",
                                                                        user_id=user_id)[0]["cash"] + price_share_current * shares_to_remove, user_id)

        return redirect("/")

    # User reached route via GET (as by clicking a link or via redirect)
    else:
        stocks_owned = db.execute("SELECT symbol FROM shares WHERE user_id = :user_id AND shares > 0", user_id=session["user_id"])
        if 0 >= len(stocks_owned):
            return render_template("sell.html", symbols=())
        else:
            return render_template("sell.html", symbols=stocks_owned)


@app.route("/transfer", methods=["GET", "POST"])
@login_required
def transfer():
    """Transfer cash."""

    # User reached route via POST (as by submitting a form via POST)
    if "POST" == request.method:

        string_cash = request.form.get("cash")

        # Ensure cash amount was submitted
        if not string_cash:
            return apology("must provide an amount", 403)

        # Update cash
        user_id = session["user_id"]
        db.execute("UPDATE users SET cash = ? WHERE id = ?", db.execute(
            "SELECT * FROM users WHERE id = :user_id", user_id=user_id)[0]["cash"] + float(string_cash), user_id)

        return redirect("/")

    # User reached route via GET (as by clicking a link or via redirect)
    else:
        return render_template("transfer.html")


def errorhandler(e):
    """Handle error"""
    if not isinstance(e, HTTPException):
        e = InternalServerError()
    return apology(e.name, e.code)


# Listen for errors
for code in default_exceptions:
    app.errorhandler(code)(errorhandler)
