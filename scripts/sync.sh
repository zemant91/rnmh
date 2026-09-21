#!/usr/bin/env bash
# Sync skills/ and agents/ from this repo into ~/.claude, one item at a time.
#
# Safe by design: only touches the destination paths that correspond to this
# repo's own skill folders / agent files (e.g. ~/.claude/skills/design-to-code,
# ~/.claude/agents/architecture-reviewer.md). It never touches anything else
# already living in ~/.claude/skills or ~/.claude/agents.
#
# Usage: ./scripts/sync.sh   (run from anywhere; run once after every change
# to a file under skills/ or agents/ in this repo)

set -euo pipefail

HARNESS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLAUDE_DIR="$HOME/.claude"

mkdir -p "$CLAUDE_DIR/skills" "$CLAUDE_DIR/agents"

sync_item() {
  local src="$1" dest="$2"
  if [ -d "$src" ]; then
    mkdir -p "$dest"
    if command -v rsync >/dev/null 2>&1; then
      rsync -a --delete "$src/" "$dest/"
    else
      rm -rf "$dest"
      cp -R "$src" "$dest"
    fi
  else
    cp "$src" "$dest"
  fi
}

synced_skills=()
if [ -d "$HARNESS_DIR/skills" ]; then
  for path in "$HARNESS_DIR"/skills/*/; do
    [ -d "$path" ] || continue
    name="$(basename "$path")"
    sync_item "$path" "$CLAUDE_DIR/skills/$name"
    synced_skills+=("$name")
  done
fi

synced_agents=()
if [ -d "$HARNESS_DIR/agents" ]; then
  for path in "$HARNESS_DIR"/agents/*; do
    [ -e "$path" ] || continue
    name="$(basename "$path")"
    sync_item "$path" "$CLAUDE_DIR/agents/$name"
    synced_agents+=("$name")
  done
fi

echo "Synced from $HARNESS_DIR to $CLAUDE_DIR:"
echo "  skills: ${synced_skills[*]:-(none)}"
echo "  agents: ${synced_agents[*]:-(none)}"
