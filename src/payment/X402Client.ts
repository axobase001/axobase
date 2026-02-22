/**
 * X402 Payment Client
 * Implements x402 protocol for AI Agent autonomous payments
 * Handles 402 responses, payment header generation, and settlement polling
 */

import axios, { AxiosResponse, AxiosError } from 'axios';
import { Hex } from 'viem';
import { AgentWallet } from './AgentWallet';
import { MemoryLogger } from './utils/MemoryLogger';
import {
  X402ClientOptions,
  X402Payment,
  X402PaymentInfo,
  X402Evidence,
  X402Config,
  FacilitatorResponse,
  X402HttpResponse,
} from './types';

export class X402Client {
  private network: 'base' | 'baseSepolia';
  private maxRetries: number;
  private retryDelayMs: number;
  private pollIntervalMs: number;
  private pollTimeoutMs: number;
  private config: X402Config;
  private agentWallet: AgentWallet;
  private memoryLogger: MemoryLogger;
  private pendingSettlements: Map<string, X402Evidence> = new Map();

  constructor(
    options: X402ClientOptions,
    config: X402Config,
    agentWallet: AgentWallet,
    memoryLogger: MemoryLogger
  ) {
    this.network = options.network || 'base';
    this.maxRetries = options.maxRetries || 3;
    this.retryDelayMs = options.retryDelayMs || 1000;
    this.pollIntervalMs = options.pollIntervalMs || 5000;
    this.pollTimeoutMs = options.pollTimeoutMs || 300000;
    this.config = config;
    this.agentWallet = agentWallet;
    this.memoryLogger = memoryLogger;
  }

  /**
   * Create X-PAYMENT header for x402 requests
   * Encodes payment data as base64 JSON
   */
  createPaymentHeader(payment: X402Payment): string {
    const paymentJson = JSON.stringify(payment);
    return Buffer.from(paymentJson).toString('base64');
  }

  /**
   * Parse 402 response and extract payment info
   */
  parsePaymentRequired(response: AxiosResponse): X402PaymentInfo {
    const paymentInfoHeader = response.headers['x-payment-info'];
    
    if (!paymentInfoHeader) {
      throw new Error('402 response missing X-PAYMENT-INFO header');
    }

    let paymentInfo: X402PaymentInfo;
    
    try {
      // Try parsing as base64 first
      const decoded = Buffer.from(paymentInfoHeader, 'base64').toString('utf-8');
      paymentInfo = JSON.parse(decoded);
    } catch {
      // Try parsing as plain JSON
      try {
        paymentInfo = JSON.parse(paymentInfoHeader);
      } catch {
        throw new Error('Invalid X-PAYMENT-INFO format');
      }
    }

    // Validate scheme
    if (paymentInfo.scheme !== 'exact') {
      throw new Error(`Unsupported payment scheme: ${paymentInfo.scheme}. Only 'exact' (eip3009) is supported.`);
    }

    // Validate network
    const networkConfig = this.config.networks[this.network];
    if (paymentInfo.networkId !== networkConfig.chainId.toString()) {
      throw new Error(
        `Network mismatch: expected ${networkConfig.chainId}, got ${paymentInfo.networkId}`
      );
    }

    return paymentInfo;
  }

