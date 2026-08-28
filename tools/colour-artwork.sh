#!/usr/bin/env bash
# Turn a coloured drawing into a sprite for src/assets. The sibling of
# tools/bake-artwork.sh, which flattens a drawing into a CSS mask: here nothing
# is thrown away, because the drawing is wanted for the colours it was drawn in.
# Run via `just ring` or `just bloom`.
#
#   tools/colour-artwork.sh <source.png> [out-name] [height] [weight] [angle]
#     source     the artwork, drawn on transparency
#     out-name   file written to src/assets (default: shape-ring-colour-horizontal.png)
#     height     height of the sprite in px (default: 300, a few times the
#                size the site shows it at — it is a picture, not a mask, so
#                every pixel costs)
#     weight     px each line grows outward, at the sprite's own size
#                (default: 0, i.e. left as drawn); see "Weight" below
#     angle      degrees to turn the drawing by, or `auto` (the default) to
#                find the angle that lays it level; see "Angle" below
#
# ---- Angle ----
# The ring and the bloom both stand at an angle the site does not hang them at.
# Rather than hard-code it, find it: turning a drawing until its bounding box is
# at its widest and shortest is turning it until its long axis is level, which
# lands the ring on its side and the bloom on the orientation the site's masks
# were baked in. Coarse pass first, then a degree-by-degree one around the
# winner, both on a small copy — the full-resolution turn happens once, at the
# end.
#
# Not every drawing wants that, though: one hung as a pair either side of
# something is turned by the CSS that places it, and wants to come out of here
# in the orientation it was drawn in. Passing an angle skips the search and
# turns by exactly that much, so `0` means "as drawn".
#
# ---- Weight ----
# A line drawing shrunk to the size of a bloom is mostly gone: a stroke a few
# pixels wide in a 4000px drawing averages away to nothing. So grow the lines
# before shrinking them — but grow them without draining their colour, which
# is what dilating the pixels themselves would do, since taking the brightest
# neighbour of each channel walks every stroke towards white. Laying the
# drawing over shifted copies of itself instead keeps every stroke the colour
# it was drawn: eight directions, so a stroke grows evenly on all sides, and
# the copy that lands on a given pixel is one from a stroke's own neighbourhood.
# Done at three times the finished size, so the shrink still smooths the edges.
#
# Needs ImageMagick.
set -euo pipefail

SRC="${1:?usage: colour-artwork.sh <source.png> [out-name] [height] [weight]}"
OUT_NAME="${2:-shape-ring-colour-horizontal.png}"
HEIGHT="${3:-300}"
WEIGHT="${4:-0}"
ANGLE_IN="${5:-auto}"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$ROOT/src/assets/$OUT_NAME"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

WORK=$((HEIGHT * 3))
SPREAD=$(( (WEIGHT * WORK + HEIGHT / 2) / HEIGHT ))  # weight, in working pixels

# How wide-and-flat the drawing sits when turned by $1 degrees. Measured on the
# ink alone: the drawing carries a soft shadow that would otherwise pad — and
# lopside — the box it is measured in.
flatness() {
  magick "$TMP/small.png" -background none -rotate "-$1" \
    -channel A -threshold 50% +channel -trim +repage \
    -format "%[fx:w/h]" info:
}

best() { sort -rn | head -1 | cut -d' ' -f2; }

if [[ "$ANGLE_IN" == "auto" ]]; then
  magick "$SRC" -background none -resize 700x "$TMP/small.png"
  COARSE="$(for a in $(seq 0 5 179); do echo "$(flatness "$a") $a"; done | best)"
  ANGLE="$(for a in $(seq "$((COARSE - 5))" "$((COARSE + 5))"); do echo "$(flatness "$a") $a"; done | best)"
else
  ANGLE="$ANGLE_IN"
fi

# Turned level and cropped to the box the ink itself occupies.
magick "$SRC" -background none -rotate "-$ANGLE" "$TMP/laid.png"
BOX="$(magick "$TMP/laid.png" -channel A -threshold 50% +channel \
  -trim -format "%wx%h%O" info:)"
magick "$TMP/laid.png" -crop "$BOX" +repage -resize "x$WORK" "$TMP/work.png"

# Grown by laying the drawing over eight shifted copies of itself. The border
# is what the copies shift into, and is the same width on every side, so the
# drawing stays centred in it.
if (( SPREAD > 0 )); then
  magick "$TMP/work.png" -bordercolor none -border "$SPREAD" \
    \( +clone -roll "+$SPREAD+0" \) -composite \( +clone -roll "-$SPREAD+0" \) -composite \
    \( +clone -roll "+0+$SPREAD" \) -composite \( +clone -roll "+0-$SPREAD" \) -composite \
    \( +clone -roll "+$SPREAD+$SPREAD" \) -composite \( +clone -roll "-$SPREAD-$SPREAD" \) -composite \
    \( +clone -roll "+$SPREAD-$SPREAD" \) -composite \( +clone -roll "-$SPREAD+$SPREAD" \) -composite \
    "$TMP/grown.png"
else
  cp "$TMP/work.png" "$TMP/grown.png"
fi

magick "$TMP/grown.png" -resize "x$HEIGHT" -strip "$OUT"

magick "$OUT" -format "$OUT_NAME  (%wx%h, $(basename "$SRC"), turned ${ANGLE}deg)\n" info:
