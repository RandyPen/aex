{
  "name": "{{projectPkgName}}",
  "version": "0.0.1",
  "private": true,
  "description": "Portfolio rebalancer / grid trading agent on Sui via Cetus DEX -- WaaP CLI",
  "type": "module",
  "scripts": {
    "dev": "tsx agent.ts",
    "start": "tsx agent.ts"
  },
  "engines": {
    "node": ">=20.0.0"
  },
  "dependencies": {
    "@cetusprotocol/aggregator-sdk": "^0.3.0",
    "@cetusprotocol/cetus-sui-clmm-sdk": "^5.4.0",
    "@human.tech/waap-cli": "^1.0.0",
    "@mysten/sui": "^1.14.0",
    "bn.js": "^5.2.1",
    "dotenv": "^16.4.5",
    "execa": "^9.5.2",
    "tslib": "^2.8.1",
    "tsx": "^4.7.0"
  },
  "devDependencies": {
    "@types/bn.js": "^5.1.5",
    "@types/node": "^20.0.0",
    "typescript": "^5.0.4"
  }
}
