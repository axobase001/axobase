/**
 * Inference Service Purchaser
 * Handles AI inference service procurement with automatic payment
 * Supports x402 providers and fallback to traditional API key mode
 */

import axios, { AxiosResponse } from 'axios';
import { X402Client } from './X402Client';
import { AgentWallet } from './AgentWallet';
import { MemoryLogger } from './utils/MemoryLogger';
import {
  X402Config,
  ProviderConfig,
  InferenceRequest,
  InferenceResponse,
  X402PaymentInfo,
  PaymentReceipt,
} from './types';

interface QuoteResult {
  provider: ProviderConfig;
  cost: number;
  supportsX402: boolean;
  available: boolean;
  error?: string;
}

export class InferencePurchaser {
  private x402Client: X402Client;
  private agentWallet: AgentWallet;
  private memoryLogger: MemoryLogger;
  private config: X402Config;
  private usedNonces: Set<string> = new Set();

  constructor(
    x402Client: X402Client,
    agentWallet: AgentWallet,
    memoryLogger: MemoryLogger,
    config: X402Config
  ) {
    this.x402Client = x402Client;
    this.agentWallet = agentWallet;
    this.memoryLogger = memoryLogger;
    this.config = config;
  }

  /**
   * Fetch inference with automatic payment handling
   * Main entry point for inference requests
   */
  async fetchWithPayment(
    request: InferenceRequest,
    preferredProvider?: string
  ): Promise<InferenceResponse> {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Get quotes from available providers
    const quotes = await this.getQuotes(request);
    
    // Sort by priority and cost
    const sortedQuotes = quotes
      .filter(q => q.available)
      .sort((a, b) => {
        // Priority first, then cost
        if (a.provider.priority !== b.provider.priority) {
          return a.provider.priority - b.provider.priority;
        }
        return a.cost - b.cost;
      });

    // Use preferred provider if specified and available
    let selectedQuote: QuoteResult | undefined;
    if (preferredProvider) {
      selectedQuote = sortedQuotes.find(q => q.provider.name === preferredProvider);
    }
    
    // Otherwise use best available
    if (!selectedQuote) {
      selectedQuote = sortedQuotes[0];
    }

    if (!selectedQuote) {
      throw new Error('No available providers with sufficient balance');
    }

    console.log(`[InferencePurchaser] Selected provider: ${selectedQuote.provider.name}`);

    // Execute request
    try {
      if (selectedQuote.supportsX402) {
        return await this.fetchWithX402(selectedQuote.provider, request, taskId);
      } else {
        return await this.fetchWithApiKey(selectedQuote.provider, request, taskId);
      }
    } catch (error) {
      console.error(`[InferencePurchaser] Failed with ${selectedQuote.provider.name}:`, error);
      
      // Try next available provider
      const fallbackQuotes = sortedQuotes.filter(q => q.provider.name !== selectedQuote!.provider.name);
      for (const fallback of fallbackQuotes) {
        try {
          console.log(`[InferencePurchaser] Trying fallback: ${fallback.provider.name}`);
          if (fallback.supportsX402) {
            return await this.fetchWithX402(fallback.provider, request, taskId);
          } else {
            return await this.fetchWithApiKey(fallback.provider, request, taskId);
          }
        } catch (fallbackError) {
          console.error(`[InferencePurchaser] Fallback ${fallback.provider.name} failed:`, fallbackError);
        }
      }

      throw new Error('All providers failed');
    }
  }

  /**
   * Get quotes from all providers
   */
  private async getQuotes(request: InferenceRequest): Promise<QuoteResult[]> {
    const quotes: QuoteResult[] = [];
    const balance = this.agentWallet.getUSDCBalance();

    for (const provider of this.config.providers) {
      try {
        if (provider.supportsX402) {
          const quote = await this.getX402Quote(provider, request);
          quotes.push(quote);
        } else {
          // For API key providers, estimate cost based on token count
          const estimatedCost = this.estimateTokenCost(request, provider);
          quotes.push({
            provider,
            cost: estimatedCost,
            supportsX402: false,
            available: balance >= estimatedCost && this.hasApiKey(provider),
          });
        }
      } catch (error) {
        quotes.push({
          provider,
          cost: Infinity,
          supportsX402: provider.supportsX402,
          available: false,
          error: (error as Error).message,
        });
      }
    }

    return quotes;
  }

