# {{projectName}} (Claude runtime)

Claude Code skill scaffolded with `@human.tech/create-agent-wallet`.

## Files

| File | Purpose |
|---|---|
| `SKILL.md` | Skill definition discovered by Claude Code |
| `CLAUDE.md` | Project context loaded into Claude's window |
| `mcp-config.json` | MCP server config for the WaaP MCP wrapper |
| `.env.example` | Copy to `.env` for any project-specific secrets |

## Use it

1. Open this folder in Claude Code (or any skill-aware agent host).
2. Ask Claude: *"Sign the message 'hello' with my wallet"* — it uses the
   instructions in `SKILL.md` to shell out to `waap-cli`.

## Reference

{{recipeUrl}}
