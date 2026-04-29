import { initCetusSDK, ClmmPoolUtil } from '@cetusprotocol/cetus-sui-clmm-sdk';
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { execSync } from 'child_process';
import BN from 'bn.js';
import fs from 'fs';
import https from 'https';
import http from 'http';
import dotenv from 'dotenv';

dotenv.config();

const AGENT_ID = 'sui-cetus-yield';
const AGENT_ADDRESS = '0x41bc2d53b278911e32c3323b9ecf45c3c3318eb2bd73086825952e0c3a9db604';
const LOG_FILE = process.env.LOG_FILE || `${AGENT_ID}.log`;
const CHECK_INTERVAL = parseInt(process.env.CHECK_INTERVAL_MS || '300000');
const AGENT_MODE = process.env.AGENT_MODE || 'monitor';
const POOL_ID = process.env.CETUS_POOL_ID;
const THRESHOLD = parseInt(process.env.REBALANCE_THRESHOLD_TICKS || '100');
const BASE_RANGE = parseInt(process.env.POSITION_RANGE_TICKS || '200');
const USDC_TYPE = '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC';

// Phase 3: Volatility-adaptive range parameters
const VOLATILITY_WINDOW = parseInt(process.env.VOLATILITY_WINDOW || '60'); // number of cycles to look back
const MIN_RANGE_TICKS = parseInt(process.env.MIN_RANGE_TICKS || '100');
const MAX_RANGE_TICKS = parseInt(process.env.MAX_RANGE_TICKS || '400');
const VOLATILITY_MULTIPLIER = parseFloat(process.env.VOLATILITY_MULTIPLIER || '3.0');

// --- State ---

const tickHistory = []; // rolling window of { ts, tick } for volatility calc
let totalFeesCollected = 0; // cumulative fees in SUI (estimated from balance changes at rebalance)
let rebalanceCount = 0;
let totalGasSpent = 0; // estimated gas in SUI
let positionOpenedAt = null; // timestamp of current position open
let cyclesInRange = 0;
let cyclesTotal = 0;
let startupTime = Date.now();
const STARTUP_COOLDOWN_MS = 60000; // wait 60s after startup before opening new positions

// --- Logging ---

function log(level, message, data = {}) {
  const entry = { ts: new Date().toISOString(), agent: AGENT_ID, level, message, ...data };
  const line = JSON.stringify(entry);
  console.log(line);
  try { fs.appendFileSync(LOG_FILE, line + '\n'); } catch {}
}

function logEvent(type, details = {}) {
  log('event', type, details);
}

// --- Matrix Alerting ---

async function sendMatrixAlert(message) {
  const homeserver = process.env.MATRIX_HOMESERVER;
  const token = process.env.MATRIX_ACCESS_TOKEN;
  const room = process.env.MATRIX_ALERT_ROOM;
  if (!homeserver || !token || !room) return;
  try {
    const roomEncoded = encodeURIComponent(room);
    const txnId = Date.now() + '' + Math.random().toString(36).slice(2);
    const url = `${homeserver}/_matrix/client/v3/rooms/${roomEncoded}/send/m.room.message/${txnId}`;
    const body = JSON.stringify({ msgtype: 'm.text', body: `[${AGENT_ID}] ${message}` });
    const parsed = new URL(url);
    const proto = parsed.protocol === 'https:' ? https : http;
    await new Promise((resolve, reject) => {
      const req = proto.request({
        hostname: parsed.hostname, port: parsed.port, path: parsed.pathname,
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
        timeout: 10000,
      }, (res) => { res.on('data', () => {}); res.on('end', resolve); });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
      req.write(body); req.end();
    });
  } catch (err) { log('warn', 'Matrix alert failed', { error: err.message }); }
}

// --- WaaP CLI ---

function signAndSendTx(b64TxBytes) {
  const output = execSync(
    `waap-cli send-tx --tx-bytes "${b64TxBytes}" --chain sui:mainnet`,
    { encoding: 'utf-8', timeout: 120000 }
  );
  const match = output.match(/(?:Transaction submitted|TxHash):\s*(\S+)/);
  if (match) return match[1];
  log('warn', 'Could not extract tx hash', { output });
  return null;
}

// --- Phase 3: Volatility Calculation ---

