/**
 * x402 Payment System Types
 * FeralLobster - AI Agent Autonomous Payment Framework
 */

import { Hex } from 'viem';

// x402 Payment Header Structure (ERC-3009)
export interface X402Payment {
  from: string;
  to: string;
  value: string;
  validAfter: number;
  validBefore: number;
  nonce: string;
  v: number;
  r: Hex;
  s: Hex;
}

// x402 Payment Info from 402 Response
export interface X402PaymentInfo {
  scheme: 'exact' | string;
  networkId: string;
  maxAmountRequired: string;
  resource: string;
  beneficiary: string;
  usdcContract: string;
  validForSeconds?: number;
}

// x402 Evidence for settlement
export interface X402Evidence {
  txHash: Hex;
  networkId: string;
  payment: X402Payment;
  timestamp: number;
}

// Provider Configuration
export interface ProviderConfig {
  name: string;
  endpoint: string;
  supportsX402: boolean;
  model?: string;
  priority: number;
  apiKeyEnv?: string;
  maxCostPerRequest?: number;
}

// Network Configuration
export interface NetworkConfig {
  usdcContract: string;
  chainId: number;
  facilitatorUrl: string;
  rpcUrl?: string;
}

// x402 Configuration
export interface X402Config {
  networks: {
    base: NetworkConfig;
    baseSepolia?: NetworkConfig;
  };
  providers: ProviderConfig[];
  thresholds: {
    criticalBalance: number;
    lowBalance: number;
    autoRefill: number;
  };
}

// Agent Wallet State
export interface AgentWalletState {
  address: string;
  encryptedPrivateKey?: string;
  balanceUSDC: bigint;
  balanceETH: bigint;
  lastUpdated: number;
}

// Payment Receipt for logging
export interface PaymentReceipt {
  id: string;
  timestamp: string;
  provider: string;
  model: string;
  cost: string;
  currency: string;
  txHash?: string;
  taskId: string;
  success: boolean;
  responseSummary: string;
}

// Balance Alert
export interface BalanceAlert {
  level: 'CRITICAL' | 'LOW' | 'INFO';
  currentBalance: number;
  threshold: number;
  timestamp: string;
  agentId: string;
}

// Secure Memory Entry
export interface SecureMemoryEntry {
  data: Buffer;
  createdAt: number;
  tag: string;
}

// Inference Request
export interface InferenceRequest {
  model: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  max_tokens?: number;
}

// Inference Response
export interface InferenceResponse {
  content: string;
  model: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  cost: number;
  paymentHash?: string;
}

// Facilitator Response
export interface FacilitatorResponse {
  success: boolean;
  error?: string;
  txHash?: Hex;
  status?: 'pending' | 'confirmed' | 'failed';
}

// X402 Client Options
export interface X402ClientOptions {
  network: 'base' | 'baseSepolia';
  maxRetries?: number;
  retryDelayMs?: number;
  pollIntervalMs?: number;
  pollTimeoutMs?: number;
}

// Agent Wallet Options
export interface AgentWalletOptions {
  agentId: string;
  feralHome: string;
  gpgPassphrase: string;
  hardwareWallet?: boolean;
}

// Inference Purchaser Options
export interface InferencePurchaserOptions {
  x402Client: X402Client;
  agentWallet: AgentWallet;
  config: X402Config;
}

// HTTP Response with x402 headers
export interface X402HttpResponse {
  status: number;
  headers: Record<string, string>;
  data: unknown;
  paymentInfo?: X402PaymentInfo;
  paymentResponse?: {
    status: 'success' | 'error';
    error?: string;
    txHash?: string;
  };
}
