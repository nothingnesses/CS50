# CS50

My solutions to problems I was tasked to solve in the CS50 course I took in the Summer of 2020. The solutions to each of the problems are stored in their own individual branch in this repository.

---

## Formatting

CS50 had this somewhat annoying formatting style that I had to adhere to which was checked by a program called `style50`. Fortunately, `style50` was open-source, so I was able to figure out which formatters and settings it used behind the scenes. I wrote some shell aliases that I used to automatically format my code to get those sweet sweet style points. Just run the following command in the CS50 terminal:

```shell
printf "%s" '
alias fmtc50="astyle --ascii --add-braces --break-one-line-headers --align-pointer=name --pad-comma --unpad-paren --pad-header --pad-oper --max-code-length=132 --convert-tabs --indent=spaces=4 --indent-continuation=1 --indent-switches --lineend=linux --min-conditional-indent=1 --options=none --style=allman"
alias fmtpython50="autopep8 --max-line-length 132 --ignore-local-config -i"
alias fmtjava50="astyle --ascii --add-braces --break-one-line-headers --align-pointer=name --pad-comma --unpad-paren --pad-header --pad-oper --max-code-length=132 --convert-tabs --indent=spaces=4 --indent-continuation=1 --indent-switches --lineend=linux --min-conditional-indent=1 --options=none --style=allman --mode=java --style=java"
' >> "${HOME}/.bash_profile" && . "${HOME}/.bash_profile"
```

This sets the aliases `fmtc50`, `fmtpython50` and `fmtjava50` for formatting C, Python and Java source codes in compliance with `style50`, respectively. You can then call these aliases from any directory in the virtual machine, for example with the command `fmtc50 ~/pset1/cash/cash.c` to format the "cash.c" C source file. Just for safety, it might be a good idea to backup your files before running them though.

---

## License

This software is distributed and licensed under the terms of the [Blue Oak Model License 1.0.0](https://web.archive.org/web/20190309191626/https://blueoakcouncil.org/license/1.0.0).