#!/usr/bin/env sh
# Build and run SKIRM with nothing but a JDK (17+).
#   ./run.sh                 start the server on http://localhost:8080
#   ./run.sh --port 9000 --seed 42
#   ./run.sh test            run the headless smoke test instead
set -e
cd "$(dirname "$0")"
JAVAC="${JAVA_HOME:+$JAVA_HOME/bin/}javac"
JAVA="${JAVA_HOME:+$JAVA_HOME/bin/}java"

rm -rf out
"$JAVAC" --release 17 -d out $(find src -name '*.java')

if [ "$1" = "test" ]; then
  exec "$JAVA" -cp out skirm.SmokeTest
fi
exec "$JAVA" -cp out skirm.Main "$@"
