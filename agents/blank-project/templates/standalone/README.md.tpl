# {{projectName}}

WaaP agent scaffolded with `@human.tech/create-agent-wallet`.

## Prerequisites

- Node.js 20+
- `@human.tech/waap-cli` installed (globally or available on PATH)
- A WaaP session — run `waap-cli signup` if you don't have one

## Run locally

```bash
cp .env.example .env
npm install
npm run dev
```

## Run in Docker

```bash
docker compose up --build
```

## Customize

Edit `agent.ts`. The current implementation signs a single message and exits —
replace it with a polling loop, event listener, or whatever your agent needs.

See the [WaaP CLI reference](https://docs.waap.xyz/cli) for the full command
set available inside `agent.ts` via `execa('waap-cli', [...])`.
