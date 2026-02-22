/**
 * Agent Wallet Manager
 * Manages AI Agent's crypto wallet with secure key storage
 * Handles balance monitoring, ERC-3009 signatures, and provider selection
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  parseUnits,
  formatUnits,
  Hex,
  concat,
  toHex,
  keccak256,
  stringToHex,
} from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { v4 as uuidv4 } from 'uuid';
import { GPGManager } from './utils/GPGManager';
import { secureMemory } from './utils/SecureMemory';
import { MemoryLogger } from './utils/MemoryLogger';
import {
  AgentWalletOptions,
  AgentWalletState,
  X402Payment,
  X402Config,
  ProviderConfig,
  BalanceAlert,
} from './types';

// ERC-3009 TransferWithAuthorization TypeHash
const TRANSFER_WITH_AUTHORIZATION_TYPEHASH = keccak256(
  stringToHex(
    'TransferWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)'
  )
);

// USDC Contract ABI (minimal)
const USDC_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'value', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'validAfter', type: 'uint256' },
      { name: 'validBefore', type: 'uint256' },
      { name: 'nonce', type: 'bytes32' },
      { name: 'v', type: 'uint8' },
      { name: 'r', type: 'bytes32' },
      { name: 's', type: 'bytes32' },
    ],
    name: 'transferWithAuthorization',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'DOMAIN_SEPARATOR',
    outputs: [{ name: '', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export class AgentWallet {
  private agentId: string;
  private feralHome: string;
  private hardwareWallet: boolean;
  private gpgManager: GPGManager;
  private memoryLogger: MemoryLogger;
  private config: X402Config;
  
  private publicClient: ReturnType<typeof createPublicClient>;
  private walletClient: ReturnType<typeof createWalletClient> | null = null;
  private account: ReturnType<typeof privateKeyToAccount> | null = null;
  
  private state: AgentWalletState = {
    address: '',
    balanceUSDC: 0n,
    balanceETH: 0n,
    lastUpdated: 0,
  };

  private balanceCheckInterval: NodeJS.Timeout | null = null;
  private usedNonces: Set<string> = new Set();

  constructor(options: AgentWalletOptions, config: X402Config) {
    this.agentId = options.agentId || process.env.AGENT_ID || 'default';
    this.feralHome = options.feralHome || process.env.FERAL_HOME || '/app';
    this.hardwareWallet = options.hardwareWallet || process.env.HARDWARE_WALLET === 'true';
    this.config = config;

    this.gpgManager = new GPGManager({
      feralHome: this.feralHome,
      agentId: this.agentId,
      passphrase: options.gpgPassphrase,
    });

    this.memoryLogger = new MemoryLogger({
      feralHome: this.feralHome,
      agentId: this.agentId,
    });

    // Initialize Viem clients
    const rpcUrl = process.env.BASE_RPC_URL || 'https://mainnet.base.org';
    const isTestnet = process.env.NETWORK === 'baseSepolia';
    
    this.publicClient = createPublicClient({
      chain: isTestnet ? baseSepolia : base,
      transport: http(rpcUrl),
    });
  }

  /**
   * Initialize wallet - decrypt keys and set up monitoring
   */
  async initialize(): Promise<void> {
    await this.memoryLogger.initialize();

    if (this.hardwareWallet) {
      await this.initializeHardwareWallet();
    } else {
      await this.initializeSoftwareWallet();
    }

    // Start balance monitoring
    this.startBalanceMonitoring();

    console.log(`[AgentWallet] Initialized for agent ${this.agentId} at ${this.state.address}`);
  }

  /**
   * Initialize software wallet from GPG encrypted file
   */
  private async initializeSoftwareWallet(): Promise<void> {
    // Try to get address first (without decrypting)
    let address = await this.gpgManager.getWalletAddress();

    if (!address) {
      // Check if wallet file exists
      const exists = await this.gpgManager.walletExists();
      if (!exists) {
        throw new Error(
          `Wallet not found for agent ${this.agentId}. ` +
          `Create one with: npm run generate-wallet -- --agent-id ${this.agentId}`
        );
      }

      // Decrypt to get address
      const tag = await this.gpgManager.decryptWallet();
      if (!tag) {
        throw new Error('Failed to decrypt wallet');
      }

      const privateKey = secureMemory.retrieve(tag);
      if (!privateKey) {
        throw new Error('Private key not found in secure memory');
      }

      this.account = privateKeyToAccount(('0x' + privateKey.toString('hex')) as Hex);
      address = this.account.address;

      // Save address for future reference
      await this.gpgManager.saveWalletAddress(address);

      // Initialize wallet client
      const rpcUrl = process.env.BASE_RPC_URL || 'https://mainnet.base.org';
      const isTestnet = process.env.NETWORK === 'baseSepolia';
      
      this.walletClient = createWalletClient({
        account: this.account,
        chain: isTestnet ? baseSepolia : base,
        transport: http(rpcUrl),
      });

      // Clear private key from secure memory (we have the account now)
      secureMemory.clear(tag);
    } else {
      this.state.address = address;
      
      // We still need to decrypt for signing operations
      // This will happen on-demand in signPayment
    }

    this.state.address = address;
  }

  /**
   * Initialize hardware wallet (Ledger/Trezor)
   * Placeholder for hardware wallet integration
   */
  private async initializeHardwareWallet(): Promise<void> {
    // TODO: Implement hardware wallet support
    throw new Error('Hardware wallet support not yet implemented');
  }

  /**
   * Get wallet address
   */
  getAddress(): string {
    return this.state.address;
  }

  /**
   * Get current balances
   */
  getBalances(): { usdc: bigint; eth: bigint } {
    return {
      usdc: this.state.balanceUSDC,
      eth: this.state.balanceETH,
    };
  }

  /**
   * Get USDC balance as formatted number
   */
  getUSDCBalance(): number {
    return parseFloat(formatUnits(this.state.balanceUSDC, 6));
  }

  /**
   * Update and return current balances from chain
   */
  async updateBalances(): Promise<AgentWalletState> {
    if (!this.state.address) {
      throw new Error('Wallet not initialized');
    }

    try {
      const network = process.env.NETWORK === 'baseSepolia' ? 'baseSepolia' : 'base';
      const usdcContract = this.config.networks[network].usdcContract as Hex;

      // Get USDC balance
      const usdcBalance = await this.publicClient.readContract({
        address: usdcContract,
        abi: USDC_ABI,
        functionName: 'balanceOf',
        args: [this.state.address as Hex],
      });

      // Get ETH balance
      const ethBalance = await this.publicClient.getBalance({
        address: this.state.address as Hex,
      });

      this.state.balanceUSDC = usdcBalance;
      this.state.balanceETH = ethBalance;
      this.state.lastUpdated = Date.now();

      return this.state;
    } catch (error) {
      console.error('[AgentWallet] Failed to update balances:', error);
      throw error;
    }
  }

  /**
   * Start periodic balance monitoring
   */
  private startBalanceMonitoring(): void {
    // Initial check
    this.checkBalanceAndAlert();

    // Check every minute
    this.balanceCheckInterval = setInterval(() => {
      this.checkBalanceAndAlert();
    }, 60000);
  }

  /**
   * Check balance and trigger alerts if needed
   */
  private async checkBalanceAndAlert(): Promise<void> {
    try {
      await this.updateBalances();
      const balance = this.getUSDCBalance();
      const thresholds = this.config.thresholds;

      let alert: BalanceAlert | null = null;

      if (balance < thresholds.criticalBalance) {
        alert = {
          level: 'CRITICAL',
          currentBalance: balance,
          threshold: thresholds.criticalBalance,
          timestamp: new Date().toISOString(),
          agentId: this.agentId,
        };
      } else if (balance < thresholds.lowBalance) {
        alert = {
          level: 'LOW',
          currentBalance: balance,
          threshold: thresholds.lowBalance,
          timestamp: new Date().toISOString(),
          agentId: this.agentId,
        };
      }

      if (alert) {
        await this.memoryLogger.logBalanceAlert(alert);
        console.warn(`[AgentWallet] Balance alert [${alert.level}]: ${balance} USDC`);
      }
    } catch (error) {
      console.error('[AgentWallet] Balance check failed:', error);
    }
  }

  /**
   * Stop balance monitoring
   */
  stopBalanceMonitoring(): void {
    if (this.balanceCheckInterval) {
      clearInterval(this.balanceCheckInterval);
      this.balanceCheckInterval = null;
    }
  }

  /**
   * Sign ERC-3009 payment authorization
   */
  async signPayment(
    to: string,
    value: string,
    validAfter: number,
    validBefore: number
  ): Promise<X402Payment> {
    // Generate unique nonce
    const nonce = '0x' + Buffer.from(uuidv4().replace(/-/g, ''), 'hex').toString('hex');
    
    // Check for replay
    if (this.usedNonces.has(nonce)) {
      throw new Error('Nonce already used - possible replay attack');
    }
    this.usedNonces.add(nonce);

    // Clean up old nonces after 5 minutes
    setTimeout(() => {
      this.usedNonces.delete(nonce);
    }, 5 * 60 * 1000);

    if (this.hardwareWallet) {
      return this.signWithHardware(to, value, validAfter, validBefore, nonce);
    }

    return this.signWithSoftware(to, value, validAfter, validBefore, nonce);
  }

  /**
   * Sign payment with software wallet
   */
  private async signWithSoftware(
    to: string,
    value: string,
    validAfter: number,
    validBefore: number,
    nonce: string
  ): Promise<X402Payment> {
    // Decrypt private key
    const tag = await this.gpgManager.decryptWallet();
    if (!tag) {
      throw new Error('Failed to decrypt wallet for signing');
    }

    try {
      const privateKeyBuffer = secureMemory.retrieve(tag);
      if (!privateKeyBuffer) {
        throw new Error('Private key not available in secure memory');
      }

      const privateKey = ('0x' + privateKeyBuffer.toString('hex')) as Hex;
      const account = privateKeyToAccount(privateKey);

      const network = process.env.NETWORK === 'baseSepolia' ? 'baseSepolia' : 'base';
      const usdcContract = this.config.networks[network].usdcContract as Hex;

      // Get domain separator
      const domainSeparator = await this.publicClient.readContract({
        address: usdcContract,
        abi: USDC_ABI,
        functionName: 'DOMAIN_SEPARATOR',
      });

      // Construct EIP-712 hash
      const valueInUnits = parseUnits(value, 6);
      
      const structHash = keccak256(
        concat([
          TRANSFER_WITH_AUTHORIZATION_TYPEHASH,
          toHex(this.state.address, { size: 32 }),
          toHex(to, { size: 32 }),
          toHex(valueInUnits, { size: 32 }),
          toHex(BigInt(validAfter), { size: 32 }),
          toHex(BigInt(validBefore), { size: 32 }),
          nonce as Hex,
        ])
      );

      const digest = keccak256(
        concat([
          stringToHex('\x19\x01'),
          domainSeparator,
          structHash,
        ])
      );

      // Sign
      const signature = await account.signMessage({
        message: { raw: digest },
      });

      // Parse signature
      const r = signature.slice(0, 66) as Hex;
      const s = ('0x' + signature.slice(66, 130)) as Hex;
      const v = parseInt(signature.slice(130, 132), 16);

      return {
        from: this.state.address,
        to,
        value: valueInUnits.toString(),
        validAfter,
        validBefore,
        nonce,
        v,
        r,
        s,
      };
    } finally {
      // Always clear private key from memory
      secureMemory.clear(tag);
    }
  }

  /**
   * Sign payment with hardware wallet
   */
  private async signWithHardware(
    _to: string,
    _value: string,
    _validAfter: number,
    _validBefore: number,
    _nonce: string
  ): Promise<X402Payment> {
    throw new Error('Hardware wallet signing not implemented');
  }

  /**
   * Get optimal provider based on balance
   */
  getOptimalProvider(): ProviderConfig | null {
    const balance = this.getUSDCBalance();
    const sortedProviders = [...this.config.providers].sort(
      (a, b) => a.priority - b.priority
    );

    for (const provider of sortedProviders) {
      const maxCost = provider.maxCostPerRequest || Infinity;
      if (balance >= maxCost) {
        return provider;
      }
    }

    return null; // No affordable provider
  }

  /**
   * Check if balance is sufficient for a provider
   */
  canAfford(providerName: string): boolean {
    const provider = this.config.providers.find(p => p.name === providerName);
    if (!provider) return false;
    
    const maxCost = provider.maxCostPerRequest || Infinity;
    return this.getUSDCBalance() >= maxCost;
  }

  /**
   * Clean up resources
   */
  async dispose(): Promise<void> {
    this.stopBalanceMonitoring();
    // Clear any remaining sensitive data
    secureMemory.clearAll();
  }
}
