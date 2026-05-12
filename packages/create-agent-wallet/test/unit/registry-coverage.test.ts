import { describe, it, expect } from 'vitest'
import { readdir, stat, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { ActivitySchema, ALL_RUNTIMES } from '../../src/registry/types.js'

// Monorepo layout: agents/ at repo root; fallback to legacy registry/activities.
import { existsSync } from 'node:fs'
const monorepoAgents = resolve(__dirname, '../../../../agents')
const legacyRegistry = resolve(__dirname, '../../registry/activities')
const REGISTRY = existsSync(monorepoAgents) ? monorepoAgents : legacyRegistry

// OpenClaw + Nous runtimes both use the AgentSkills open standard
// (agentskills.io) — a plain SKILL.md is all they need.
const REQUIRED_FILES_PER_RUNTIME: Record<string, string[]> = {
  claude: [
    'SKILL.md.tpl',
    'CLAUDE.md.tpl',
    'mcp-config.json.tpl',
    'dot-env.example'
  ],
  standalone: [
    'package.json.tpl',
    'agent.ts.tpl',
    'Dockerfile',
    'dot-env.example'
  ],
  openclaw: ['SKILL.md.tpl', 'dot-env.example', 'README.md.tpl'],
  nous: ['SKILL.md.tpl', 'dot-env.example', 'README.md.tpl']
}

async function listActivities(): Promise<string[]> {
  const entries = await readdir(REGISTRY, { withFileTypes: true })
  const dirs = entries.filter((e) => e.isDirectory()).map((e) => e.name)
  // Only include directories that have activity.json (filters out non-activity dirs
  // like sui-cetus-yield in the monorepo agents/ directory).
  const activities: string[] = []
  for (const d of dirs) {
    if (existsSync(resolve(REGISTRY, d, 'activity.json'))) {
      activities.push(d)
    }
  }
  return activities
}

describe('registry coverage', () => {
  it('ships 6 activities', async () => {
    const activities = await listActivities()
    expect(activities.sort()).toEqual([
      'blank-project',
      'cetus-yield-agent',
      'evm-uniswap-rebalancer',
      'morpho-yield-agent',
      'polymarket-agent',
      'snapshot-agent'
    ])
  })

  it('every activity.json validates against the schema', async () => {
    const activities = await listActivities()
    for (const slug of activities) {
      const path = resolve(REGISTRY, slug, 'activity.json')
      const raw = JSON.parse(await readFile(path, 'utf8'))
      const result = ActivitySchema.safeParse(raw)
      if (!result.success) {
        throw new Error(`${slug}: ${result.error.message}`)
      }
      expect(result.data.slug).toBe(slug)
    }
  })

  it('every activity declares all 4 runtimes', async () => {
    const activities = await listActivities()
    for (const slug of activities) {
      const raw = JSON.parse(
        await readFile(resolve(REGISTRY, slug, 'activity.json'), 'utf8')
      )
      const runtimes = raw.runtimes as string[]
      for (const r of ALL_RUNTIMES) {
        expect(runtimes).toContain(r)
      }
    }
  })

  it('every activity has a template directory per declared runtime', async () => {
    const activities = await listActivities()
    for (const slug of activities) {
      const raw = JSON.parse(
        await readFile(resolve(REGISTRY, slug, 'activity.json'), 'utf8')
      )
      for (const runtime of raw.runtimes as string[]) {
        const dir = resolve(REGISTRY, slug, 'templates', runtime)
        const s = await stat(dir)
        expect(s.isDirectory(), `${slug}/${runtime} missing`).toBe(true)
      }
    }
  })

  it('every runtime template ships the minimum required files', async () => {
    const activities = await listActivities()
    for (const slug of activities) {
      for (const [runtime, required] of Object.entries(
        REQUIRED_FILES_PER_RUNTIME
      )) {
        const dir = resolve(REGISTRY, slug, 'templates', runtime)
        const present = await readdir(dir)
        for (const f of required) {
          expect(present, `${slug}/${runtime} missing ${f}`).toContain(f)
        }
      }
    }
  })
})
