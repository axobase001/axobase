/**
 * X402Client Unit Tests
 * Tests payment header generation, 402 response handling, and settlement polling
 */

import nock from 'nock';
import { X402Client } from '../X402Client';
import { AgentWallet } from '../AgentWallet';
import { MemoryLogger } from '../utils/MemoryLogger';
import { X402Config, X402Payment } from '../types';
import { Hex } from 'viem';

// Mock config
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
  providers: [],
  thresholds: {
    criticalBalance: 5,
    lowBalance: 20,
    autoRefill: 50,
  },
};

// Mock AgentWallet
const mockAgentWallet = {
  getAddress: jest.fn().mockReturnValue('0x1234567890123456789012345678901234567890'),
  getUSDCBalance: jest.fn().mockReturnValue(100),
  signPayment: jest.fn().mockResolvedValue({
    from: '0x1234567890123456789012345678901234567890',
    to: '0x0987654321098765432109876543210987654321',
    value: '1000000',
    validAfter: Math.floor(Date.now() / 1000) - 60,
    validBefore: Math.floor(Date.now() / 1000) + 300,
    nonce: '0x1234567890abcdef',
    v: 27,
    r: '0x1234567890abcdef' as Hex,
    s: '0xfedcba0987654321' as Hex,
  } as X402Payment),
} as unknown as AgentWallet;

// Mock MemoryLogger
const mockMemoryLogger = {
  logPayment: jest.fn().mockResolvedValue(undefined),
  getAverageTransactionCost: jest.fn().mockResolvedValue(0.01),
  logPriceWarning: jest.fn().mockResolvedValue(undefined),
} as unknown as MemoryLogger;

