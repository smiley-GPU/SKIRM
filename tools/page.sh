#!/usr/bin/env bash
# Run one of the test pages against index.html and report its checks.
# Usage: tools/page.sh <test> [--all]
#   <test>  a file in tools/pages without .js: quirktest, u3test, uitest, oitest, saytest, negtest, waytest
#   --all   print every line, not only the summary and the checks that did not pass
# Exit status is 1 when a check fails or the page throws.
HERE="$(cd "$(dirname "$0")" && pwd)"
GAME="$HERE/../index.html"
CHROME="${CHROME:-/c/Program Files/Google/Chrome/Application/chrome.exe}"
WORK="$HERE/.work"; mkdir -p "$WORK" # scratch files: ignored by git
t="$1"
[ -f "$HERE/pages/$t.js" ] || { echo "No test page named '$t'. Pick one of: $(cd "$HERE/pages" && ls *.js | sed 's/\.js//' | grep -v '^shots$' | tr '\n' ' ')"; exit 1; }
page="$WORK/page-$$.html"; prof="$WORK/pprof-$$"
BASE="file:///$(cygpath -m "$HERE/..")/" # the copy lives in tools/.work: point it back at the repo for data/ and img/
{ sed '/^<\/body>/,$d' "$GAME" | sed "s|^<head>\$|<head><base href=\"$BASE\">|"; echo '<script>'; cat "$HERE/pages/$t.js"; echo '</script></body></html>'; } > "$page"
out=$("$CHROME" --headless=new --disable-gpu --user-data-dir="$(cygpath -m "$prof")" --virtual-time-budget=20000 --dump-dom "file:///$(cygpath -m "$page")?test" 2>/dev/null | sed -n '/<pre id="[a-z0-9]*">/,/<\/pre>/p' | sed 's/^.*<pre id="[a-z0-9]*">//; s/<\/pre>.*$//')
rm -rf "$page" "$prof"
[ -n "$out" ] || { echo "$t: the page printed nothing (it probably failed to load)."; exit 1; }
if [ "$2" = "--all" ]; then echo "$out"; fi
pass=$(echo "$out" | grep -c '^PASS'); bad=$(echo "$out" | grep '^FAIL\|^ERROR')
echo "$t: $pass passed$( [ -n "$bad" ] && echo ", $(echo "$bad" | wc -l) failed")"
[ -n "$bad" ] && { echo "$bad"; exit 1; }
exit 0
