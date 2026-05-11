#!/usr/bin/env bash
set -euo pipefail

script_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
cd "$script_dir"

if [[ ! -d node_modules ]]; then
    bash ./Install_NodeJS_Modules.sh
fi

if node -e "const p = require('./package.json'); process.exit(p.scripts && p.scripts.start ? 0 : 1)" 2>/dev/null; then
    exec npm start
fi

exec node "${MAIN_FILE:-index.js}"
