Output docs/assets/cli-scan.gif

Require node

Set Shell "zsh"
Set FontSize 24
Set Width 1120
Set Height 620
Set Padding 18
Set BorderRadius 10
Set WindowBar Colorful
Set Theme "Catppuccin Mocha"
Set TypingSpeed 28ms

Hide
Type "rm -rf /tmp/tokentrace-vhs-scan"
Enter
Type "export TOKENTRACE_HOME=/tmp/tokentrace-vhs-scan"
Enter
Type "alias tokentrace='node bin/tokentrace.js'"
Enter
Type "clear"
Enter
Show

Type "tokentrace scan fixtures/generic-jsonl --json"
Enter
Sleep 4s
