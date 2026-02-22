/**
 * FeralLobster X402 Payment System
 * AI Agent Autonomous Payment Framework
 * 
 * @module @ferallobster/payment
 */

export { X402Client } from './X402Client';
export { AgentWallet } from './AgentWallet';
export { InferencePurchaser } from './InferencePurchaser';
export { MemoryLogger } from './utils/MemoryLogger';
export { GPGManager } from './utils/GPGManager';
export { SecureMemory, secureMemory, PrivateKeyHandle } from './utils/SecureMemory';

export * from './types';

// Version
export const VERSION = '0.1.0';

// Default export for convenience
export { FeralPayment } from './FeralPayment';
