{
  "name": "{{projectPkgName}}",
  "version": "0.0.1",
  "private": true,
  "description": "WaaP agent scaffolded with @human.tech/create-agent-wallet",
  "type": "module",
  "scripts": {
    "dev": "tsx agent.ts",
    "start": "node --experimental-strip-types agent.ts",
    "docker:build": "docker build -t {{projectName}} .",
    "docker:run": "docker run --env-file .env {{projectName}}"
  },
  "engines": {
    "node": ">=20.0.0"
  },
  "dependencies": {
    "@human.tech/waap-cli": "^1.0.0",
    "dotenv": "^16.4.5",
    "execa": "^9.5.2"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "tsx": "^4.7.0",
    "typescript": "^5.0.4"
  }
}