  /**
   * Handle 402 Payment Required response
   * Signs payment and retries request with payment header
   */
  async handlePaymentRequired(
    originalRequest: {
      url: string;
      method: string;
      headers: Record<string, string>;
      data?: unknown;
    },
    paymentInfo: X402PaymentInfo
  ): Promise<AxiosResponse> {
    const { maxAmountRequired, beneficiary, usdcContract, validForSeconds = 60 } = paymentInfo;

    console.log(`[X402Client] Payment required: ${maxAmountRequired} USDC to ${beneficiary}`);

    // Check for price manipulation
    const historicalAvg = await this.memoryLogger.getAverageTransactionCost();
    if (historicalAvg > 0) {
      const deviation = (parseFloat(maxAmountRequired) / historicalAvg - 1) * 100;
      if (deviation > 300) {
        console.warn(`[X402Client] Price deviation ${deviation.toFixed(2)}% detected`);
        await this.memoryLogger.logPriceWarning(
          parseFloat(maxAmountRequired),
          historicalAvg
        );
        throw new Error('Price exceeds 300% of historical average - requires manual confirmation');
      }
    }

    // Check balance
    const balance = this.agentWallet.getUSDCBalance();
    if (balance < parseFloat(maxAmountRequired)) {
      throw new Error(`Insufficient balance: ${balance} USDC < ${maxAmountRequired} USDC required`);
    }

    // Generate signature
    const now = Math.floor(Date.now() / 1000);
    const validAfter = now - 60; // Valid from 1 minute ago
    const validBefore = now + validForSeconds;

    const payment = await this.agentWallet.signPayment(
      beneficiary,
      maxAmountRequired,
      validAfter,
      validBefore
    );

    // Create payment header
    const paymentHeader = this.createPaymentHeader(payment);

    // Retry request with payment
    const headers = {
      ...originalRequest.headers,
      'X-PAYMENT': paymentHeader,
    };

    console.log('[X402Client] Retrying request with payment header');

    const response = await axios({
      url: originalRequest.url,
      method: originalRequest.method,
      headers,
      data: originalRequest.data,
      validateStatus: () => true, // Don't throw on error status
    });

    // Check payment response
    const paymentResponse = response.headers['x-payment-response'];
    if (paymentResponse) {
      const parsed = this.parsePaymentResponse(paymentResponse);
      
      if (parsed.status === 'error') {
        if (parsed.error === 'funds_exceeded') {
          throw new Error('Payment failed: funds exceeded');
        }
        if (parsed.error === 'invalid') {
          // Retry with new nonce
          console.log('[X402Client] Invalid payment, retrying with new nonce');
          return this.handlePaymentRequired(originalRequest, paymentInfo);
        }
        throw new Error(`Payment error: ${parsed.error}`);
      }

      // Payment accepted, submit evidence for settlement
      if (parsed.txHash) {
        const evidence: X402Evidence = {
          txHash: parsed.txHash as Hex,
          networkId: this.config.networks[this.network].chainId.toString(),
          payment,
          timestamp: Date.now(),
        };

        // Start polling for settlement
        this.pollForSettlement(evidence).catch(console.error);
      }
    }

    return response;
  }

  /**
   * Parse X-PAYMENT-RESPONSE header
   */
  private parsePaymentResponse(header: string): {
    status: 'success' | 'error';
    error?: string;
    txHash?: string;
  } {
    try {
      return JSON.parse(Buffer.from(header, 'base64').toString('utf-8'));
    } catch {
      // Try plain JSON
      try {
        return JSON.parse(header);
      } catch {
        // Simple string format
        if (header === 'success') {
          return { status: 'success' };
        }
        if (header.startsWith('error/')) {
          return { status: 'error', error: header.slice(6) };
        }
        return { status: 'error', error: 'unknown' };
      }
    }
  }

