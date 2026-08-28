#!/usr/bin/env bash
# Bake a flat outline drawing into a silhouette PNG for use as a CSS mask,
# the same way tools/bake-shape.sh does for pieces of the 3D model. Run via
# `just artwork`.
#
#   tools/bake-artwork.sh <source.png> [out-name] [height]
#     source     the artwork, ink on any background (transparent or white)
#     out-name   file written to src/assets (default: shape-ring.png)
#     height     height of the baked mask in px (default: 900, as the others)
#
# The artwork is a line drawing — two ellipses, one inside the other — and at
# the size a button shows it those lines all but disappear. What survives is the
# form they enclose, so what gets baked is the band between them, filled.
#
# Finding that band: the ink splits the page into three regions — the paper
# around the drawing, the band, and the hole in the middle. The one touching the
# edge of the page is the paper. Of the two left, the band is the one whose
# bounding box is bigger, since it wraps around the hole. Everything else is
# left transparent.
#
# Needs ImageMagick.
set -euo pipefail

SRC="${1:?usage: bake-artwork.sh <source.png> [out-name] [height]}"
OUT_NAME="${2:-shape-ring.png}"
HEIGHT="${3:-900}"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$ROOT/src/assets/$OUT_NAME"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# The ink, whichever way the source carries it: white lines on black.
magick "$SRC" -background white -alpha remove -alpha off \
  -colorspace Gray -threshold 50% -negate "$TMP/ink.png"

# Every region the ink encloses, largest bounding box first. Regions are the
# white ones in the negative, i.e. the black ones here.
regions() {
  magick "$TMP/ink.png" -negate \
    -define connected-components:verbose=true \
    -define connected-components:area-threshold=1000 \
    -connected-components 4 null: 2>&1 |
    awk '$NF ~ /^(gray\(255\)|srgb\(255,255,255\))$/ { split($2, g, /[x+]/); print g[1] * g[2], $2, $3 }' |
    sort -rn
}

WIDTH_HEIGHT="$(magick "$TMP/ink.png" -format "%wx%h" info:)"
# The paper is the region as big as the page itself; the band is the next one.
BAND="$(regions | awk -v page="$WIDTH_HEIGHT" '$2 !~ "^" page "\\+0\\+0$" { print $3; exit }')"
[[ -n "$BAND" ]] || { echo "no enclosed region found in $SRC" >&2; exit 1; }
SEED_X="${BAND%%,*}"
SEED_Y="${BAND##*,}"

# Fill everything that is not the band away, then put the ink back so the band
# keeps the outline that drew it.
magick "$TMP/ink.png" -negate -fuzz 10% -fill black \
  -draw "color 0,0 floodfill" \
  -draw "color ${SEED_X%.*},${SEED_Y%.*} floodfill" "$TMP/band.png"
magick "$TMP/band.png" "$TMP/ink.png" -compose Lighten -composite "$TMP/mask.png"

# The mask is carried in the alpha channel, on white, trimmed to the drawing —
# the same shape the baked model pieces come out in.
magick "$TMP/mask.png" -trim +repage -resize "x$HEIGHT" \
  \( +clone -fill white -colorize 100 \) +swap \
  -alpha off -compose CopyOpacity -composite -strip "$OUT"

magick "$OUT" -format "$OUT_NAME  (%wx%h, $(basename "$SRC"))\n" info:
