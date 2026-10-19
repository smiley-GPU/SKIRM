#!/usr/bin/env bash
# Screenshot the game in a set-up state, to look at a screen without playing to it.
# Usage: tools/shot.sh <state> [width] [height]
#   <state>  BACK (entry choice with Back), DOTS (breakdown and gear chip), FAIL (a failed roll), WAYS (ways past after a failure),
#            CLOSE (the window closing), ARCH (base with the archive), FILE (an archive file), TITLE (the title screen),
#            WORD (word of the dead on the board), STAND / STANDEND (a last stand, before and after the choice), MIA (barracks list and a rescue offer), HOME (a rescued operator in the debrief)
#   width/height default to 1280 x 1000. Prints where the picture was saved.
HERE="$(cd "$(dirname "$0")" && pwd)"
GAME="$HERE/../index.html"
CHROME="${CHROME:-/c/Program Files/Google/Chrome/Application/chrome.exe}"
WORK="$HERE/.work"; mkdir -p "$WORK" # scratch files: ignored by git
state="${1:-TITLE}"; w="${2:-1280}"; h="${3:-1000}"; png="$WORK/shot-$state-${w}.png"; prof="$WORK/sprof-$$"
if [ "$state" = "TITLE" ]; then url="file:///$(cygpath -m "$GAME")"; else
  page="$WORK/shot-$$.html"
  BASE="file:///$(cygpath -m "$HERE/..")/" # the copy lives in tools/.work: point it back at the repo for data/ and img/
  { sed '/^<\/body>/,$d' "$GAME" | sed "s|^<head>\$|<head><base href=\"$BASE\">|"; echo '<script>'; cat "$HERE/pages/shots.js"; echo '</script></body></html>'; } > "$page"
  url="file:///$(cygpath -m "$page")?test&shot=$state"; fi
"$CHROME" --headless=new --disable-gpu --hide-scrollbars --user-data-dir="$(cygpath -m "$prof")" --window-size=$w,$h --virtual-time-budget=8000 --screenshot="$(cygpath -m "$png")" "$url" 2>/dev/null
rm -rf "$prof" "${page:-}"
echo "$(cygpath -m "$png")"