  /**
   * Poll for payment settlement via facilitator
   * Implements exponential backoff
   */
  async pollForSettlement(evidence: X402Evidence): Promise<boolean> {
    const network = this.config.networks[this.network];
    const evidenceUrl = `${network.facilitatorUrl}/evidence`;
    
    console.log(`[X402Client] Submitting evidence: ${evidence.txHash}`);

    // Submit evidence
    let retryCount = 0;
    const maxRetries = 5;
    let submitted = false;

    while (!submitted && retryCount < maxRetries) {
      try {
        const response = await axios.post<FacilitatorResponse>(evidenceUrl, evidence, {
          timeout: 30000,
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.data.success) {
          submitted = true;
          console.log(`[X402Client] Evidence submitted: ${evidence.txHash}`);
        } else if (response.data.error) {
          throw new Error(`Facilitator error: ${response.data.error}`);
        }
      } catch (error) {
        retryCount++;
        const delay = Math.pow(1.5, retryCount) * 1000;
        console.warn(`[X402Client] Evidence submission failed (attempt ${retryCount}), retrying in ${delay}ms`);
        await this.sleep(delay);
      }
    }

    if (!submitted) {
      console.error(`[X402Client] Failed to submit evidence after ${maxRetries} attempts`);
      // Cache for later retry
      this.pendingSettlements.set(evidence.txHash, evidence);
      return false;
    }

    // Poll for confirmation
    const startTime = Date.now();
    let confirmed = false;
    let pollAttempts = 0;
    const maxPollAttempts = 60;

    while (!confirmed && pollAttempts < maxPollAttempts) {
      if (Date.now() - startTime > this.pollTimeoutMs) {
        console.warn('[X402Client] Polling timeout reached');
        break;
      }

      try {
        const statusUrl = `${network.facilitatorUrl}/status/${evidence.txHash}`;
        const response = await axios.get<FacilitatorResponse>(statusUrl, {
          timeout: 10000,
        });

        if (response.data.status === 'confirmed') {
          confirmed = true;
          console.log(`[X402Client] Payment confirmed: ${evidence.txHash}`);
        } else if (response.data.status === 'failed') {
          throw new Error(`Settlement failed: ${response.data.error}`);
        }
      } catch (error) {
        // Ignore polling errors, keep trying
      }

      if (!confirmed) {
        pollAttempts++;
        await this.sleep(this.pollIntervalMs);
      }
    }

    return confirmed;
  }

  /**
   * Process any pending settlements (retry cached evidence)
   */
  async processPendingSettlements(): Promise<void> {
    if (this.pendingSettlements.size === 0) return;

    console.log(`[X402Client] Processing ${this.pendingSettlements.size} pending settlements`);

    for (const [txHash, evidence] of this.pendingSettlements) {
      try {
        const success = await this.pollForSettlement(evidence);
        if (success) {
          this.pendingSettlements.delete(txHash);
        }
      } catch (error) {
        console.error(`[X402Client] Failed to process pending settlement ${txHash}:`, error);
      }
    }
  }

  /**
   * Direct on-chain settlement (fallback when facilitator is unavailable)
   */
  async settleOnChain(payment: X402Payment): Promise<Hex | null> {
    console.log('[X402Client] Using on-chain settlement fallback');

    // This requires the wallet client to be initialized
    // Implementation depends on AgentWallet having direct transaction capability
    // For now, return null to indicate fallback not available
    
    console.warn('[X402Client] On-chain settlement not implemented - payment may be pending');
    return null;
  }

  /**
   * Make HTTP request with automatic x402 payment handling
   */
  async request<T = unknown>(
    url: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
      headers?: Record<string, string>;
      data?: unknown;
    } = {}
  ): Promise<X402HttpResponse> {
    const method = options.method || 'GET';
    const headers = options.headers || {};

    // First attempt without payment
    let response = await axios({
      url,
      method,
      headers,
      data: options.data,
      validateStatus: () => true, // Don't throw on error status
    });

    // Check if payment is required
    if (response.status === 402) {
      console.log('[X402Client] Received 402 Payment Required');

      try {
        const paymentInfo = this.parsePaymentRequired(response);
        response = await this.handlePaymentRequired(
          { url, method, headers, data: options.data },
          paymentInfo
        );
      } catch (error) {
        console.error('[X402Client] Payment handling failed:', error);
        return {
          status: 402,
          headers: response.headers as Record<string, string>,
          data: response.data,
          paymentInfo: this.parsePaymentRequired(response),
        };
      }
    }

    return {
      status: response.status,
      headers: response.headers as Record<string, string>,
      data: response.data,
    };
  }

  /**
   * Utility: Sleep for ms
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Utility: Exponential backoff delay
   */
  private getBackoffDelay(attempt: number): number {
    return Math.min(this.retryDelayMs * Math.pow(2, attempt), 30000);
  }
}
