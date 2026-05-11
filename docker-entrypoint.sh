#!/usr/bin/env sh
set -eu

has_start_script="$(node -e "const p = require('./package.json'); process.stdout.write(p.scripts && p.scripts.start ? '1' : '0');")"

if [ "$has_start_script" = "1" ]; then
    exec npm start
fi

main_file="${MAIN_FILE:-$(node -e "const p = require('./package.json'); process.stdout.write(p.main || 'index.js');")}"

exec node "$main_file"
