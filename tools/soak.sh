#!/usr/bin/env bash
# Play the game headless with one of the soak bots and print what happened.
# Usage: tools/soak.sh <bot> [--full] [--seed N] [--patch 'sed expression']
#   <bot>    a file in tools/bots without .js: soak-5, soak-15, soak-random, soak-failways, soak-ways
#   --full   print every statistic the bot collects, not just the summary
#   --seed   first campaign seed (default 1000); other seeds give an independent sample
#   --patch  a sed expression applied to a copy of index.html first, to try a rule change without editing the game
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
GAME="$HERE/../index.html"
CHROME="${CHROME:-/c/Program Files/Google/Chrome/Application/chrome.exe}"
WORK="$HERE/.work"; mkdir -p "$WORK" # scratch files: ignored by git
bot="$1"; shift || true
[ -f "$HERE/bots/$bot.js" ] || { echo "No bot named '$bot'. Pick one of: $(cd "$HERE/bots" && ls *.js | sed 's/\.js//' | tr '\n' ' ')"; exit 1; }
full=0; seed=1000; patch='s/^//'
while [ $# -gt 0 ]; do case "$1" in --full) full=1;; --seed) seed="$2"; shift;; --patch) patch="$2"; shift;; esac; shift; done
page="$WORK/soak-$$.html"; prof="$WORK/prof-$$"
BASE="file:///$(cygpath -m "$HERE/..")/" # the copy lives in tools/.work: point it back at the repo for data/ and img/
{ sed '/^<\/body>/,$d' "$GAME" | sed "s|^<head>\$|<head><base href=\"$BASE\">|" | sed "$patch"; echo "<script>window.SOAK_SEED = $seed;</script><script>"; cat "$HERE/bots/$bot.js"; echo '</script></body></html>'; } > "$page"
out=$("$CHROME" --headless=new --disable-gpu --user-data-dir="$(cygpath -m "$prof")" --virtual-time-budget=60000 --dump-dom "file:///$(cygpath -m "$page")?test" 2>/dev/null | sed -n '/<pre id="soak">/,/<\/pre>/p' | tr -d ' \n')
rm -rf "$page" "$prof"
[ -n "$out" ] || { echo "The bot printed nothing: the page probably failed to load or threw before the end."; exit 1; }
if [ "$full" = 1 ]; then echo "$out"; exit 0; fi
# the summary: missions and wins, KIA/MIA, wins by mission number, why missions failed, overtime and QRF outcomes,
# campaigns that ran out of fit operators, launches the rules refused (random bot), and real errors
echo "$out" | grep -o -E '"(missions|wins|kia|mia|noTeam|refused)":[0-9]+|"(byN|why)":\{[^}]*\}|"(qrfW|ot)":\[[^]]*\]|"errors":\[[^]]{0,400}' | tr '\n' ' '; echo
