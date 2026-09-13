#!/usr/bin/env bash
# Produce a printable PDF of the technical guide.
#
#   bash scripts/guide-pdf/build.sh
#
# Writes TECHNICAL-GUIDE.pdf next to the Markdown. Both arguments are optional:
#   build.sh [source.md] [output.pdf]
#
# Nothing here is part of either website. The calculators build publishes an
# explicit list of files that does not include scripts/, and this folder keeps
# its own package.json so Playwright never lands in the site's dependencies.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
root="$(cd "$here/../.." && pwd)"

# Both arguments are resolved against the directory the caller was standing in,
# because this script cds into its own folder before running node. Without this,
# a relative argument would be checked here and then looked for over there.
abspath() {
  case "$1" in
    /*) printf '%s\n' "$1" ;;
    *)  printf '%s\n' "$PWD/$1" ;;
  esac
}

src="$(abspath "${1:-$root/TECHNICAL-GUIDE.md}")"
out="$(abspath "${2:-$root/TECHNICAL-GUIDE.pdf}")"
html="$here/.guide.html"
err="$here/.render-error"
trap 'rm -f "$html" "$err"' EXIT

[ -f "$src" ] || { echo "No such file: $src" >&2; exit 1; }

cd "$here"

if [ ! -d node_modules/playwright ]; then
  echo "Installing Playwright (first run only)…"
  npm install --no-audit --no-fund
fi

node md2html.js "$src" "$html"

# Playwright needs a copy of Chromium. Some machines already have one; where it
# is missing Playwright says so plainly, and that is the only case worth
# downloading a browser for.
if ! node render.js "$html" "$out" 2>"$err"; then
  if grep -q "Executable doesn't exist" "$err"; then
    echo "Downloading Chromium (first run only)…"
    npx --yes playwright install chromium
    node render.js "$html" "$out"
  else
    cat "$err" >&2
    exit 1
  fi
fi
