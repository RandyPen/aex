import { execa } from 'execa'
import pc from 'picocolors'
import type {
  AgentStatus,
  ComputeProvider,
  DeployResult,
  DeploySpec,
  LogOpts
} from './types.js'

/**
 * ArkhaiProvider — leases an on-chain VM from Arkhai's compute market and ships the agent onto it.
 *
 * Arkhai is on-chain VM leasing (GPU + CPU; Akash/vast.ai-like). The buyer CLI is `market`:
 *   market listing list
 *   market buy --gpu-model H200 --duration-hours 1 --price-markup 1.5   → SSH creds + vm_host_ip
 *   market escrow reclaim <escrow_uid>
 * Settlement is ERC-20 escrow via Alkahest + ERC-8004 (example USDC on Base Sepolia).
 *
 * WaaP seam: Arkhai's `market` CLI today reads a raw private_key from ~/.config/arkhai/buyer.toml.
 * The integration win is to sign the escrow lock with a WaaP split-key wallet instead. Two paths:
 *   (a) Arkhai exposes a buyer-side signer hook → `market` delegates signing to waap-cli  [clean]
 *   (b) we construct + WaaP-sign the escrow tx directly
 * (a) is the ask for Levi. Until it lands, `walletMode: 'buyer-toml'` uses Arkhai's own wallet so
 * the rest of the flow is demoable; `walletMode: 'waap'` is gated on the signer hook.
 */

export interface ArkhaiOptions {
  /** GPU model filter, e.g. "H200". Omit for CPU-only VMs. */
  gpuModel?: string
  gpuCountMin?: number
  vcpuMin?: number
  ramGbMin?: number
  diskGbMin?: number
  durationHours?: number
  /** Max price per hour in human units (e.g. 2 = $2/hr). */
  maxPrice?: number
  priceMarkup?: number
  /** Who signs the escrow lock. 'waap' requires the Arkhai signer hook (see class doc). */
  walletMode?: 'waap' | 'buyer-toml'
  /** Override the market binary (defaults to `market` on PATH). */
  bin?: string
  /** SSH identity for reaching the leased VM. */
  sshIdentity?: string
}

interface LeaseInfo {
  escrowUid: string
  vmHostIp: string
  sshPort: number
  sshUser: string
}

const DEFAULTS = { durationHours: 1, priceMarkup: 1.5, walletMode: 'buyer-toml' as const }

export class ArkhaiProvider implements ComputeProvider {
  readonly name = 'arkhai' as const
  private readonly opts: ArkhaiOptions

  constructor(opts: ArkhaiOptions = {}) {
    this.opts = { ...DEFAULTS, ...opts }
  }

  private get bin(): string {
    return this.opts.bin ?? 'market'
  }

  async preflight(): Promise<{ ok: boolean; detail?: string }> {
    try {
      await execa(this.bin, ['--version'], { reject: false })
      return { ok: true }
    } catch {
      return {
        ok: false,
        detail: `Arkhai \`${this.bin}\` CLI not found on PATH. Install it and configure ~/.config/arkhai/buyer.toml (or run with --dry-run).`
      }
    }
  }

  /**
   * Build the `market buy` argv from the lease options. Mirrors the documented buyer CLI
   * (docs/buyer-quickstart.md): `market buy --gpu-model … --duration-hours … --price-markup …`.
   * No `--json` flag is assumed — the CLI streams text and prints an `ssh … -p <port> user@ip`
   * line plus an escrow uid, which `parseLease` scrapes.
   */
  buildBuyArgs(): string[] {
    const o = this.opts
    const args = ['buy']
    if (o.gpuModel) args.push('--gpu-model', o.gpuModel)
    if (o.gpuCountMin != null) args.push('--gpu-count-min', String(o.gpuCountMin))
    if (o.vcpuMin != null) args.push('--vcpu-min', String(o.vcpuMin))
    if (o.ramGbMin != null) args.push('--ram-gb-min', String(o.ramGbMin))
    if (o.diskGbMin != null) args.push('--disk-gb-min', String(o.diskGbMin))
    args.push('--duration-hours', String(o.durationHours ?? DEFAULTS.durationHours))
    if (o.maxPrice != null) args.push('--max-price', String(o.maxPrice))
    args.push('--price-markup', String(o.priceMarkup ?? DEFAULTS.priceMarkup))
    return args
  }

  async deploy(spec: DeploySpec): Promise<DeployResult> {
    const buyArgs = this.buildBuyArgs()
    const notes: string[] = []
    if (this.opts.walletMode === 'waap') {
      notes.push(
        'walletMode=waap requires Arkhai buyer signer hook (delegate `market` signing to waap-cli). Confirm with Levi; falling back to escrow signed by buyer.toml for now is NOT done here.'
      )
    }

    if (spec.dryRun) {
      const sshTarget = 'tenant<id>@<vm_host_ip>'
      notes.unshift(
        `${pc.bold('1.')} ${this.bin} ${buyArgs.join(' ')}`,
        `${pc.bold('2.')} parse lease → escrowUid, vm_host_ip, ssh port/user`,
        `${pc.bold('3.')} rsync ${spec.source} → ${sshTarget}:~/agent`,
        `${pc.bold('4.')} ssh ${sshTarget} 'cd ~/agent && npm ci && (env ${envPreview(spec.env)} nohup node agent.js &)'`,
        `${pc.bold('escrow')} signed by: ${this.opts.walletMode === 'waap' ? 'WaaP wallet (split-key)' : 'buyer.toml key (legacy)'}`
      )
      return {
        provider: this.name,
        ref: 'dry-run-lease',
        host: '<vm_host_ip>',
        escrowUid: 'dry-run-escrow',
        deployedAt: new Date().toISOString(),
        notes
      }
    }

    // 1. Lease a VM on the Arkhai market (locks escrow on chain).
    const lease = await this.lease(buyArgs)
    notes.push(`leased ${lease.vmHostIp} (escrow ${lease.escrowUid})`)

    // 2. Ship the agent bundle to the VM and start it.
    await this.ship(lease, spec)
    notes.push('agent shipped and started')

    return {
      provider: this.name,
      ref: lease.escrowUid,
      host: lease.vmHostIp,
      escrowUid: lease.escrowUid,
      deployedAt: new Date().toISOString(),
      notes
    }
  }

