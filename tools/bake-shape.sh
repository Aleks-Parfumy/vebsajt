#!/usr/bin/env bash
# Bake one piece of the intro model into a silhouette PNG for use as a CSS mask
# (the sidebar buttons). Run via `just shape [piece]`.
#
#   tools/bake-shape.sh [piece] [out-name]
#     piece      node name in the GLB (default: Curve002)
#     out-name   file written to src/assets (default: shape-flower.png)
#
# Needs chromium. WebGL in headless chromium only works with
# --enable-unsafe-swiftshader, which is why that flag is here.
set -euo pipefail

PIECE="${1:-Curve002}"
OUT_NAME="${2:-shape-flower.png}"
PORT=8765

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$ROOT/src/assets/$OUT_NAME"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"; [[ -n "${SERVER_PID:-}" ]] && kill "$SERVER_PID" 2>/dev/null || true' EXIT

# The page loads the GLB over HTTP, so serve the repo on a scratch port.
python3 -m http.server "$PORT" -d "$ROOT" >/dev/null 2>&1 &
SERVER_PID=$!
for _ in {1..50}; do
  curl -sf -o /dev/null "http://localhost:$PORT/tools/bake-shape.html" && break
  sleep 0.1
done

URL="http://localhost:$PORT/tools/bake-shape.html?piece=$PIECE"

# The model is ~14MB; a headless run occasionally dumps the DOM before the
# loader finishes, so retry until the data URL shows up.
for attempt in 1 2 3; do
  chromium --headless --disable-gpu --enable-unsafe-swiftshader \
    --virtual-time-budget=45000 --dump-dom "$URL" >"$TMP/dom.html" 2>/dev/null || true
  # The page reports its state in <title>: "ready …" or "error".
  grep -qE '<title>(ready|error)' "$TMP/dom.html" && break
  echo "attempt $attempt: model did not finish loading, retrying…" >&2
done

python3 - "$TMP/dom.html" "$OUT" <<'PY'
import base64, re, sys

dom = open(sys.argv[1]).read()
# Read only what the page put in #out, so the script's own source can't match.
out_div = re.search(r'<div id="out">(.*?)</div>', dom, re.S)
payload = out_div.group(1).strip() if out_div else ''
title = re.search(r'<title>([^<]*)</title>', dom)
title = title.group(1) if title else '?'

if payload.startswith('ERROR:'):
    sys.exit(payload)
m = re.match(r'data:image/png;base64,([A-Za-z0-9+/=]+)$', payload)
if not m:
    sys.exit('no image produced — check that chromium can create a WebGL context')

open(sys.argv[2], 'wb').write(base64.b64decode(m.group(1)))
print(f'{sys.argv[2]}  ({title})')
PY
