# rn-mobile-harness

Personal AI harness for React Native development — a growing collection of
Claude Code skills and subagents tailored to bare React Native + TypeScript
work. Built for personal use first; parts of it may later become a shared
product for other RN developers.

## Layout

```
skills/           Reusable, manually-invoked skills (Skill tool / slash commands)
  design-to-code/   Turn a design reference (Dribbble/Mobbin link, screenshot,
                    Figma frame) into a bare RN implementation plan + anti-slop
                    do/don't rules.
agents/           Subagent definitions (Agent tool) — specialized roles that
                    run with their own prompt and a fresh, unbiased view of
                    the code (no memory of how it was written).
  architecture-reviewer.md   Reviews RN code for structural/architectural
                    issues across five categories (see the agent file).
docs/             Working notes, research, decisions about the harness itself.
```

## How this is wired into Claude Code

This repo is the source of truth. It is symlinked into `~/.claude/` so every
local RN project can use these skills/agents without copying them:

```bash
ln -s ~/Documents/Harness/rn-mobile-harness/skills/design-to-code \
      ~/.claude/skills/design-to-code

ln -s ~/Documents/Harness/rn-mobile-harness/agents/architecture-reviewer.md \
      ~/.claude/agents/architecture-reviewer.md
```

Edit files here, commit, and the symlinked copies picked up by Claude Code
update automatically — no per-project copying.

## Roadmap

1. `design-to-code` skill — reference analysis -> bare RN UI implementation
   (in progress).
2. `architecture-reviewer` subagent — structural/architecture code review,
   functional categories only, no prescribed patterns (in progress).
3. Testing support (generation + maintenance of tests for components/logic)
   — planned after 1 and 2 are working well.
4. Eventually: package selected pieces as a product for other RN developers.
