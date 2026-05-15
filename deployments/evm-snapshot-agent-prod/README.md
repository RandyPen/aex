# evm-snapshot-agent-prod

Live deployment of the snapshot-agent template on the aex host.

## Deployment record

| Field | Value |
|-------|-------|
| Template | `aex/agents/snapshot-agent/templates/standalone/` |
| Host | `aex` (`88.99.125.107`) |
| Path on host | `/home/agents/evm-snapshot-agent/` |
| systemd unit | `snapshot-agent.service` |
| Wallet | `0xf2e3Dd213796D61212764CAd87435B748f06Bb9E` |
| Chain | Ethereum (chainId `1`) |
| First deployed | Pending |

## Operations

```
ssh agents@88.99.125.107 'sudo systemctl status snapshot-agent --no-pager'
ssh agents@88.99.125.107 'tail -f /home/agents/logs/evm-snapshot-agent.stdout.log'
ssh agents@88.99.125.107 'sudo systemctl restart snapshot-agent'
```
