#!/usr/bin/env bash
# Assemble the free calculators site for deployment.
#
# Only the files listed below are published. The gated Book & Teacher
# Resources app in app/ is a separate Vercel project and never ships here,
# and neither do the repository's own files (README, workflows, scripts).
set -euo pipefail

out="dist"
rm -rf "$out"
mkdir -p "$out"

# Pages, the service worker, the PWA manifest and icons.
cp index.html sw.js manifest.webmanifest icon.svg icon-maskable.svg "$out/"

# Permanent QR addresses, and the printable codes themselves.
cp -R budget borrow savings tax qr "$out/"

echo "Published to $out/:"
ls -A "$out"