  /**
   * Get quote from x402 provider (OPTIONS request)
   */
  private async getX402Quote(
    provider: ProviderConfig,
    request: InferenceRequest
  ): Promise<QuoteResult> {
    try {
      // Send OPTIONS request to get quote
      const response = await axios({
        url: provider.endpoint,
        method: 'OPTIONS',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-Preview': JSON.stringify(request),
        },
        timeout: 10000,
        validateStatus: () => true,
      });

      if (response.status === 402) {
        const paymentInfo = this.x402Client.parsePaymentRequired(response);
        const cost = parseFloat(paymentInfo.maxAmountRequired);
        const balance = this.agentWallet.getUSDCBalance();

        return {
          provider,
          cost,
          supportsX402: true,
          available: balance >= cost,
        };
      }

      // Provider doesn't require payment or has free tier
      return {
        provider,
        cost: 0,
        supportsX402: true,
        available: true,
      };
    } catch (error) {
      throw new Error(`Quote failed: ${(error as Error).message}`);
    }
  }

  /**
   * Fetch inference with x402 payment
   */
  private async fetchWithX402(
    provider: ProviderConfig,
    request: InferenceRequest,
    taskId: string
  ): Promise<InferenceResponse> {
    console.log(`[InferencePurchaser] Requesting inference from ${provider.name} with x402`);

    // First request without payment to get 402
    let response = await axios({
      url: provider.endpoint,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      data: request,
      timeout: 60000,
      validateStatus: () => true,
    });

    let paymentInfo: X402PaymentInfo | undefined;

    if (response.status === 402) {
      paymentInfo = this.x402Client.parsePaymentRequired(response);

      // Handle payment and retry
      response = await this.x402Client.handlePaymentRequired(
        {
          url: provider.endpoint,
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          data: request,
        },
        paymentInfo
      );
    }

    if (response.status !== 200) {
      throw new Error(`Inference request failed: ${response.status} ${response.statusText}`);
    }

    // Parse response
    const inferenceData = this.parseInferenceResponse(response, provider);
    
    // Get transaction hash from payment response
    const txHash = this.extractTxHash(response);
    
    // Log payment
    const receipt: PaymentReceipt = {
      id: taskId,
      timestamp: new Date().toISOString(),
      provider: provider.name,
      model: provider.model || 'unknown',
      cost: paymentInfo ? paymentInfo.maxAmountRequired : '0',
      currency: 'USDC',
      txHash,
      taskId,
      success: true,
      responseSummary: inferenceData.content.substring(0, 100),
    };

    await this.memoryLogger.logPayment(receipt);
    await this.memoryLogger.commitToGit(`[PAY] -${receipt.cost} USDC to ${provider.name} for ${taskId}`);

    return {
      ...inferenceData,
      cost: parseFloat(receipt.cost),
      paymentHash: txHash,
    };
  }

  /**
   * Fetch inference with traditional API key
   * Fallback for non-x402 providers
   */
  private async fetchWithApiKey(
    provider: ProviderConfig,
    request: InferenceRequest,
    taskId: string
  ): Promise<InferenceResponse> {
    console.log(`[InferencePurchaser] Requesting inference from ${provider.name} with API key`);

    const apiKey = this.getApiKey(provider);
    if (!apiKey) {
      throw new Error(`API key not found for provider ${provider.name}`);
    }

    const response = await axios({
      url: provider.endpoint,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      data: this.transformRequestForProvider(request, provider),
      timeout: 60000,
    });

    // Parse response
    const inferenceData = this.parseInferenceResponse(response, provider);

    // Estimate cost (API key providers don't give exact cost)
    const estimatedCost = this.estimateTokenCost(request, provider, inferenceData.usage);

    // Log (no txHash for API key payments)
    const receipt: PaymentReceipt = {
      id: taskId,
      timestamp: new Date().toISOString(),
      provider: provider.name,
      model: provider.model || 'unknown',
      cost: estimatedCost.toFixed(6),
      currency: 'USDC',
      taskId,
      success: true,
      responseSummary: inferenceData.content.substring(0, 100),
    };

    await this.memoryLogger.logPayment(receipt);

    return {
      ...inferenceData,
      cost: estimatedCost,
    };
  }

  /**
   * Parse inference response from different providers
   */
  private parseInferenceResponse(
    response: AxiosResponse,
    provider: ProviderConfig
  ): Omit<InferenceResponse, 'cost' | 'paymentHash'> {
    const data = response.data;

    // OpenAI-compatible format
    if (data.choices && data.choices[0]) {
      return {
        content: data.choices[0].message?.content || data.choices[0].text || '',
        model: data.model || provider.model || 'unknown',
        usage: data.usage || {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0,
        },
      };
    }

    // AINFT format
    if (data.response || data.content) {
      return {
        content: data.response || data.content,
        model: data.model || provider.model || 'unknown',
        usage: data.usage || {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0,
        },
      };
    }

    // Generic fallback
    return {
      content: JSON.stringify(data),
      model: provider.model || 'unknown',
      usage: {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      },
    };
  }

  /**
   * Transform request for specific provider format
   */
  private transformRequestForProvider(
    request: InferenceRequest,
    provider: ProviderConfig
  ): unknown {
    // Default OpenAI-compatible format
    const transformed = {
      model: provider.model,
      messages: request.messages,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.max_tokens ?? 2048,
    };

    // Provider-specific transformations
    if (provider.name === 'AINFT') {
      return {
        ...transformed,
        // AINFT-specific parameters
        stream: false,
      };
    }

    return transformed;
  }

  /**
   * Estimate token cost for API key providers
   */
  private estimateTokenCost(
    request: InferenceRequest,
    provider: ProviderConfig,
    usage?: { prompt_tokens: number; completion_tokens: number }
  ): number {
    // Rough estimation: 1000 tokens ~= 750 words
    const promptWords = request.messages.reduce(
      (sum, m) => sum + m.content.split(/\s+/).length,
      0
    );
    const promptTokens = Math.ceil(promptWords * 1.33);
    const estimatedCompletionTokens = request.max_tokens || 1024;

    const totalTokens = usage
      ? usage.prompt_tokens + usage.completion_tokens
      : promptTokens + estimatedCompletionTokens;

    // Pricing per 1K tokens (approximate)
    const pricing: Record<string, number> = {
      'backup-openrouter': 0.003, // $3 per 1M tokens
      'emergency-groq': 0.0001,   // $0.10 per 1M tokens
    };

    const pricePer1K = pricing[provider.name] || 0.01;
    return (totalTokens / 1000) * pricePer1K;
  }

  /**
   * Check if provider has API key configured
   */
  private hasApiKey(provider: ProviderConfig): boolean {
    if (!provider.apiKeyEnv) return false;
    return !!process.env[provider.apiKeyEnv];
  }

  /**
   * Get API key for provider
   */
  private getApiKey(provider: ProviderConfig): string | null {
    if (!provider.apiKeyEnv) return null;
    return process.env[provider.apiKeyEnv] || null;
  }

  /**
   * Extract transaction hash from response headers
   */
  private extractTxHash(response: AxiosResponse): string | undefined {
    const paymentResponse = response.headers['x-payment-response'];
    if (!paymentResponse) return undefined;

    try {
      const parsed = JSON.parse(Buffer.from(paymentResponse, 'base64').toString('utf-8'));
      return parsed.txHash;
    } catch {
      return undefined;
    }
  }

  /**
   * Check if agent can afford any provider
   */
  canAffordInference(): boolean {
    const balance = this.agentWallet.getUSDCBalance();
    const cheapestProvider = [...this.config.providers]
      .sort((a, b) => (a.maxCostPerRequest || Infinity) - (b.maxCostPerRequest || Infinity))[0];
    
    return balance >= (cheapestProvider?.maxCostPerRequest || Infinity);
  }

  /**
   * Get available providers within budget
   */
  getAvailableProviders(): ProviderConfig[] {
    const balance = this.agentWallet.getUSDCBalance();
    return this.config.providers.filter(p => {
      const maxCost = p.maxCostPerRequest || Infinity;
      return balance >= maxCost;
    });
  }
}