describe('X402Client', () => {
  let client: X402Client;

  beforeEach(() => {
    client = new X402Client(
      { network: 'baseSepolia' },
      mockConfig,
      mockAgentWallet,
      mockMemoryLogger
    );
    nock.cleanAll();
  });

  afterEach(() => {
    nock.cleanAll();
    jest.clearAllMocks();
  });

  describe('createPaymentHeader', () => {
    it('should create valid base64 encoded payment header', () => {
      const payment: X402Payment = {
        from: '0x1234',
        to: '0x5678',
        value: '1000000',
        validAfter: 1234567890,
        validBefore: 1234567990,
        nonce: '0xabcdef',
        v: 27,
        r: '0x1234' as Hex,
        s: '0x5678' as Hex,
      };

      const header = client.createPaymentHeader(payment);
      const decoded = JSON.parse(Buffer.from(header, 'base64').toString('utf-8'));

      expect(decoded).toEqual(payment);
    });
  });

  describe('parsePaymentRequired', () => {
    it('should parse 402 response with X-PAYMENT-INFO header', () => {
      const paymentInfo = {
        scheme: 'exact',
        networkId: '84532',
        maxAmountRequired: '1000000',
        resource: 'https://api.example.com/inference',
        beneficiary: '0x0987654321098765432109876543210987654321',
        usdcContract: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
        validForSeconds: 60,
      };

      const response = {
        headers: {
          'x-payment-info': Buffer.from(JSON.stringify(paymentInfo)).toString('base64'),
        },
        status: 402,
        data: { error: 'Payment required' },
      };

      const parsed = client.parsePaymentRequired(response as any);
      expect(parsed).toEqual(paymentInfo);
    });

    it('should throw error for unsupported scheme', () => {
      const paymentInfo = {
        scheme: 'unsupported',
        networkId: '84532',
        maxAmountRequired: '1000000',
        resource: 'https://api.example.com/inference',
      };

      const response = {
        headers: {
          'x-payment-info': Buffer.from(JSON.stringify(paymentInfo)).toString('base64'),
        },
        status: 402,
        data: {},
      };

      expect(() => client.parsePaymentRequired(response as any)).toThrow('Unsupported payment scheme');
    });

    it('should throw error for network mismatch', () => {
      const paymentInfo = {
        scheme: 'exact',
        networkId: '1', // Ethereum mainnet, not Base
        maxAmountRequired: '1000000',
        resource: 'https://api.example.com/inference',
      };

      const response = {
        headers: {
          'x-payment-info': Buffer.from(JSON.stringify(paymentInfo)).toString('base64'),
        },
        status: 402,
        data: {},
      };

      expect(() => client.parsePaymentRequired(response as any)).toThrow('Network mismatch');
    });
  });

  describe('handlePaymentRequired', () => {
    it('should handle payment and retry request successfully', async () => {
      const paymentInfo = {
        scheme: 'exact' as const,
        networkId: '84532',
        maxAmountRequired: '1000000',
        resource: 'https://api.example.com/inference',
        beneficiary: '0x0987654321098765432109876543210987654321',
        usdcContract: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
        validForSeconds: 60,
      };

      // Mock successful response after payment
      nock('https://api.example.com')
        .post('/inference')
        .reply(200, { result: 'success' }, {
          'X-PAYMENT-RESPONSE': Buffer.from(JSON.stringify({
            status: 'success',
            txHash: '0x1234567890abcdef',
          })).toString('base64'),
        });

      const originalRequest = {
        url: 'https://api.example.com/inference',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        data: { prompt: 'test' },
      };

      const response = await client.handlePaymentRequired(originalRequest, paymentInfo);

      expect(response.status).toBe(200);
      expect(mockAgentWallet.signPayment).toHaveBeenCalled();
    });

    it('should throw error for insufficient balance', async () => {
      mockAgentWallet.getUSDCBalance.mockReturnValueOnce(0.001); // Very low balance

      const paymentInfo = {
        scheme: 'exact' as const,
        networkId: '84532',
        maxAmountRequired: '1000000', // 1 USDC
        resource: 'https://api.example.com/inference',
        beneficiary: '0x0987654321098765432109876543210987654321',
        usdcContract: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
      };

      const originalRequest = {
        url: 'https://api.example.com/inference',
        method: 'POST',
        headers: {},
      };

      await expect(client.handlePaymentRequired(originalRequest, paymentInfo))
        .rejects.toThrow('Insufficient balance');
    });

    it('should detect price manipulation', async () => {
      mockMemoryLogger.getAverageTransactionCost.mockResolvedValueOnce(0.001); // Very low average

      const paymentInfo = {
        scheme: 'exact' as const,
        networkId: '84532',
        maxAmountRequired: '10000000', // 10 USDC - 10000% of average
        resource: 'https://api.example.com/inference',
        beneficiary: '0x0987654321098765432109876543210987654321',
        usdcContract: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
      };

      const originalRequest = {
        url: 'https://api.example.com/inference',
        method: 'POST',
        headers: {},
      };

      await expect(client.handlePaymentRequired(originalRequest, paymentInfo))
        .rejects.toThrow('Price exceeds 300% of historical average');

      expect(mockMemoryLogger.logPriceWarning).toHaveBeenCalled();
    });
  });

  describe('pollForSettlement', () => {
    it('should successfully poll for settlement', async () => {
      const evidence = {
        txHash: '0x1234567890abcdef' as Hex,
        networkId: '84532',
        payment: {} as X402Payment,
        timestamp: Date.now(),
      };

      // Mock evidence submission
      nock('https://x402.org')
        .post('/facilitator/evidence')
        .reply(200, { success: true });

      // Mock status polling
      nock('https://x402.org')
        .get('/facilitator/status/0x1234567890abcdef')
        .reply(200, { status: 'confirmed' });

      const result = await client.pollForSettlement(evidence);

      expect(result).toBe(true);
    });

    it('should handle facilitator errors with retry', async () => {
      const evidence = {
        txHash: '0x1234567890abcdef' as Hex,
        networkId: '84532',
        payment: {} as X402Payment,
        timestamp: Date.now(),
      };

      // First attempt fails
      nock('https://x402.org')
        .post('/facilitator/evidence')
        .reply(500, { error: 'Internal error' });

      // Second attempt succeeds
      nock('https://x402.org')
        .post('/facilitator/evidence')
        .reply(200, { success: true });

      // Status polling
      nock('https://x402.org')
        .get('/facilitator/status/0x1234567890abcdef')
        .reply(200, { status: 'confirmed' });

      const result = await client.pollForSettlement(evidence);

      expect(result).toBe(true);
    });
  });

  describe('request', () => {
    it('should make successful request without payment', async () => {
      nock('https://api.example.com')
        .get('/data')
        .reply(200, { result: 'success' });

      const response = await client.request('https://api.example.com/data');

      expect(response.status).toBe(200);
      expect(response.data).toEqual({ result: 'success' });
    });

    it('should handle 402 and automatically pay', async () => {
      const paymentInfo = {
        scheme: 'exact',
        networkId: '84532',
        maxAmountRequired: '1000000',
        resource: 'https://api.example.com/inference',
        beneficiary: '0x0987654321098765432109876543210987654321',
        usdcContract: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
        validForSeconds: 60,
      };

      // First request returns 402
      nock('https://api.example.com')
        .post('/inference')
        .reply(402, { error: 'Payment required' }, {
          'X-PAYMENT-INFO': Buffer.from(JSON.stringify(paymentInfo)).toString('base64'),
        });

      // Second request (with payment) succeeds
      nock('https://api.example.com')
        .post('/inference')
        .reply(200, { result: 'success' }, {
          'X-PAYMENT-RESPONSE': Buffer.from(JSON.stringify({
            status: 'success',
            txHash: '0x1234567890abcdef',
          })).toString('base64'),
        });

      // Mock facilitator
      nock('https://x402.org')
        .post('/facilitator/evidence')
        .reply(200, { success: true });

      nock('https://x402.org')
        .get('/facilitator/status/0x1234567890abcdef')
        .reply(200, { status: 'confirmed' });

      const response = await client.request('https://api.example.com/inference', {
        method: 'POST',
        data: { prompt: 'test' },
      });

      expect(response.status).toBe(200);
    });
  });
});