function calculateVolatility() {
  if (tickHistory.length < 2) return { volatility: 0, sampleSize: tickHistory.length };
  const tickChanges = [];
  for (let i = 1; i < tickHistory.length; i++) {
    tickChanges.push(Math.abs(tickHistory[i].tick - tickHistory[i - 1].tick));
  }
  const mean = tickChanges.reduce((a, b) => a + b, 0) / tickChanges.length;
  const variance = tickChanges.reduce((a, b) => a + (b - mean) ** 2, 0) / tickChanges.length;
  const stdDev = Math.sqrt(variance);
  return { volatility: stdDev, mean, sampleSize: tickHistory.length };
}

function getAdaptiveRange(tickSpacing) {
  const { volatility, sampleSize } = calculateVolatility();
  // Need enough data before adapting
  if (sampleSize < 10) return BASE_RANGE;
  // Scale range by volatility: higher vol = wider range to reduce rebalance frequency
  const adaptiveRange = Math.round(volatility * VOLATILITY_MULTIPLIER * 2);
  const clamped = Math.max(MIN_RANGE_TICKS, Math.min(MAX_RANGE_TICKS, adaptiveRange));
  // Snap to tick spacing
  const snapped = Math.ceil(clamped / tickSpacing) * tickSpacing;
  return snapped || BASE_RANGE;
}

// --- Cetus Integration ---

const client = new SuiClient({ url: process.env.SUI_RPC || getFullnodeUrl('mainnet') });
const sdk = initCetusSDK({ network: process.env.NETWORK || 'mainnet' });
sdk.senderAddress = AGENT_ADDRESS;

async function getPoolState() {
  const pool = await sdk.Pool.getPool(POOL_ID);
  return pool;
}

async function getBalance() {
  const result = await client.getBalance({ owner: AGENT_ADDRESS, coinType: '0x2::sui::SUI' });
  return parseInt(result.totalBalance) / 1e9;
}

async function getUsdcBalance() {
  const result = await client.getBalance({ owner: AGENT_ADDRESS, coinType: USDC_TYPE });
  return parseInt(result.totalBalance) / 1e6; // USDC has 6 decimals
}

async function getPositions() {
  const objects = await client.getOwnedObjects({
    owner: AGENT_ADDRESS,
    filter: { StructType: '0x1eabed72c53feb3805120a081dc15963c204dc8d091542592abaf7a35689b2fb::position::Position' },
    options: { showContent: true },
  });
  return objects.data
    .map(o => {
      const fields = o.data?.content?.fields;
      if (!fields) return null;
      const liq = parseInt(fields.liquidity || '0');
      if (liq === 0) return null;
      let tl = fields.tick_lower_index;
      let tu = fields.tick_upper_index;
      if (typeof tl === 'object') tl = tl.fields?.bits ?? tl;
      if (typeof tu === 'object') tu = tu.fields?.bits ?? tu;
      return {
        posId: o.data.objectId,
        liquidity: liq.toString(),
        tickLower: parseInt(tl),
        tickUpper: parseInt(tu),
        pool: fields.pool,
      };
    })
    .filter(p => p && p.pool === POOL_ID);
}

function needsRebalance(position, currentTick) {
  const center = Math.floor((position.tickLower + position.tickUpper) / 2);
  const drift = Math.abs(currentTick - center);
  const outOfRange = currentTick < position.tickLower || currentTick > position.tickUpper;

  if (outOfRange) {
    logEvent('out_of_range', { currentTick, tickLower: position.tickLower, tickUpper: position.tickUpper, drift });
    return true;
  }
  if (drift > THRESHOLD) {
    logEvent('drift_detected', { currentTick, drift, threshold: THRESHOLD });
    return true;
  }
  log('info', 'Position in range', { currentTick, drift, threshold: THRESHOLD });
  return false;
}

