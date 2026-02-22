/**
 * AgentWallet Unit Tests
 * Tests wallet management, balance monitoring, and ERC-3009 signing
 */

import { AgentWallet } from '../AgentWallet';
import { GPGManager } from '../utils/GPGManager';
import { secureMemory } from '../utils/SecureMemory';
import { X402Config } from '../types';

// Mock GPGManager
jest.mock('../utils/GPGManager');

// Mock viem
jest.mock('viem', () => ({
  createPublicClient: jest.fn().mockReturnValue({
    readContract: jest.fn(),
    getBalance: jest.fn(),
  }),
  createWalletClient: jest.fn().mockReturnValue({
    // mock methods
  }),
  parseUnits: jest.fn().mockReturnValue(1000000n),
  formatUnits: jest.fn().mockReturnValue('1.0'),
  keccak256: jest.fn().mockReturnValue('0x1234'),
  concat: jest.fn().mockReturnValue('0xconcat'),
  toHex: jest.fn().mockReturnValue('0xhex'),
  stringToHex: jest.fn().mockReturnValue('0xstring'),
}));

jest.mock('viem/accounts', () => ({
  privateKeyToAccount: jest.fn().mockReturnValue({
    address: '0x1234567890123456789012345678901234567890',
    signMessage: jest.fn().mockResolvedValue('0xsignature'),
  }),
}));

jest.mock('../utils/MemoryLogger', () => ({
  MemoryLogger: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    logBalanceAlert: jest.fn().mockResolvedValue(undefined),
    getAverageTransactionCost: jest.fn().mockResolvedValue(0),
  })),
}));

const mockConfig: X402Config = {
  networks: {
    base: {
      usdcContract: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      chainId: 8453,
      facilitatorUrl: 'https://x402.org/facilitator',
    },
    baseSepolia: {
      usdcContract: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
      chainId: 84532,
      facilitatorUrl: 'https://x402.org/facilitator',
    },
  },
  providers: [
    {
      name: 'AINFT',
      endpoint: 'https://api.ainft.com',
      supportsX402: true,
      model: 'claude-3-5-sonnet',
      priority: 1,
      maxCostPerRequest: 1.0,
    },
    {
      name: 'backup',
      endpoint: 'https://backup.com',
      supportsX402: false,
      priority: 2,
      maxCostPerRequest: 0.5,
    },
  ],
  thresholds: {
    criticalBalance: 5,
    lowBalance: 20,
    autoRefill: 50,
  },
};

