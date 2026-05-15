import type { Agent, BalanceSnapshot, AgentEvent, PaymentScheduleItem, PaymentEvent, PaymentStats } from "./types";

export const agents: Agent[] = [
  {
    id: "recurring-pay-alpha",
    name: "Recurring Payments Agent",
    description: "Manages automated recurring payments to contractors, bounties, and operational wallets. Executes scheduled transfers on time, tracks payment history, and alerts on failures. All transactions require two-party signing via WaaP.",
    email: "webmaster+recurring-pay@holonym.id",
    chain: "Ethereum",
    network: "mainnet",
    protocol: "ERC-20 Transfers",
    walletAddress: "0x9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b",
    status: "running",
    uptime: "12d 5h",
    lastActivity: "2 min ago",
    config: {
      "Payment method": "Direct ERC-20 transfer via WaaP",
      "Active schedules": "3",
      "Retry on failure": "3 attempts with 10 min backoff",
      "Gas strategy": "EIP-1559 medium priority",
      "Low balance alert": "$200 USDC threshold",
      "Payment window": "Execute within 1 hour of due time",
      "Confirmation threshold": "2 block confirmations",
    },
    tools: [
      "@human.tech/waap-cli",
      "ethers",
      "viem",
    ],
  },
];

export function generateBalanceHistory(): BalanceSnapshot[] {
  const now = Date.now();
  const points: BalanceSnapshot[] = [];
  let balance = 5200.0;

  for (let i = 96; i >= 0; i--) {
    const ts = new Date(now - i * 15 * 60 * 1000).toISOString();
    // Occasional step-downs to simulate payments going out
    if (i === 72) balance -= 500; // monthly payment
    if (i === 48) balance -= 100; // biweekly bounty
    if (i === 24) balance -= 50;  // weekly fuel top-up
    balance += (Math.random() - 0.5) * 5;
    balance = Math.max(3000, balance);
    points.push({ ts, balance: parseFloat(balance.toFixed(2)) });
  }

  return points;
}

export function generateEvents(): AgentEvent[] {
  const now = Date.now();
  return [
    {
      ts: new Date(now - 2 * 60 * 1000).toISOString(),
      type: "payment_sent",
      level: "event",
      message: "Sent 0.05 ETH to 0x1234...abcd (Agent fuel top-up -- weekly)",
      txHash: "0xpay_abc123...",
    },
    {
      ts: new Date(now - 30 * 60 * 1000).toISOString(),
      type: "schedule_check",
      level: "info",
      message: "Checked 3 schedules: 0 due now, 1 due in 6 days",
    },
    {
      ts: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
      type: "payment_sent",
      level: "event",
      message: "Sent 0.1 ETH to 0x5678...efgh (Dev bounty -- biweekly)",
      txHash: "0xpay_def456...",
    },
    {
      ts: new Date(now - 6 * 60 * 60 * 1000).toISOString(),
      type: "balance_check",
      level: "info",
      message: "Wallet balance: $4,547.20 USDC + 1.82 ETH",
    },
    {
      ts: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(),
      type: "payment_sent",
      level: "event",
      message: "Sent 500 USDC to 0x9abc...1234 (Contractor payment -- monthly)",
      txHash: "0xpay_ghi789...",
    },
    {
      ts: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(),
      type: "payment_failed",
      level: "error",
      message: "Failed to send 0.05 ETH to 0x1234...abcd -- insufficient gas, retrying",
    },
    {
      ts: new Date(now - 5 * 24 * 60 * 60 * 1000 + 10 * 60 * 1000).toISOString(),
      type: "payment_sent",
      level: "event",
      message: "Retry successful: sent 0.05 ETH to 0x1234...abcd (Agent fuel top-up)",
      txHash: "0xpay_jkl012...",
    },
    {
      ts: new Date(now - 12 * 24 * 60 * 60 * 1000).toISOString(),
      type: "agent_start",
      level: "info",
      message: "Agent started. Protocol: ERC-20 Transfers, Network: Ethereum mainnet",
    },
  ];
}

export function generatePaymentSchedules(): PaymentScheduleItem[] {
  const now = Date.now();
  return [
    {
      id: "sched-001",
      recipient: "0x9abc...1234",
      label: "Contractor payment",
      token: "USDC",
      amount: 500,
      interval: "monthly",
      nextDueDate: new Date(now + 27 * 24 * 60 * 60 * 1000).toISOString(),
      lastPaidDate: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(),
      status: "active",
    },
    {
      id: "sched-002",
      recipient: "0x5678...efgh",
      label: "Dev bounty",
      token: "ETH",
      amount: 0.1,
      interval: "biweekly",
      nextDueDate: new Date(now + 12 * 24 * 60 * 60 * 1000).toISOString(),
      lastPaidDate: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
      status: "active",
    },
    {
      id: "sched-003",
      recipient: "0x1234...abcd",
      label: "Agent fuel top-up",
      token: "ETH",
      amount: 0.05,
      interval: "weekly",
      nextDueDate: new Date(now + 5 * 24 * 60 * 60 * 1000).toISOString(),
      lastPaidDate: new Date(now - 2 * 60 * 1000).toISOString(),
      status: "active",
    },
  ];
}

export function generatePaymentHistory(): PaymentEvent[] {
  const now = Date.now();
  return [
    {
      ts: new Date(now - 2 * 60 * 1000).toISOString(),
      scheduleId: "sched-003",
      recipient: "0x1234...abcd",
      label: "Agent fuel top-up",
      amount: 0.05,
      token: "ETH",
      txHash: "0xpay_abc123...",
      status: "sent",
    },
    {
      ts: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
      scheduleId: "sched-002",
      recipient: "0x5678...efgh",
      label: "Dev bounty",
      amount: 0.1,
      token: "ETH",
      txHash: "0xpay_def456...",
      status: "sent",
    },
    {
      ts: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(),
      scheduleId: "sched-001",
      recipient: "0x9abc...1234",
      label: "Contractor payment",
      amount: 500,
      token: "USDC",
      txHash: "0xpay_ghi789...",
      status: "sent",
    },
    {
      ts: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(),
      scheduleId: "sched-003",
      recipient: "0x1234...abcd",
      label: "Agent fuel top-up",
      amount: 0.05,
      token: "ETH",
      txHash: "",
      status: "failed",
    },
    {
      ts: new Date(now - 5 * 24 * 60 * 60 * 1000 + 10 * 60 * 1000).toISOString(),
      scheduleId: "sched-003",
      recipient: "0x1234...abcd",
      label: "Agent fuel top-up (retry)",
      amount: 0.05,
      token: "ETH",
      txHash: "0xpay_jkl012...",
      status: "sent",
    },
    {
      ts: new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString(),
      scheduleId: "sched-003",
      recipient: "0x1234...abcd",
      label: "Agent fuel top-up",
      amount: 0.05,
      token: "ETH",
      txHash: "0xpay_mno345...",
      status: "sent",
    },
  ];
}

export function generatePaymentStats(): PaymentStats {
  const now = Date.now();
  return {
    totalPaymentsSent: 34,
    totalUsdValue: 8470.50,
    activeSchedules: 3,
    nextPaymentDue: new Date(now + 5 * 24 * 60 * 60 * 1000).toISOString(),
    paymentsThisMonth: 6,
    failedPayments: 1,
    totalSchedules: 3,
  };
}
