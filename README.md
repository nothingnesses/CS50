# Bitburner Scripts

Scripts for the game [Bitburner](https://github.com/danielyxie/bitburner). These may contain spoilers for the game and some probably won't work properly until sufficient in-game progress has been made to unlock some requirements.

---

## Installation

### Semi-automatic Installation
1. Install [Node](https://nodejs.org/en/download/package-manager/).
2. Clone this repository to a local directory.
3. From a terminal/command prompt, navigate to that directory, run `npm install` (to install dependencies), then `npm start` (to start the install server).
4. In-game, save the "nicoty.bin.installer.js" (2.6 GB) file to the root directory of a rooted server (one with at least enough RAM to run "nicoty.sbin.hacker.js", e.g. "foodnstuff"), then run it without any extra arguments, i.e., with `run nicoty.bin.installer.js`.
5. Exit from `npm` (i.e., using `Ctrl-C` if ran from a POSIX-compliant terminal).

### Manual Installation
1. Save all the `.js` files in this repository that have ".lib." in their name to the root directory of a rooted server (one with at least enough RAM to run "nicoty.sbin.hacker.js", e.g. "foodnstuff") using the same filenames that they currently have in this repository.
2. Do the same for the rest of the `.js` files in the repository.

### Post-installation
At the start of a new game or just after resetting, run `run nicoty.sbin.botnet.js 0.001` to increase the RAM available for the scripts and increase the available hackable servers, then `run nicoty.bin.kill.js` (to kill any currently running scripts).

---

## Syntax and Terminology
Some understanding of the syntax and terminology used in this document may be required to be able to properly use the scripts. The following are brief explanations about these.
* Flags = Parameters that turn particular features on or off.
* Options = Parameters which accept a particular value.
* Optional parameters/values = Indicated by values delimited by square-brackets (i.e, "[" and "]"). These are parameters which can be left out when invoking a script.
* Required parameters/values = Values delimited by angle-brackets (i.e., "<" and ">"). These are parameters which must be present when invoking a script.
* Executable scripts = Scripts with "bin" (but not "sbin") in their name. These can and are meant to be manually ran by the user.
* System executable scripts = Scripts with "sbin" in their name. These can be manually run by the user, but are generally meant to be ran automatically by other scripts.
* Library scripts = Scripts with "lib" in their name. These can't be run by the user and instead export functions or procedures to be shared with and used by other scripts.

---

## Overview
The following section is an overview of what the executable scripts are supposed to do, as well as usage information and examples for each one.

### "nicoty.bin.main.js" (6.9 GB)
  * Reserve at least enough RAM to be able to run "nicoty.sbin.hacker.js" (13.35 GB).
  * Copy all scripts to all rooted servers.
  * Run the helper scripts "nicoty.sbin.ram.js"\* (6.6 GB), "nicoty.sbin.servers.js" (8.85 GB), "nicoty.sbin.tor.js"\* (3.8 GB), "nicoty.sbin.programs.js"\* (3.7 GB), "nicoty.sbin.botnet.js" (2.2 GB) and "nicoty.sbin.weaken.manager.js" (4.2 GB) which should, respectively, attempt to:
    * Upgrade your home server's RAM.
    * Buy and replace old servers when appropriate.
    * Buy a TOR Router.
    * Buy programs from the dark web.
    * Exploit and root servers.
    * Run a variable amount of "nicoty.sbin.weaken.cyclic.js" threads (1.75 GB) which gains hacking experience by continuously weakening the server that will be targeted by "nicoty.sbin.hacker.js".
  * Kill itself by spawning "nicoty.sbin.hacker.js" which should then:
    * Make and execute a schedule containing information about when, where and how many threads (among other information) the "weaken.js", "grow.js" and "hack.js" worker scripts should be executed with. The schedule is generated such that all the jobs will be ran pretty much concurrently, but will sleep for some time such that each one finishes running just after the previous one in the schedule finishes.
    * Wait for a duration of time such that jobs in a new schedule will start finishing just after the older schedule finishes.
    * Repeat.
  * \* = SourceFile-4 required for these to properly function.

#### USAGE
  `run nicoty.bin.main.js [FLAGS ...] [OPTIONS ...]`

#### FLAGS
  `-a, --no-ram`

  * Prevents the "nicoty.sbin.ram.js" script from being started which is responsible for upgrading the RAM of the "home" server.

  `-b, --no-botnet`

  * Prevents the "nicoty.sbin.botnet.js" script from being started which is responsible for rooting servers in the network.

  `-e, --no-servers`

  * Prevents the "nicoty.sbin.servers.js" script from being started which is responsible for buying and replacing bought servers.

  `-g, --no-programs`

  * Prevents the "nicoty.sbin.programs.js" script from being started which is responsible for buying programs from the "darkweb" server.

  `-h, --help`

  * Displays a help message then exits.

  `-o, --no-tor`

  * Prevents the "nicoty.sbin.tor.js" script from being started which is responsible for buying a TOR Router.

  `-q, --normal`

  * Use mean-normalised correction for the server scoring system instead of standard correction.

  `-u, --no-weaken-manager`

  * Prevents the "nicoty.sbin.weaken.manager.js" script from being started which is responsible for running threads of "nicoty.bin.weaken.cyclic.js" to gain hacking experience.

#### OPTIONS
  `-c, --check-delay <SECONDS>`

  * SECONDS = The duration of delay between each repeat of the helper scripts' main loops, in seconds. Should be a floating-point number > 0. Defaults to 10.

  `-d, --job-delay <SECONDS>`

  * SECONDS = The duration of delay between each job, in seconds. Should be a floating-point number > 0. Defaults to 2.

  `-i, --target <SERVER>`

  * SERVER = The server that should be targetted by the `weaken`, `grow` and `hack` functions. Should be a string. Defaults to choosing an optimal target using a scoring system based on the server's maximum cash, growth, required hacking level, and the player's current hacking level.

  `-j, --job-cap <CAP>`

  * CAP = The maximum amount of jobs to execute per schedule. Should be an integer > 0. Defaults to 100.

  `-n, --server-name <NAME>`

  * NAME = The name to be used for purchased servers. Should be a string. Defaults to "server".

  `-p, --precision <PRECISION>`

  * PRECISION = A value used in determining how many cycles of bisection the binary search algorithm used for the percentage to steal calculator should use. Should be a floating point number > 0 <= 1. Values closer to 0 will result in greater precision in the calculation, but potentially longer run-times and compared to values closer to 1. Defaults to 0.01.

  `-r, --ram-utilisation <THRESHOLD>`

  * THRESHOLD = The botnet's ram utilisation threshold after which upgrades/replacements should be bought for servers and the RAM of "home". Should be a floating point number >= 0 <= 1. Values closer to 0 will result in attempting more frequent upgrades/replacements at the cost of less efficient RAM utilisation to cash spenditure ratios. Defaults to 0.9.

  `-s, --steal-cap <CAP>`

  * CAP = The maximum fraction of cash to steal from the target server per `hack` job. Should be a floating point number >= 0 <=1. Defaults to 0.9.

  `-k, --multiplier-skill <FLOAT>`

  * FLOAT = The multiplier used to change the weight of the factor representing your skill against the target server used in the server scoring system. Should be a floating point number. 1 = factor has normal importance, > 1 = factor has more importance, < 1 = factor has less importance, 0 = factor is not used, < 0 = factor has negative effect. Defaults to 1.

  `-l, --multiplier-cash <FLOAT>`

  * FLOAT = The multiplier used to change the weight of the factor representing the target server's maximum cash used in the server scoring system. Should be a floating point number. 1 = factor has normal importance, > 1 = factor has more importance, < 1 = factor has less importance, 0 = factor is not used, < 0 = factor has negative effect. Defaults to 1.

  `-m, --multiplier-growth <FLOAT>`

  * FLOAT = The multiplier used to change the weight of the factor representing the target server's growth used in the server scoring system. Should be a floating point number. 1 = factor has normal importance, > 1 = factor has more importance, < 1 = factor has less importance, 0 = factor is not used, < 0 = factor has negative effect. Defaults to 1.

  `-v, --ram-cyclic-weaken <FLOAT>`

  * FLOAT = The fraction of the botnet's current available RAM to be used by "nicoty.sbin.weaken.manager.js" to run threads of "nicoty.sbin.weaken.cyclic.js". Should be a floating point number > 0. Defaults to 0.5.

#### EXAMPLES
  `run nicoty.bin.main.js`

  * Runs the script using default values.

  `run nicoty.bin.main.js -aof --no-botnet --job-cap 1000 -i harakiri-sushi -r 0.7 --steal-cap 0.5 -q`

  * Runs the script with up to 1000 jobs per schedule, targetting "harakiri-sushi", only upgrading/replacing servers when at least 0.7 of your network's total RAM is being used, stealing only up to 50% of harakiri-sushi's cash per "hack" job that finishes executing, and using the "mean normalised" score correction method, whilst the remaining variables are set to defaults. The "nicoty.sbin.ram.js", "nicoty.sbin.tor.js" and "nicoty.sbin.botnet.js" helper scripts are also prevented from starting.

---

### "nicoty.bin.kill.js" (2.55 GB)
  * Kill all running scripts.
  * Optionally, kill only named scripts instead.
  * Optionally, kill only scripts on named servers instead.
  * Optionally, kill only named scripts on named servers instead.

#### USAGE
  `run nicoty.bin.kill.js [FLAGS ...] [OPTIONS ...]`

#### FLAGS
  `-h, --help`

  * Displays a help message then exits.

#### OPTIONS
  `-c, --script <SCRIPT>`

  * SCRIPT = The name of a script to kill.

  `-e, --server <SERVER>`

  * SERVER = The name of a server on which scripts will be killed.

#### EXAMPLES
  `run nicoty.bin.kill.js`

  * Kills all running scripts.

  `run nicoty.bin.kill.js -c nicoty.sbin.grow.js --script nicoty.sbin.hack.js`

  * Kills all scripts named "nicoty.sbin.grow.js" and "nicoty.sbin.hack.js" on any servers that they are currently running on.

  `run nicoty.bin.kill.js -e home --server harakiri-sushi`

  * Kills all scripts currently running on the "home" and "harakiri-sushi" servers.

  `run nicoty.bin.kill.js -c nicoty.sbin.grow.js --script nicoty.sbin.hack.js -e home --server harakiri-sushi`

  * Kills all scripts named "nicoty.sbin.grow.js" and "nicoty.sbin.hack.js" currently running on the "home" and "harakiri-sushi" servers.

---

### "nicoty.bin.hacknet.js" (5.6 GB)
  * Buys Hacknet nodes and upgrades them until the highest gain rate increase per cost ratio of the possible upgrades are below a given threshold.

#### USAGE
  `run nicoty.bin.hacknet.js [FLAGS ...] [OPTIONS ...]`

#### FLAGS
  `-h, --help`

  * Displays a help message then exits.

#### OPTIONS
  `-d, --delay <SECONDS>`

  * SECONDS = The duration of delay between each loop iteration, in seconds. Should be a floating-point number >= 0.001. Defaults to 1.

  `-r, --ratio <FLOAT>`

  * FLOAT = A value used in determining if the script should continue buying new Hacknet nodes/upgrades for these. Should be a floating point number >= 0. Higher values indicates a greater threshold so less upgrades/new nodes will be bought. Defaults to 0.0005.

---

### "nicoty.bin.stocks.js" (8.9 GB)
  * Starts stock-trading related scripts. Requires TIX API access.

#### USAGE
  `run nicoty.bin.stocks.js [FLAGS ...] [OPTIONS ...]`

#### FLAGS
  `-h, --help`

  * Displays this message then exits.

  `-n, --no-trade`

  * Prevents the "nicoty.sbin.stock.trader.js" script from trading right after it's spawned.

#### OPTIONS
  `-c, --investment-capital <FRACTION>`

  * FRACTION = The fraction of your total cash (invested + not invested in the stock market) that can be used to invest in the stock market. Should be a floating point number > 0 <= 1. Defaults to 1.

  `-d, --delay <SECONDS>`

  * SECONDS = The duration of delay between each repeat of the helper scripts' main loops, in seconds. Should be a floating-point number > 0. Defaults to 10.

  `-r, --range <RANGE>`

  * RANGE = The length of the stock objects' average price array used to calculate the short range simple moving average of the stock's average price growth. Should be an integer >= 1. Defaults to 10.

---

### "nicoty.bin.gui.js" (1.6 GB)
  * Exposes a GUI that can be used to control other scripts.

#### USAGE
  `run nicoty.bin.gui.js [FLAGS ...]`

#### FLAGS
  `-h, --help`

  * Displays this message then exits.

---

### "nicoty.bin.contracts.js" (22.05 GB)
  * Attempts to solve existing coding contracts in the network.

#### USAGE
  `run nicoty.bin.contracts.js [FLAGS ...] [OPTIONS]`

#### FLAGS
  `-h, --help`

  * Displays a help message then exits.

  `-v, --verbose`

  * If set, displays messages regarding successful attempts (in addition to standard failed attempt messages).

#### OPTIONS
  `-d, --delay <SECONDS>`

  * SECONDS = The duration of delay between each network-wide contract search and solve attempts, in seconds. Should be a floating-point number >= 0.001. By default, the script will only search for and attempt to solve contracts once, unless this option is manually set.

---

### "nicoty.bin.rm.js" (3.05 GB)
  * Removes all removable files (which excludes currently running scripts, including this one).
  * Optionally, removes only files whose names match a given regular expression.
  * Optionally, removes only files on servers whose names match a given regular expression.
  * Optionally, removes only files whose names match a given regular expression on servers whose names match a given regular expression.

#### USAGE
  `run nicoty.bin.rm.js [FLAGS ...] [OPTIONS]`

#### FLAGS
  `-h, --help`

  * Displays a help message then exits.

  `-a, --all`

  * Whether or not all or only some regular expressions should be matched. By default, only some regular expressions will be matched, unless this flag is set.

#### OPTIONS
  `-e, --server <REGEX>`

  * REGEX = Regular expression used for server names.

  `-f, --file <REGEX>`

  * REGEX = Regular expression used for filenames.

#### EXAMPLES
  `run nicoty.bin.rm.js`

  * Removes all removable files.

  `run nicoty.bin.rm.js -f txt --file lit`

  * Removes all files with filenames that match the regular expressions "txt" and "lit".

  `run nicoty.bin.rm.js -e home --server harakiri-sushi`

  * Removes all files from servers whose names match the regular expressions "home" and "harakiri-sushi".

  `run nicoty.bin.rm.js -f txt --file lit -e home --server harakiri-sushi`

  * Removes all files with filenames that match the regular expressions "txt" and "lit" from servers whose names match the regular expressions "home" and "harakiri-sushi".

  `run nicoty.bin.rm.js -a -e ^((?!home).)*$ -f ^((?!cct).)*$ -f ^((?!exe).)*$ -f ^((?!lit).)*$ -f ^((?!msg).)*$ -f ^((?!txt).)*$`

  * Removes all files from all servers, except for those in servers that have "home" in their name, and are files that have "cct", "exe", "lit", "msg" or "txt" in their name.

---

### "nicoty.bin.lshw.js" (7.35 GB)
  * Display information about one or more servers.
  * Optionally, display the information at regular intervals.

#### USAGE
  `run nicoty.bin.lshw.js [FLAGS ...] [OPTIONS ...] <ARGUMENT [ARGUMENT ...]>`

  * ARGUMENT = Server to display the information about.

#### FLAGS
  `-h, --help`

  * Displays a help message then exits.

  `-q, --normal`

  * Use mean-normalised correction for the server scoring system instead of standard correction.

#### OPTIONS
  `-d, --delay <SECONDS>`

  * SECONDS = The duration of delay between updates, in seconds. Should be a floating-point number >= 0.001. By default, the script will only display server information once, unless this option is manually set.

  `-k, --multiplier-skill <FLOAT>`

  * FLOAT = The multiplier used to change the weight of the factor representing your skill against the target server used in the server scoring system. Should a floating point number. 1 = factor has normal importance, > 1 = factor has more importance, < 1 = factor has less importance, 0 = factor is not used, < 0 = factor has negative effect. Defaults to 1.

  `-l, --multiplier-cash <FLOAT>`

  * FLOAT = The multiplier used to change the weight of the factor representing the target server's maximum cash used in the server scoring system. Should a floating point number. 1 = factor has normal importance, > 1 = factor has more importance, < 1 = factor has less importance, 0 = factor is not used, < 0 = factor has negative effect. Defaults to 1.

  `-m, --multiplier-growth <FLOAT>`

  * FLOAT = The multiplier used to change the weight of the factor representing the target server's growth used in the server scoring system. Should a floating point number. 1 = factor has normal importance, > 1 = factor has more importance, < 1 = factor has less importance, 0 = factor is not used, < 0 = factor has negative effect. Defaults to 1.

  `-p, --precision <INTEGER>`

  * INTEGER = The decimal places to display floating point values with. Should be an integer >= 0. Defaults to 2.

#### EXAMPLES
  `run nicoty.bin.lshw.js -d 1 --precision 4 home foodnstuff`

  * Causes the terminal to output up-to-date information about the "home" and "foodnstuff" servers every second, using 4 decimal places for the floating point values it displays.

---

### "nicoty.bin.cp.js" (2.65 GB)
  * Copy all files that contain particular substring(s) in their filenames from all servers to the current server.

#### USAGE
  `run nicoty.bin.cp.js [FLAGS ...] <ARGUMENT [ARGUMENT ...]>`

  * ARGUMENT = Substring contained in the names of files to be copied to the current server.

#### FLAGS
  `-h, --help`

  * Displays a help message then exits.

#### EXAMPLES
  `run nicoty.bin.cp.js .lit .script .txt`

  * Copies all files that contain the strings ".lit", ".script" or ".txt" in their filename from all servers to the current server.

---

## Troubleshooting

### "nicoty.sbin.hacker.js" does not seem to run!
  * Make sure there is enough RAM for "nicoty.sbin.hacker.js" (see requirements in the "Overview" section above) on the server that you ran "nicoty.bin.main.js" from. Sometimes, "nicoty.sbin.weaken.manager.js" will run "nicoty.sbin.weaken.cyclic.js" on that server so you might need to look out for and kill any instances of the latter that get executed on that server before "nicoty.sbin.hacker.js" has a chance to get spawned.

### I'm encountering "Invalid argument for thread count passed into exec()." or "Dynamic RAM usage calculated to be greater than initial RAM usage..." errors!
  * Sometimes the game doesn't calculate the RAM requirements of scripts properly which can occur if the scripts weren't loaded into the game in the correct order. The scripts which other scripts depend on need to be installed before installing the dependent scripts. Try opening and resaving the dependent scripts using `nano` to allow the game to properly calculate the scripts' RAM requirements.

### I've followed the exact instructions above but I'm still encountering some other issue!
  * [Post about it in the repository's discussion page](https://nest.pijul.com/nicoty/bitburner_scripts/discussions) or contact me through Matrix (@nicoty:matrix.org) or Reddit (u/VoidNoire). Make sure your message contains the following information:
    * How you installed the scripts.
    * The exact command that you ran prior to encountering the issue.
    * The server from which you ran the command.
    * The amount of free RAM that the server has.
    * The outcome you expected.
    * The actual outcome that occurred instead (including exact error messages).

### I want to ask some questions about how the scripts work/the game in general!
  * [See if this discussion about the hacking strategy used answers your questions](https://web.archive.org/web/20201010181949/https://old.reddit.com/r/Bitburner/comments/g2ry1t/can_someone_explain_traditional_hacking_loop/). If it doesn't, feel free to contact me through one of the channels above.

---

## License
This software is distributed and licensed under the terms of the [Blue Oak Model License 1.0.0](https://web.archive.org/web/20190309191626/https://blueoakcouncil.org/license/1.0.0) and uses code adapted from third party sources that are distributed and licensed under their own terms (see LICENSE-OTHERS).

### Contribution
Unless you explicitly state otherwise, any contribution submitted for inclusion in this software by you shall be licensed as above, without any additional terms or conditions.