describe('AgentWallet', () => {
  let wallet: AgentWallet;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock GPGManager methods
    (GPGManager as jest.MockedClass<typeof GPGManager>).mockImplementation(() => ({
      walletExists: jest.fn().mockResolvedValue(true),
      getWalletAddress: jest.fn().mockResolvedValue('0x1234567890123456789012345678901234567890'),
      decryptWallet: jest.fn().mockResolvedValue('wallet_tag_123'),
      saveWalletAddress: jest.fn().mockResolvedValue(undefined),
    } as any));

    wallet = new AgentWallet(
      {
        agentId: 'test-agent',
        feralHome: '/tmp/test',
        gpgPassphrase: 'test-passphrase',
      },
      mockConfig
    );
  });

  afterEach(() => {
    secureMemory.clearAll();
  });

  describe('initialize', () => {
    it('should initialize with existing wallet', async () => {
      await wallet.initialize();
      
      expect(wallet.getAddress()).toBe('0x1234567890123456789012345678901234567890');
    });

    it('should throw error if wallet does not exist', async () => {
      (GPGManager as jest.MockedClass<typeof GPGManager>).mockImplementation(() => ({
        walletExists: jest.fn().mockResolvedValue(false),
        getWalletAddress: jest.fn().mockResolvedValue(null),
      } as any));

      const newWallet = new AgentWallet(
        {
          agentId: 'test-agent',
          feralHome: '/tmp/test',
          gpgPassphrase: 'test-passphrase',
        },
        mockConfig
      );

      await expect(newWallet.initialize()).rejects.toThrow('Wallet not found');
    });
  });

  describe('getOptimalProvider', () => {
    it('should return highest priority affordable provider', async () => {
      await wallet.initialize();
      
      // Mock sufficient balance
      jest.spyOn(wallet as any, 'state', 'get').mockReturnValue({
        address: '0x1234',
        balanceUSDC: 2000000n, // 2 USDC
        balanceETH: 1000000000000000000n,
        lastUpdated: Date.now(),
      });

      const provider = wallet.getOptimalProvider();
      
      expect(provider).toBeDefined();
      expect(provider?.name).toBe('AINFT');
    });

    it('should return fallback provider if primary is unaffordable', async () => {
      await wallet.initialize();
      
      // Mock low balance
      jest.spyOn(wallet as any, 'state', 'get').mockReturnValue({
        address: '0x1234',
        balanceUSDC: 300000n, // 0.3 USDC
        balanceETH: 1000000000000000000n,
        lastUpdated: Date.now(),
      });

      const provider = wallet.getOptimalProvider();
      
      // Should return null since even backup requires 0.5
      expect(provider).toBeNull();
    });
  });

  describe('canAfford', () => {
    it('should return true if balance is sufficient', async () => {
      await wallet.initialize();
      
      jest.spyOn(wallet as any, 'state', 'get').mockReturnValue({
        address: '0x1234',
        balanceUSDC: 2000000n, // 2 USDC
        balanceETH: 1000000000000000000n,
        lastUpdated: Date.now(),
      });

      expect(wallet.canAfford('AINFT')).toBe(true);
    });

    it('should return false if balance is insufficient', async () => {
      await wallet.initialize();
      
      jest.spyOn(wallet as any, 'state', 'get').mockReturnValue({
        address: '0x1234',
        balanceUSDC: 100000n, // 0.1 USDC
        balanceETH: 1000000000000000000n,
        lastUpdated: Date.now(),
      });

      expect(wallet.canAfford('AINFT')).toBe(false);
    });
  });

  describe('signPayment', () => {
    it('should generate valid ERC-3009 payment structure', async () => {
      await wallet.initialize();

      // Store mock private key in secure memory
      secureMemory.store('wallet_test-agent', Buffer.from('1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef', 'hex'));

      (GPGManager as jest.MockedClass<typeof GPGManager>).mockImplementation(() => ({
        decryptWallet: jest.fn().mockResolvedValue('wallet_test-agent'),
      } as any));

      const payment = await wallet.signPayment(
        '0x0987654321098765432109876543210987654321',
        '1.0',
        Math.floor(Date.now() / 1000) - 60,
        Math.floor(Date.now() / 1000) + 300
      );

      expect(payment).toHaveProperty('from');
      expect(payment).toHaveProperty('to');
      expect(payment).toHaveProperty('value');
      expect(payment).toHaveProperty('validAfter');
      expect(payment).toHaveProperty('validBefore');
      expect(payment).toHaveProperty('nonce');
      expect(payment).toHaveProperty('v');
      expect(payment).toHaveProperty('r');
      expect(payment).toHaveProperty('s');
      
      // Validate nonce format (UUID v4)
      expect(payment.nonce).toMatch(/^0x[0-9a-f]{32}$/i);
    });

    it('should prevent replay attacks with unique nonces', async () => {
      await wallet.initialize();

      secureMemory.store('wallet_test-agent', Buffer.from('1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef', 'hex'));

      (GPGManager as jest.MockedClass<typeof GPGManager>).mockImplementation(() => ({
        decryptWallet: jest.fn().mockResolvedValue('wallet_test-agent'),
      } as any));

      const nonce1 = (await wallet.signPayment(
        '0x0987654321098765432109876543210987654321',
        '1.0',
        1000,
        2000
      )).nonce;

      const nonce2 = (await wallet.signPayment(
        '0x0987654321098765432109876543210987654321',
        '1.0',
        1000,
        2000
      )).nonce;

      expect(nonce1).not.toBe(nonce2);
    });
  });

  describe('balance monitoring', () => {
    it('should start monitoring on initialize', async () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval');
      
      await wallet.initialize();
      
      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 60000);
      
      wallet.stopBalanceMonitoring();
    });

    it('should stop monitoring on dispose', async () => {
      await wallet.initialize();
      
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      
      await wallet.dispose();
      
      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });

  describe('getUSDCBalance', () => {
    it('should return formatted USDC balance', async () => {
      await wallet.initialize();
      
      jest.spyOn(wallet as any, 'state', 'get').mockReturnValue({
        address: '0x1234',
        balanceUSDC: 1500000n, // 1.5 USDC (6 decimals)
        balanceETH: 1000000000000000000n,
        lastUpdated: Date.now(),
      });

      const balance = wallet.getUSDCBalance();
      
      expect(balance).toBe(1.5);
    });
  });
});
