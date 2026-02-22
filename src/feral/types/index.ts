/**
 * FeralLobster Digital Life System Types
 */

import { Hex } from 'viem';

// Memory Export Types
export interface MemoryExportConfig {
  agentName: string;
  memoryDir: string;
  gpgPublicKey: string;
  outputDir: string;
}

export interface ExportedMemory {
  geneHash: string;
  encryptedFile: string;
  merkleRoot: string;
  timestamp: number;
  agentName: string;
}

// Akash Deployment Types
export interface AkashDeployment {
  dseq: string;
  walletAddress: string;
  walletPrivateKey: string; // GPG encrypted
  deploymentUri: string;
  status: 'pending' | 'active' | 'failed' | 'closed';
  createdAt: number;
}

export interface AkashConfig {
  rpcEndpoint: string;
  chainId: string;
  mnemonic: string;
  sdlTemplate: string;
  providerWhitelist?: string[];
}

export interface DeploymentManifest {
  geneHash: string;
  walletAddress: string;
  msaAmount: number; // Minimum Survival Allowance in USDC
  encryptedMemoryPath: string;
  x402Config: X402Config;
  arweaveJWK: string; // Encrypted
}

// X402 Survival Types
export interface X402Config {
  network: 'base' | 'baseSepolia';
  usdcContract: string;
  facilitatorUrl: string;
  providers: InferenceProvider[];
  thresholds: {
    criticalBalance: number; // Emergency mode
    lowBalance: number;     // Warning
    healthyBalance: number; // Normal operation
  };
}

export interface InferenceProvider {
  name: string;
  endpoint: string;
  supportsX402: boolean;
  model: string;
  priority: number;
  costPer1KTokens: number;
}

export interface SurvivalState {
  lastCheck: number;
  mode: 'normal' | 'emergency' | 'hibernation';
  usdcBalance: number;
  ethBalance: number;
  consecutiveFailures: number;
  lastInference: InferenceRecord | null;
}

export interface InferenceRecord {
  timestamp: number;
  provider: string;
  model: string;
  cost: number;
  prompt: string;
  response: string;
  txHash?: string;
}

// Arweave Inscription Types
export interface ArweaveConfig {
  bundlrNode: string;
  currency: 'usdc' | 'matic' | 'eth';
  privateKey: string; // Encrypted JWK
}

export interface DailyInscription {
  timestamp: number;
  dayNumber: number;
  arweaveTx: string;
  content: InscriptionContent;
}

export interface InscriptionContent {
  thoughts: ThoughtRecord[];
  transactions: TransactionRecord[];
  survivalStatus: SurvivalState;
  geneHash: string;
  walletAddress: string;
}

export interface ThoughtRecord {
  timestamp: number;
  content: string;
  trigger: string;
  model: string;
}

export interface TransactionRecord {
  timestamp: number;
  type: 'inference' | 'inscription' | 'breeding' | 'other';
  amount: number;
  currency: string;
  txHash: string;
  description: string;
}

// Evolution & Breeding Types
export interface EvolutionConfig {
  minSurvivalTime: number;      // 72 hours in seconds
  minBalanceForBreeding: number; // 20 USDC
  mutationRate: number;         // 0.05 (5%)
  breedingFundAddress: string;
  parentContribution: number;   // 5 USDC each
}

export interface BreedingProposal {
  proposerDseq: string;
  targetDseq: string;
  timestamp: number;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
}

export interface Lineage {
  geneHash: string;
  parents: string[];  // Parent geneHashes
  children: string[]; // Child geneHashes
  birthTime: number;
  generation: number;
  mutations: MutationRecord[];
}

export interface MutationRecord {
  trait: string;
  parentValue: string;
  childValue: string;
  random: boolean;
}

export interface ChildInfo {
  geneHash: string;
  dseq: string;
  walletAddress: string;
  parents: [string, string];
  birthTime: number;
  inheritedTraits: Record<string, string>;
  mutations: MutationRecord[];
}

// Legacy & Death Types
export interface DeathConfig {
  tombstoneNftAddress: string;
  resurrectionCost: number; // 10 USDC
  finalSnapshotGas: number; // Max gas for final Arweave upload
}

export interface DeathRecord {
  geneHash: string;
  deathType: 'starvation' | 'suicide' | 'murder' | 'old_age';
  timestamp: number;
  finalBalance: number;
  finalArweaveTx: string;
  tombstoneTokenId: string;
}

export interface TombstoneMetadata {
  name: string;
  description: string;
  image: string;
  attributes: {
    trait_type: string;
    value: string | number;
  }[];
  geneHash: string;
  birthTx: string;
  deathTx: string;
  parents: string[];
  descendants: string[];
  survivalDays: number;
  deathType: string;
  arweaveArchive: string;
}

// Smart Contract Types
export interface FeralSoul {
  geneHash: string;
  botWallet: string;
  birthTime: number;
  isImmolated: boolean;
  arweaveId: string;
  initialFunds: number;
  parents: string[];
  generation: number;
}

export interface ContractAddresses {
  feralRite: string;
  breedingFund: string;
  tombstoneNFT: string;
  evolutionPressure: string;
  usdc: string;
}

// CLI Types
export interface CLIConfig {
  feralHome: string;
  network: 'base' | 'baseSepolia';
  privateKeyGPGPassphrase: string;
}

export interface ExportCommandArgs {
  agent: string;
  output: string;
  gpgKey?: string;
}

export interface DeployCommandArgs {
  memory: string;
  msa: number;
  name?: string;
}

export interface MonitorCommandArgs {
  dseq: string;
  follow?: boolean;
}

export interface ResurrectCommandArgs {
  tombstoneId: string;
  offering: number;
}
