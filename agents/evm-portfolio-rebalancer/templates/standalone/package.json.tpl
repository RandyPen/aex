{
  "name": "{{projectPkgName}}",
  "version": "0.0.1",
  "private": true,
  "description": "Portfolio rebalancer / grid trading agent — WaaP CLI + EVM (Base)",
  "type": "module",
  "scripts": {
    "dev": "tsx agent.ts",
    "start": "node --experimental-strip-types agent.ts"
  },
  "engines": {
    "node": ">=20.0.0"
  },
  "dependencies": {
    "@human.tech/waap-cli": "^1.0.0",
    "dotenv": "^16.4.5",
    "execa": "^9.5.2",
    "viem": "^2.21.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "tsx": "^4.7.0",
    "typescript": "^5.0.4"
  }
}