  private async lease(buyArgs: string[]): Promise<LeaseInfo> {
    const { stdout } = await execa(this.bin, buyArgs)
    return parseLease(stdout)
  }

  private async ship(lease: LeaseInfo, spec: DeploySpec): Promise<void> {
    const id = this.opts.sshIdentity
    const sshBase = [
      ...(id ? ['-i', id] : []),
      '-p',
      String(lease.sshPort),
      '-o',
      'StrictHostKeyChecking=accept-new'
    ]
    const target = `${lease.sshUser}@${lease.vmHostIp}`
    // rsync the scaffolded project (the template ships a Dockerfile + agent entry).
    await execa('rsync', [
      '-az',
      '--exclude',
      'node_modules',
      '--exclude',
      '.env',
      '-e',
      `ssh ${sshBase.join(' ')}`,
      `${spec.source.replace(/\/?$/, '/')}`,
      `${target}:~/agent/`
    ])
    const envExport = Object.entries(spec.env)
      .map(([k, v]) => `${k}=${shellQuote(v)}`)
      .join(' ')
    const startCmd = `cd ~/agent && npm ci --omit=dev && (env ${envExport} nohup node agent.js > ~/agent/agent.log 2>&1 &)`
    await execa('ssh', [...sshBase, target, startCmd])
  }

  async stop(ref: string): Promise<void> {
    // Reclaiming the escrow releases the lease early (auto-refunds the unused remainder).
    await execa(this.bin, ['escrow', 'reclaim', ref], { reject: false })
  }

  async getStatus(ref: string): Promise<AgentStatus> {
    // `market escrow show` isn't a documented subcommand; probe it best-effort and infer from
    // text. Authoritative agent health comes from the AEX telemetry/dashboard, not from here.
    const { exitCode, stdout } = await execa(this.bin, ['escrow', 'show', ref], { reject: false })
    if (exitCode !== 0) return { state: 'unknown', detail: `escrow ${ref} status unavailable` }
    const active = /\b(active|ready|provisioned)\b/i.test(stdout)
    const ended = /\b(reclaimed|expired|refunded|closed)\b/i.test(stdout)
    if (active) return { state: 'running' }
    if (ended) return { state: 'stopped' }
    return { state: 'unknown' }
  }

  async getLogs(_ref: string, _opts?: LogOpts): Promise<string> {
    // Logs flow to the AEX dashboard via the telemetry contract; tailing the VM directly would
    // need the live SSH handle (recorded out of band). Left to a follow-up.
    return ''
  }
}

/**
 * Parse `market buy` output into a LeaseInfo. The documented CLI (docs/buyer-quickstart.md)
 * emits human text ending in an SSH line like:
 *   ssh -i ~/.ssh/mms_buyer_id_ed25519 -p 2222 tenant7@203.0.113.7
 * plus an escrow uid. If a future CLI gains `--json` we also accept a JSON object.
 */
export function parseLease(stdout: string): LeaseInfo {
  // JSON path (forward-compatible if the CLI adds structured output).
  try {
    const j = JSON.parse(stdout) as Record<string, unknown>
    const escrowUid = str(j.escrow_uid ?? j.escrowUid)
    const vmHostIp = str(j.vm_host_ip ?? j.vmHostIp ?? j.host)
    if (escrowUid && vmHostIp) {
      return {
        escrowUid,
        vmHostIp,
        sshPort: Number(j.ssh_port ?? j.sshPort ?? 22),
        sshUser: str(j.ssh_user ?? j.sshUser) || 'tenant'
      }
    }
  } catch {
    /* not JSON — scrape the text below */
  }

  // Text path: the documented `ssh … -p <port> <user>@<ip>` line carries host/port/user.
  const ssh = stdout.match(/ssh\b[^\n]*?-p\s+(\d+)\s+(\S+)@(\d{1,3}(?:\.\d{1,3}){3})/)
  const uid = stdout.match(/escrow[_\s-]?uid["':=\s]+([0-9a-fA-Fx]+)/i)?.[1]
  if (ssh) {
    return {
      escrowUid: uid ?? '',
      vmHostIp: ssh[3],
      sshPort: Number(ssh[1]),
      sshUser: ssh[2]
    }
  }
  // Last resort: a bare IP + escrow uid.
  const ip = stdout.match(/\b(\d{1,3}\.){3}\d{1,3}\b/)?.[0]
  if (ip && uid) return { escrowUid: uid, vmHostIp: ip, sshPort: 22, sshUser: 'tenant' }
  throw new Error(`Could not parse lease (no ssh line / vm_host_ip) from market output:\n${stdout.slice(0, 500)}`)
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : v == null ? '' : String(v)
}

function shellQuote(v: string): string {
  return `'${v.replace(/'/g, `'\\''`)}'`
}

function envPreview(env: Record<string, string>): string {
  const keys = Object.keys(env)
  if (keys.length === 0) return ''
  return keys.map((k) => `${k}=…`).join(' ')
}
