import { z } from 'zod'

export const BalanceCacheSchema = z.object({
  value: z.string(),
  ts: z.string()
})

// ERC-8004 Identity Registry state per agent. v1.0.2 records intent only; on-chain mint
// happens once contracts are deployed (see core/erc8004.ts CONTRACTS_BY_CHAIN). Token ID is
// stored as a string to preserve full uint256 precision across JSON round-trips.
export const Erc8004StateSchema = z.object({
  status: z.enum(['pending', 'minted', 'failed']),
  intentChain: z.string(),
  intentRecordedAt: z.string(),
  registry: z.string().optional(),
  tokenId: z.string().optional(),
  agentURI: z.string().optional(),
  mintedAt: z.string().optional(),
  mintTxHash: z.string().optional(),
  lastError: z.string().optional()
})

// Where an agent is deployed. Recorded on the fleet entry after `aex-fleet deploy` so `ls`/`status`
// can show it and `stop` can find the handle. provider-native `ref` = lease/escrow uid (arkhai),
// pid (local), or systemd unit (hetzner).
export const DeploymentStateSchema = z.object({
  provider: z.enum(['arkhai', 'marlin-tee', 'local', 'hetzner-systemd']),
  ref: z.string(),
  host: z.string().optional(),
  escrowUid: z.string().optional(),
  status: z.enum(['running', 'stopped', 'crashed', 'unknown']).default('unknown'),
  deployedAt: z.string(),
  lastError: z.string().optional()
})

export const AgentEntrySchema = z.object({
  agentId: z.string(),
  templateId: z.string().optional(),
  chain: z.string().optional(),
  address: z.string().optional(),
  waapEmail: z.string().optional(),
  tags: z.array(z.string()).default([]),
  sessionRef: z.string().optional(),
  linkedTo: z.string().optional(),
  createdAt: z.string(),
  lastBalanceCache: BalanceCacheSchema.optional(),
  erc8004: Erc8004StateSchema.optional(),
  deployment: DeploymentStateSchema.optional()
})

export const FleetConfigSchema = z.object({
  version: z.literal(1),
  activeAgent: z.string().optional(),
  agents: z.record(z.string(), AgentEntrySchema).default({}),
  telemetry: z
    .object({
      neonDsn: z.string().optional()
    })
    .optional()
})

export type BalanceCache = z.infer<typeof BalanceCacheSchema>
export type Erc8004State = z.infer<typeof Erc8004StateSchema>
export type DeploymentState = z.infer<typeof DeploymentStateSchema>
export type AgentEntry = z.infer<typeof AgentEntrySchema>
export type FleetConfig = z.infer<typeof FleetConfigSchema>