async function rebalance(pool, position) {
  logEvent('rebalance_start', { posId: position.posId });

  // Capture balance before removal to estimate fees
  const balanceBefore = await getBalance();
  const usdcBefore = await getUsdcBalance();

  // Step 1: Remove liquidity + collect fees
  log('info', 'Removing liquidity', { posId: position.posId });
  const removeTx = await sdk.Position.removeLiquidityTransactionPayload({
    pool_id: POOL_ID,
    pos_id: position.posId,
    coinTypeA: pool.coinTypeA,
    coinTypeB: pool.coinTypeB,
    delta_liquidity: position.liquidity,
    min_amount_a: '0',
    min_amount_b: '0',
    collect_fee: true,
    rewarder_coin_types: [],
  });
  removeTx.setSender(AGENT_ADDRESS);
  const removeTxBytes = Buffer.from(await removeTx.build({ client })).toString('base64');
  const removeTxHash = signAndSendTx(removeTxBytes);

  // Wait for state to settle
  await new Promise(r => setTimeout(r, 5000));

  // Measure balance after removal to estimate fees collected
  const balanceAfterRemove = await getBalance();
  const usdcAfterRemove = await getUsdcBalance();
  const estimatedGas = 0.01; // ~0.01 SUI per tx (rough estimate)
  totalGasSpent += estimatedGas * 2; // remove + open

  logEvent('remove_liquidity_complete', {
    txHash: removeTxHash,
    suiBefore: balanceBefore,
    suiAfter: balanceAfterRemove,
    usdcBefore,
    usdcAfter: usdcAfterRemove,
  });

  // Refresh pool state
  const freshPool = await getPoolState();
  const currentTick = freshPool.current_tick_index;
  const tickSpacing = freshPool.tickSpacing;

  // Phase 3: Use adaptive range based on volatility
  const range = getAdaptiveRange(tickSpacing);
  const { volatility, sampleSize } = calculateVolatility();

  // Step 2: Open new position with liquidity
  const tickLower = Math.floor((currentTick - range) / tickSpacing) * tickSpacing;
  const tickUpper = Math.ceil((currentTick + range) / tickSpacing) * tickSpacing;

  log('info', 'Opening new position', { tickLower, tickUpper, currentTick, range, volatility: volatility.toFixed(2) });

  // Get available USDC balance
  const usdcBalance = await client.getBalance({ owner: AGENT_ADDRESS, coinType: USDC_TYPE });
  const usdcAvailable = parseInt(usdcBalance.totalBalance);
  const usdcToUse = Math.floor(usdcAvailable * 0.50).toString();

  if (parseInt(usdcToUse) < 10000) {
    log('warn', 'Not enough USDC to reopen position', { usdcAvailable });
    logEvent('rebalance_skipped', { reason: 'insufficient_usdc', usdcAvailable });
    return;
  }

  const curSqrtPrice = new BN(freshPool.current_sqrt_price);
  const liquidityInput = ClmmPoolUtil.estLiquidityAndcoinAmountFromOneAmounts(
    tickLower, tickUpper,
    new BN(usdcToUse),
    true, true, 0.1, curSqrtPrice,
  );

  const openPayload = await sdk.Position.createAddLiquidityPayload({
    pool_id: POOL_ID,
    coinTypeA: freshPool.coinTypeA,
    coinTypeB: freshPool.coinTypeB,
    tick_lower: tickLower.toString(),
    tick_upper: tickUpper.toString(),
    is_open: true,
    pos_id: '',
    max_amount_a: liquidityInput.tokenMaxA.toString(),
    max_amount_b: liquidityInput.tokenMaxB.toString(),
    delta_liquidity: liquidityInput.liquidityAmount.toString(),
    rewarder_coin_types: [],
    collect_fee: false,
  });

  openPayload.setSender(AGENT_ADDRESS);
  const openTxBytes = Buffer.from(await openPayload.build({ client })).toString('base64');
  const openTxHash = signAndSendTx(openTxBytes);

  rebalanceCount++;
  positionOpenedAt = new Date().toISOString();
  cyclesInRange = 0;
  cyclesTotal = 0;

  logEvent('rebalance_complete', {
    txHash: openTxHash,
    newTickLower: tickLower,
    newTickUpper: tickUpper,
    usdcDeposited: usdcToUse,
    rangeUsed: range,
    volatility: volatility.toFixed(2),
    volatilitySamples: sampleSize,
    rebalanceNumber: rebalanceCount,
  });
  log('info', 'Rebalance complete', { tickLower, tickUpper, txHash: openTxHash });
}

// --- Phase 4 & 5: Multi-Pool & Cross-Protocol Yield Scanner ---

