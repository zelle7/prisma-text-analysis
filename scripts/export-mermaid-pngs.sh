#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INPUT_DIR="$ROOT_DIR/docs/mermaid"
OUTPUT_DIR="$ROOT_DIR/docs/images"
PUPPETEER_CONFIG="$ROOT_DIR/scripts/puppeteer-mermaid-config.json"

MMDC="$ROOT_DIR/node_modules/.bin/mmdc"
if [ ! -x "$MMDC" ]; then
  echo "Error: local mermaid-cli not found at $MMDC"
  echo "Install it with: npm install"
  exit 1
fi

mkdir -p "$OUTPUT_DIR"

for file in "$INPUT_DIR"/*.mmd; do
  [ -e "$file" ] || continue
  name="$(basename "$file" .mmd)"
  out="$OUTPUT_DIR/$name.png"
  echo "Exporting $file -> $out"
  "$MMDC" -i "$file" -o "$out" -b transparent -p "$PUPPETEER_CONFIG"
 done

echo "Done. PNGs written to $OUTPUT_DIR"
