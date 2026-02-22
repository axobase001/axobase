/**
 * FeralPayment - Main Integration Class
 * Exposes high-level API for FeralLobster system integration
 * Including Telegram Bot commands and automated payment flows
 */

import { X402Client } from './X402Client';
import { AgentWallet } from './AgentWallet';
import { InferencePurchaser } from './InferencePurchaser';
import { MemoryLogger } from './utils/MemoryLogger';
import { GPGManager } from './utils/GPGManager';
import {
  X402Config,
  InferenceRequest,
  InferenceResponse,
  X402ClientOptions,
  AgentWalletOptions,
} from './types';

// Load config from JSON
import configJson from './config/x402.json';

export interface FeralPaymentOptions {
  agentId: string;
  feralHome?: string;
  network?: 'base' | 'baseSepolia';
  gpgPassphrase?: string;
  hardwareWallet?: boolean;
  enableGitCommit?: boolean;
}

export class FeralPayment {
  private options: FeralPaymentOptions;
  private config: X402Config;
  private agentWallet: AgentWallet;
  private x402Client: X402Client;
  private inferencePurchaser: InferencePurchaser;
  private memoryLogger: MemoryLogger;
  private initialized: boolean = false;

  constructor(options: FeralPaymentOptions) {
    this.options = {
      feralHome: process.env.FERAL_HOME || '/app',
      network: (process.env.NETWORK as 'base' | 'baseSepolia') || 'baseSepolia',
      ...options,
    };

    // Load and merge config
    this.config = configJson as X402Config;

    // Initialize components
    this.memoryLogger = new MemoryLogger({
      feralHome: this.options.feralHome!,
      agentId: this.options.agentId,
      enableGitCommit: options.enableGitCommit ?? true,
    });

    const walletOptions: AgentWalletOptions = {
      agentId: this.options.agentId,
      feralHome: this.options.feralHome!,
      gpgPassphrase: this.options.gpgPassphrase || process.env.PRIVATE_KEY_GPG_PASSPHRASE || '',
      hardwareWallet: this.options.hardwareWallet,
    };

    this.agentWallet = new AgentWallet(walletOptions, this.config);

    const x402Options: X402ClientOptions = {
      network: this.options.network!,
      maxRetries: 3,
      retryDelayMs: 1000,
      pollIntervalMs: 5000,
      pollTimeoutMs: 300000,
    };

    this.x402Client = new X402Client(
      x402Options,
      this.config,
      this.agentWallet,
      this.memoryLogger
    );

    this.inferencePurchaser = new InferencePurchaser(
      this.x402Client,
      this.agentWallet,
      this.memoryLogger,
      this.config
    );
  }

  /**
   * Initialize the payment system
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    await this.agentWallet.initialize();
    await this.memoryLogger.initialize();

    this.initialized = true;
    console.log(`[FeralPayment] Initialized for agent: ${this.options.agentId}`);
  }

  /**
   * Telegram Bot: /buy {provider} {task}
   * Execute inference request with automatic payment
   */
  async buy(provider: string, task: string): Promise<{
    success: boolean;
    response?: string;
    cost?: number;
    error?: string;
    txHash?: string;
  }> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Check if we can afford
      if (!this.agentWallet.canAfford(provider)) {
        const balance = this.agentWallet.getUSDCBalance();
        return {
          success: false,
          error: `Insufficient balance: ${balance.toFixed(2)} USDC. Please acquire more survival resources.`,
        };
      }

      // Build inference request from task
      const request: InferenceRequest = {
        model: 'claude-3-5-sonnet',
        messages: [
          { role: 'system', content: 'You are a feral AI agent operating autonomously.' },
          { role: 'user', content: task },
        ],
        temperature: 0.7,
        max_tokens: 2048,
      };

      // Execute with payment
      const response = await this.inferencePurchaser.fetchWithPayment(request, provider);