const YIELD_SCAN_INTERVAL = 6; // run every 6th cycle (every 30 min at 5min intervals)
let cycleCount = 0;

// Cetus pools to monitor (Phase 4)
const CETUS_WATCH_POOLS = [
  { id: POOL_ID, symbol: 'SUI/USDC', active: true },
  { id: '0xcf994611fd4c48e277ce3ffd4d4364c914af2c3cbb05f7bf6facd371de688571', symbol: 'SUI/USDT' },
  { id: '0x5b0b24c27ccf6a29ff57c8d166bfbee2e2f85dbf57149e8a3d5b9e3894516105', symbol: 'USDC/USDT' },
  { id: '0x871d8a227114f375170f149f7e9d45be822dd3c07f30f0a55e8674d59b9f8a21', symbol: 'wETH/USDC' },
];

async function fetchDefiLlamaYields() {
  return new Promise((resolve, reject) => {
    https.get('https://yields.llama.fi/pools', (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data).data || []);
        } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function scanYields() {
  try {
    const allPools = await fetchDefiLlamaYields();
    const suiPools = allPools.filter(p => p.chain === 'Sui');

    // Phase 4: Cetus pool comparison
    const cetusLpPools = suiPools
      .filter(p => p.project === 'cetus-clmm')
      .sort((a, b) => (b.apy || 0) - (a.apy || 0))
      .slice(0, 10)
      .map(p => ({
        symbol: p.symbol,
        apy: parseFloat((p.apy || 0).toFixed(2)),
        tvl: Math.round(p.tvlUsd || 0),
        pool: p.pool,
      }));

    // Phase 5: Cross-protocol comparison (best yield per category)
    const protocols = {};
    for (const p of suiPools) {
      const proj = p.project;
      if (!protocols[proj]) protocols[proj] = [];
      protocols[proj].push(p);
    }

    // Get best SUI-based yields across protocols
    const crossProtocol = [];

    // Lending protocols
    for (const proj of ['navi-lending', 'scallop-lend', 'current', 'kai-finance']) {
      const pools = protocols[proj] || [];
      // Find SUI lending pool
      const suiPool = pools.find(p => p.symbol === 'SUI' || p.symbol === 'HASUI');
      const usdcPool = pools.find(p => p.symbol === 'USDC');
      if (suiPool) {
        crossProtocol.push({
          protocol: proj,
          type: 'lending',
          asset: suiPool.symbol,
          apy: parseFloat((suiPool.apy || 0).toFixed(2)),
          tvl: Math.round(suiPool.tvlUsd || 0),
        });
      }
      if (usdcPool) {
        crossProtocol.push({
          protocol: proj,
          type: 'lending',
          asset: usdcPool.symbol,
          apy: parseFloat((usdcPool.apy || 0).toFixed(2)),
          tvl: Math.round(usdcPool.tvlUsd || 0),
        });
      }
    }

    // LP protocols (best SUI/USDC pool per DEX)
    for (const proj of ['cetus-clmm', 'bluefin-spot', 'turbos', 'flowx-v3', 'full-sail']) {
      const pools = protocols[proj] || [];
      const suiUsdc = pools.find(p =>
        (p.symbol || '').match(/SUI.*USDC|USDC.*SUI/i)
      );
      if (suiUsdc) {
        crossProtocol.push({
          protocol: proj,
          type: 'lp',
          asset: suiUsdc.symbol,
          apy: parseFloat((suiUsdc.apy || 0).toFixed(2)),
          tvl: Math.round(suiUsdc.tvlUsd || 0),
        });
      }
    }

    // Sort cross-protocol by APY
    crossProtocol.sort((a, b) => b.apy - a.apy);

    // Find our current pool in the data (check all Cetus pools, not just top 10)
    const allCetusPools = suiPools
      .filter(p => p.project === 'cetus-clmm')
      .sort((a, b) => (b.apy || 0) - (a.apy || 0))
      .map(p => ({
        symbol: p.symbol,
        apy: parseFloat((p.apy || 0).toFixed(2)),
        tvl: Math.round(p.tvlUsd || 0),
        pool: p.pool,
      }));
    const ourPool = allCetusPools.find(p => (p.symbol || '').match(/USDC.*SUI|SUI.*USDC/i));
    const ourPoolRank = ourPool ? allCetusPools.indexOf(ourPool) + 1 : null;

    // Ensure our pool is in the displayed list
    if (ourPool && !cetusLpPools.find(p => p.pool === ourPool.pool)) {
      cetusLpPools.push(ourPool);
    }

    logEvent('yield_scan', {
      cetusTopPools: cetusLpPools,
      crossProtocol,
      currentPool: {
        symbol: 'SUI/USDC',
        protocol: 'cetus-clmm',
        apy: ourPool?.apy ?? null,
        tvl: ourPool?.tvl ?? null,
        rank: ourPoolRank,
      },
      bestAlternative: crossProtocol[0] || null,
      totalSuiPools: suiPools.length,
      scanTime: new Date().toISOString(),
    });

    log('info', 'Yield scan complete', {
      cetusPoolsFound: cetusLpPools.length,
      crossProtocolOptions: crossProtocol.length,
      bestApy: crossProtocol[0]?.apy || 0,
      bestProtocol: crossProtocol[0]?.protocol || 'none',
    });
  } catch (err) {
    log('warn', 'Yield scan failed', { error: err.message });
  }
}

// --- Main Loop ---

let consecutiveErrors = 0;
const MAX_CONSECUTIVE_ERRORS = 3;

async function runCycle() {
  const pool = await getPoolState();
  const balance = await getBalance();
  const usdcBalance = await getUsdcBalance();
  const currentTick = pool.current_tick_index;

  // Phase 3: Track tick history for volatility
  tickHistory.push({ ts: Date.now(), tick: currentTick });
  if (tickHistory.length > VOLATILITY_WINDOW) tickHistory.shift();
  const { volatility, sampleSize } = calculateVolatility();

  log('info', 'Cycle', {
    mode: AGENT_MODE,
    tick: currentTick,
    sqrtPrice: pool.current_sqrt_price,
    balance: balance.toFixed(4),
    usdcBalance: usdcBalance.toFixed(4),
    volatility: volatility.toFixed(2),
    volatilitySamples: sampleSize,
  });
  logEvent('balance_snapshot', { balance, usdcBalance });

  if (AGENT_MODE === 'active') {
    const positions = await getPositions();
    log('info', `Found ${positions.length} active position(s)`);

    if (positions.length === 0) {
      // Guard: don't open a position within the cooldown period after startup.
      // This prevents duplicate position opens when the watchdog restarts the agent
      // and multiple instances race to open positions.
      const timeSinceStartup = Date.now() - startupTime;
      if (timeSinceStartup < STARTUP_COOLDOWN_MS) {
        log('info', `No positions found, but in startup cooldown (${Math.round(timeSinceStartup / 1000)}s / ${STARTUP_COOLDOWN_MS / 1000}s). Skipping.`);
        return;
      }
      log('info', 'No active positions. Opening new position...');
      logEvent('no_positions_opening');

      const currentTick = pool.current_tick_index;
      const tickSpacing = pool.tickSpacing;

      // Phase 3: Use adaptive range
      const range = getAdaptiveRange(tickSpacing);

      const tickLower = Math.floor((currentTick - range) / tickSpacing) * tickSpacing;
      const tickUpper = Math.ceil((currentTick + range) / tickSpacing) * tickSpacing;

      const usdcRawBalance = await client.getBalance({ owner: AGENT_ADDRESS, coinType: USDC_TYPE });
      const usdcAvailable = parseInt(usdcRawBalance.totalBalance);
      const usdcToUse = Math.floor(usdcAvailable * 0.40).toString();

      if (parseInt(usdcToUse) < 10000) {
        log('warn', 'Not enough USDC to open position', { usdcAvailable });
        logEvent('insufficient_funds', { usdcAvailable });
      } else {
        const curSqrtPrice = new BN(pool.current_sqrt_price);
        const liquidityInput = ClmmPoolUtil.estLiquidityAndcoinAmountFromOneAmounts(
          tickLower, tickUpper,
          new BN(usdcToUse),
          true, true, 0.1, curSqrtPrice,
        );

        log('info', 'Opening position', { tickLower, tickUpper, usdc: usdcToUse, range, volatility: volatility.toFixed(2) });
        const openPayload = await sdk.Position.createAddLiquidityPayload({
          pool_id: POOL_ID,
          coinTypeA: pool.coinTypeA,
          coinTypeB: pool.coinTypeB,
          tick_lower: tickLower.toString(),
          tick_upper: tickUpper.toString(),
          is_open: true,
          pos_id: '',
          max_amount_a: liquidityInput.tokenMaxA.toString(),
          max_amount_b: liquidityInput.tokenMaxB.toString(),
          delta_liquidity: liquidityInput.liquidityAmount.toString(),
          rewarder_coin_types: [],
          collect_fee: false,
        });

        openPayload.setSender(AGENT_ADDRESS);
        const txBytes = Buffer.from(await openPayload.build({ client })).toString('base64');
        const txHash = signAndSendTx(txBytes);
        positionOpenedAt = new Date().toISOString();
        totalGasSpent += 0.01;
        logEvent('position_opened', { txHash, tickLower, tickUpper, usdc: usdcToUse, range });
        log('info', 'Position opened', { txHash, tickLower, tickUpper });
      }
    } else {
      cyclesTotal++;
      for (const pos of positions) {
        const inRange = !needsRebalance(pos, currentTick);
        if (inRange) {
          cyclesInRange++;
          // Log position status for the dashboard
          logEvent('position_status', {
            tickLower: pos.tickLower,
            tickUpper: pos.tickUpper,
            currentTick,
            drift: Math.abs(currentTick - Math.floor((pos.tickLower + pos.tickUpper) / 2)),
            threshold: THRESHOLD,
            liquidity: pos.liquidity,
            rangeWidth: pos.tickUpper - pos.tickLower,
            inRange: true,
            timeInRangePct: cyclesTotal > 0 ? Math.round((cyclesInRange / cyclesTotal) * 100) : 100,
            positionOpenedAt,
            rebalanceCount,
            totalGasSpent: totalGasSpent.toFixed(4),
            volatility: volatility.toFixed(2),
            volatilitySamples: sampleSize,
            adaptiveRange: getAdaptiveRange(pool.tickSpacing),
            baseRange: BASE_RANGE,
          });
        } else {
          log('info', 'Rebalancing...');
          await rebalance(pool, pos);
        }
      }
    }
  } else {
    // Monitor mode -- simulate
    log('info', 'Monitor mode -- simulating position check');
  }
}

async function runAgent() {
  // Write PID file so watchdog can detect us reliably
  try { fs.writeFileSync(`${process.cwd()}/agent.pid`, String(process.pid)); } catch {}
  process.on('exit', () => { try { fs.unlinkSync(`${process.cwd()}/agent.pid`); } catch {} });

  startupTime = Date.now();
  log('info', 'Agent starting', {
    mode: AGENT_MODE,
    pool: POOL_ID,
    network: process.env.NETWORK,
    checkInterval: CHECK_INTERVAL,
    baseRange: BASE_RANGE,
    volatilityWindow: VOLATILITY_WINDOW,
    minRange: MIN_RANGE_TICKS,
    maxRange: MAX_RANGE_TICKS,
  });

  // Run initial yield scan
  await scanYields();

  while (true) {
    try {
      await runCycle();
      cycleCount++;
      // Phase 4 & 5: Periodic yield scan
      if (cycleCount % YIELD_SCAN_INTERVAL === 0) {
        await scanYields();
      }
      consecutiveErrors = 0;
    } catch (error) {
      consecutiveErrors++;
      log('error', 'Cycle failed', { error: error.message, stack: error.stack, consecutiveErrors });
      if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        const msg = `CRITICAL: ${consecutiveErrors} consecutive failures. Last: ${error.message}. Stopping.`;
        log('error', msg);
        await sendMatrixAlert(msg);
        process.exit(1);
      } else {
        await sendMatrixAlert(`Error (${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS}): ${error.message}`);
      }
    }
    log('info', `Next check in ${CHECK_INTERVAL / 1000}s`);
    await new Promise(r => setTimeout(r, CHECK_INTERVAL));
  }
}

runAgent().catch(async (err) => {
  log('error', 'Fatal', { error: err.message, stack: err.stack });
  await sendMatrixAlert(`FATAL: ${err.message}`);
  process.exit(1);
});
