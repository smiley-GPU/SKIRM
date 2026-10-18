#!/usr/bin/env bash
# Run a soak bot over three independent seed sets at once and print one combined line:
# success overall and by stretch of the campaign, KIA/MIA per deployment, and teams lost entirely.
# One run of soak-15 is only 12 campaigns (about +-10 points per mission number); three runs make differences readable.
# Usage: tools/sweep.sh [bot] [--patch 'sed expression']     (bot defaults to soak-15)
HERE="$(cd "$(dirname "$0")" && pwd)"
WORK="$HERE/.work"; mkdir -p "$WORK" # scratch files: ignored by git
bot="${1:-soak-15}"; [ $# -gt 0 ] && shift
args=("$@")
for s in 2000 3000 4000; do bash "$HERE/soak.sh" "$bot" --seed $s "${args[@]}" > "$WORK/sweep-$$-$s.txt" & done
wait
cat "$WORK"/sweep-$$-*.txt | awk -v bot="$bot" '{
  if (match($0,/"missions":[0-9]+/)) m+=substr($0,RSTART+11,RLENGTH-11);
  if (match($0,/"wins":[0-9]+/)) w+=substr($0,RSTART+7,RLENGTH-7);
  if (match($0,/"kia":[0-9]+/)) k+=substr($0,RSTART+6,RLENGTH-6);
  if (match($0,/"mia":[0-9]+/)) x+=substr($0,RSTART+6,RLENGTH-6);
  if (match($0,/"allLost":[0-9]+/)) al+=substr($0,RSTART+10,RLENGTH-10);
  if (match($0,/"noTeam":[0-9]+/)) nt+=substr($0,RSTART+9,RLENGTH-9);
  if ($0 ~ /"errors":\["/) errs++;
  s=$0; while (match(s,/"[0-9]+":\[[0-9]+,[0-9]+,[0-9]+\]/)) { t=substr(s,RSTART,RLENGTH); s=substr(s,RSTART+RLENGTH); split(t,a,/[":\[,\]]+/); n=a[2]; b=(n<=4)?1:(n<=10)?2:3; W[b]+=a[3]; T[b]+=a[4]; }
} END {
  if (!m) { print "No results: check tools/soak.sh " bot " on its own."; exit 1 }
  printf "%s: %d/%d ops succeeded (%.0f%%)", bot, w, m, 100*w/m;
  if (T[1]) printf " | missions 1-4 %.0f%%", 100*W[1]/T[1]; if (T[2]) printf " | 5-10 %.0f%%", 100*W[2]/T[2]; if (T[3]) printf " | 11-15 %.0f%%", 100*W[3]/T[3];
  printf " | KIA %d MIA %d (%.1f%% of about %d deployments) | teams lost %d | campaigns ended with nobody fit %d%s\n", k, x, 100*(k+x)/(m*4), m*4, al, nt, errs ? " | some runs reported errors: run soak.sh to see them" : "";
}'
rm -f "$WORK"/sweep-$$-*.txt
