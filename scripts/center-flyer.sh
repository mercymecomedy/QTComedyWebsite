#!/usr/bin/env bash
# center-flyer.sh — center an event flyer's content vertically in its canvas.
#
# Why: posters often ship with uneven built-in borders (e.g. a featureless
# stage-floor strip at the bottom), which reads as lopsided whitespace on
# the site. This script measures where the "detail" actually is and shifts
# the content block so the whitespace above and below it is equal.
#
# How it measures: for each row it computes the mean absolute horizontal
# gradient (mean |I(x+1) - I(x)| over a grayscale copy). Rows of text,
# logos, and art have strong per-pixel contrast; featureless background
# (plain dark, smooth floor, spotlight glow) does not. First/last rows
# above --threshold define the content block; the shift is half the
# difference between bottom and top whitespace.
#
# How it shifts: the content is never resampled — the required padding is
# recreated by smearing the adjacent edge row, which preserves the poster's
# own background color/texture at the seam.
#
# Usage:
#   scripts/center-flyer.sh [--threshold N] [--measure] IMAGE [IMAGE...]
#     --threshold N  row detail threshold (default 3). Lower catches fainter
#                    art as content; higher ignores more.
#     --measure      print the measurements without modifying anything.
#
# Notes:
#   - Requires ImageMagick 7 (magick/identify on PATH).
#   - JPEG re-encodes on each run; prefer running against the
#     highest-quality source you have.
set -euo pipefail

threshold=3
measure=0
images=()

while [ $# -gt 0 ]; do
  case "$1" in
    --threshold) threshold="$2"; shift 2 ;;
    --measure) measure=1; shift ;;
    -*) echo "Unknown option: $1" >&2; exit 2 ;;
    *) images+=("$1"); shift ;;
  esac
done

if [ ${#images[@]} -eq 0 ]; then
  echo "Usage: $0 [--threshold N] [--measure] IMAGE [IMAGE...]" >&2
  exit 2
fi

for img in "${images[@]}"; do
  [ -f "$img" ] || { echo "Not found: $img" >&2; exit 1; }

  W=$(identify -format '%w' "$img")
  H=$(identify -format '%h' "$img")

  # "top bottom shift", shift > 0 means content sits high (move down).
  read -r top bottom shift <<< "$(magick "$img" -colorspace Gray -depth 8 txt:- | awk -v w="$W" -v h="$H" -v t="$threshold" '
    NR == 1 { next }
    {
      split($1, a, /[:,]/)
      x = a[1]; y = a[2]
      line = $0
      sub(/^[^(]*\(/, "", line)
      sub(/[),].*/, "", line)
      v[y * w + x] = line + 0
    }
    END {
      for (y = 0; y < h; y++) {
        s = 0
        for (x = 0; x < w - 1; x++) {
          d = v[y * w + x + 1] - v[y * w + x]
          if (d < 0) d = -d
          s += d
        }
        m[y] = s / (w - 1)
      }
      top = -1; bottom = -1
      for (y = 0; y < h && top < 0; y++) if (m[y] > t) top = y
      for (y = h - 1; y >= 0 && bottom < 0; y--) if (m[y] > t) bottom = y
      if (top < 0) { print "-1 -1 0"; exit }
      wsTop = top
      wsBottom = h - 1 - bottom
      diff = wsBottom - wsTop
      shift = (diff >= 0) ? int((diff + 1) / 2) : -int((-diff + 1) / 2)
      print top, bottom, shift
    }')"

  echo "$img: ${W}x${H} content rows $top..$bottom (whitespace top=$((top)) bottom=$((H - 1 - bottom))) shift=${shift}px"

  if [ "$measure" -eq 1 ] || [ "$shift" -eq 0 ]; then
    continue
  fi

  ext="${img##*.}"
  tmp="${img%.*}.centered.tmp.$ext"
  if [ "$shift" -gt 0 ]; then
    # Content sits high: extend the top edge, crop the same off the bottom.
    magick \( "$img" -crop "${W}x1+0+0" +repage -resize "${W}x${shift}!" \) \
      "$img" -append -crop "${W}x${H}+0+0" +repage -strip -quality 92 "$tmp"
  else
    # Content sits low: extend the bottom edge, crop the same off the top.
    n=$((-shift))
    magick "$img" \
      \( "$img" -crop "${W}x1+0+$((H - 1))" +repage -resize "${W}x${n}!" \) \
      -append -gravity South -crop "${W}x${H}+0+0" +repage -strip -quality 92 "$tmp"
  fi
  mv "$tmp" "$img"
  echo "$img: re-centered (see measurements above)"
done