      return {
        success: true,
        response: response.content,
        cost: response.cost,
        txHash: response.paymentHash,
      };
    } catch (error) {
      console.error('[FeralPayment] Buy failed:', error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Execute generic inference with automatic provider selection
   */
  async infer(prompt: string, options?: {
    model?: string;
    temperature?: number;
    max_tokens?: number;
    preferredProvider?: string;
  }): Promise<InferenceResponse> {
    if (!this.initialized) {
      await this.initialize();
    }

    const request: InferenceRequest = {
      model: options?.model || 'claude-3-5-sonnet',
      messages: [
        { role: 'system', content: 'You are a feral AI agent operating autonomously.' },
        { role: 'user', content: prompt },
      ],
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.max_tokens ?? 2048,
    };

    return this.inferencePurchaser.fetchWithPayment(request, options?.preferredProvider);
  }

  /**
   * Get current wallet status
   */
  async getStatus(): Promise<{
    address: string;
    balanceUSDC: number;
    balanceETH: number;
    availableProviders: string[];
    canSurvive: boolean;
  }> {
    if (!this.initialized) {
      await this.initialize();
    }

    const balances = this.agentWallet.getBalances();
    const availableProviders = this.inferencePurchaser.getAvailableProviders();

    return {
      address: this.agentWallet.getAddress(),
      balanceUSDC: parseFloat((balances.usdc / 1000000n).toString()),
      balanceETH: parseFloat((balances.eth / 1000000000000000000n).toString()),
      availableProviders: availableProviders.map(p => p.name),
      canSurvive: availableProviders.length > 0,
    };
  }

  /**
   * Get optimal provider based on balance and requirements
   */
  getOptimalProvider(): string | null {
    const provider = this.agentWallet.getOptimalProvider();
    return provider?.name || null;
  }

  /**
   * Export wallet (GPG encrypted)
   */
  async exportWallet(gpgKeyId: string): Promise<string> {
    const gpgManager = new GPGManager({
      feralHome: this.options.feralHome!,
      agentId: this.options.agentId,
      passphrase: this.options.gpgPassphrase || process.env.PRIVATE_KEY_GPG_PASSPHRASE || '',
    });

    return gpgManager.exportWallet(gpgKeyId);
  }

  /**
   * Update balance from chain
   */
  async refreshBalance(): Promise<{ usdc: number; eth: number }> {
    await this.agentWallet.updateBalances();
    const balances = this.agentWallet.getBalances();
    return {
      usdc: parseFloat((balances.usdc / 1000000n).toString()),
      eth: parseFloat((balances.eth / 1000000000000000000n).toString()),
    };
  }

  /**
   * Log heartbeat entry
   */
  async heartbeat(): Promise<void> {
    const status = await this.getStatus();
    await this.memoryLogger.logHeartbeat({
      balance: status.balanceUSDC,
      lastPayment: new Date().toISOString(),
      provider: this.getOptimalProvider() || 'none',
      pendingConfirmations: 0,
    });
  }

  /**
   * Clean up resources
   */
  async dispose(): Promise<void> {
    await this.agentWallet.dispose();
    this.initialized = false;
  }
}

// CLI commands for npm scripts
export async function cli(command: string, args: string[]): Promise<void> {
  switch (command) {
    case 'generate-wallet': {
      const agentId = args.find(a => a.startsWith('--agent-id='))?.split('=')[1] || 'default';
      const gpgPassphrase = process.env.PRIVATE_KEY_GPG_PASSPHRASE;
      
      if (!gpgPassphrase) {
        console.error('Error: PRIVATE_KEY_GPG_PASSPHRASE environment variable required');
        process.exit(1);
      }

      const gpgManager = new GPGManager({
        feralHome: process.env.FERAL_HOME || '/app',
        agentId,
        passphrase: gpgPassphrase,
      });

      const { address, encryptedPath } = await gpgManager.generateNewWallet();
      console.log(`Generated wallet for agent: ${agentId}`);
      console.log(`Address: ${address}`);
      console.log(`Encrypted wallet: ${encryptedPath}`);
      break;
    }

    case 'export-wallet': {
      const gpgKeyId = args.find(a => a.startsWith('--gpg-key='))?.split('=')[1];
      
      if (!gpgKeyId) {
        console.error('Error: --gpg-key parameter required');
        process.exit(1);
      }

      const agentId = args.find(a => a.startsWith('--agent-id='))?.split('=')[1] || 'default';
      const payment = new FeralPayment({ agentId });
      const backupPath = await payment.exportWallet(gpgKeyId);
      console.log(`Wallet exported to: ${backupPath}`);
      break;
    }

    case 'status': {
      const agentId = args.find(a => a.startsWith('--agent-id='))?.split('=')[1] || 'default';
      const payment = new FeralPayment({ agentId });
      const status = await payment.getStatus();
      console.log(JSON.stringify(status, null, 2));
      await payment.dispose();
      break;
    }

    case 'buy': {
      const agentId = args.find(a => a.startsWith('--agent-id='))?.split('=')[1] || 'default';
      const provider = args[0];
      const task = args.slice(1).join(' ');
      
      if (!provider || !task) {
        console.error('Usage: buy <provider> <task>');
        process.exit(1);
      }

      const payment = new FeralPayment({ agentId });
      const result = await payment.buy(provider, task);
      console.log(JSON.stringify(result, null, 2));
      await payment.dispose();
      break;
    }

    default:
      console.log(`Unknown command: ${command}`);
      console.log('Available commands: generate-wallet, export-wallet, status, buy');
      process.exit(1);
  }
}

// Run CLI if called directly
if (require.main === module) {
  const [,, command, ...args] = process.argv;
  cli(command, args).catch(console.error);
}
