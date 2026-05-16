export interface Agent {
  id: string;
  name: string;
  description: string;
  email: string;
  chain: string;
  network: string;
  protocol: string;
  walletAddress: string;
  status: "running" | "stopped" | "error";
  uptime: string;
  lastActivity: string;
  config: Record<string, string>;
  tools: string[];
}

export interface BalanceSnapshot {
  ts: string;
  balance: number;
}

export interface AgentEvent {
  ts: string;
  type: string;
  level: "info" | "event" | "error" | "warn";
  message: string;
  data?: Record<string, unknown>;
  txHash?: string;
}

export interface PaymentScheduleItem {
  id: string;
  recipient: string;
  label: string;
  token: string;
  amount: number;
  interval: "weekly" | "biweekly" | "monthly" | "quarterly";
  nextDueDate: string;
  lastPaidDate: string | null;
  status: "active" | "paused";
}

export interface PaymentEvent {
  ts: string;
  scheduleId: string;
  recipient: string;
  label: string;
  amount: number;
  token: string;
  txHash: string;
  status: "sent" | "failed" | "pending";
}

export interface PaymentStats {
  totalPaymentsSent: number;
  totalUsdValue: number;
  activeSchedules: number;
  nextPaymentDue: string;
  paymentsThisMonth: number;
  failedPayments: number;
  totalSchedules: number;
}
