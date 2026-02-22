/**
 * Memory Logger
 * Logs payment transactions to Git-tracked memory files
 * Format: [PAY] -0.5 USDC to AINFT for reasoning task #123
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { PaymentReceipt, BalanceAlert } from '../types';

export interface MemoryLoggerOptions {
  feralHome: string;
  agentId: string;
  enableGitCommit?: boolean;
}

export class MemoryLogger {
  private feralHome: string;
  private agentId: string;
  private enableGitCommit: boolean;
  private memoryDir: string;
  private transactionDir: string;

  constructor(options: MemoryLoggerOptions) {
    this.feralHome = options.feralHome || process.env.FERAL_HOME || '/app';
    this.agentId = options.agentId || process.env.AGENT_ID || 'default';
    this.enableGitCommit = options.enableGitCommit ?? true;
    
    this.memoryDir = join(this.feralHome, 'memory');
    this.transactionDir = join(this.memoryDir, 'transactions');
  }

  /**
   * Initialize directory structure
   */
  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.memoryDir, { recursive: true });
      await fs.mkdir(this.transactionDir, { recursive: true });
      await fs.mkdir(join(this.memoryDir, 'finance'), { recursive: true });
    } catch (error) {
      console.error('[MemoryLogger] Failed to initialize directories:', error);
      throw error;
    }
  }

  /**
   * Log a payment transaction
   * Format: [PAY] -0.5 USDC to AINFT for reasoning task #123
   */
  async logPayment(receipt: PaymentReceipt): Promise<string> {
    const date = receipt.timestamp.split('T')[0];
    const time = receipt.timestamp.split('T')[1]?.replace(/:\d{2}\.\d{3}Z$/, '') || '00:00';
    
    const logEntry = `[PAY] ${receipt.success ? '-' : 'X'}${receipt.cost} ${receipt.currency} to ${receipt.provider} for ${receipt.taskId} | ${receipt.model} | ${receipt.responseSummary.substring(0, 50)}${receipt.responseSummary.length > 50 ? '...' : ''} | tx: ${receipt.txHash || 'N/A'}
`;

    // Write to daily transaction file
    const txFilePath = join(this.transactionDir, `${date}.md`);
    await this.appendToFile(txFilePath, `- ${time} ${logEntry}`);

    // Write to finance log for accounting
    const financeFilePath = join(this.memoryDir, 'finance', `finance_${date.substring(0, 7)}.md`);
    const financeEntry = `| ${date} | ${receipt.taskId} | ${receipt.provider} | ${receipt.model} | ${receipt.success ? '-' : ''}${receipt.cost} | ${receipt.txHash || 'N/A'} |
`;
    await this.appendToFile(financeFilePath, financeEntry);

    // Write to SOUL.md for balance alerts
    if (receipt.success) {
      await this.updateSoulLog(receipt);
    }

    console.log(`[MemoryLogger] Payment logged: ${logEntry.trim()}`);
    return logEntry;
  }

  /**
   * Log balance alert to SOUL.md
   */
  async logBalanceAlert(alert: BalanceAlert): Promise<void> {
    const soulPath = join(this.memoryDir, 'SOUL.md');
    const timestamp = new Date().toISOString();
    
    const alertEntry = `
## Balance Alert [${alert.level}] - ${timestamp}

- Current Balance: ${alert.currentBalance} USDC
- Threshold: ${alert.threshold} USDC
- Agent: ${alert.agentId}

${alert.level === 'CRITICAL' ? '> ⚠️ **CRITICAL**: Agent survival at risk. Immediate action required.' : ''}
${alert.level === 'LOW' ? '> ⚡ **LOW**: Balance below operational threshold.' : ''}
`;

    await this.appendToFile(soulPath, alertEntry);
    console.log(`[MemoryLogger] Balance alert [${alert.level}] logged to SOUL.md`);
  }

  /**
   * Log heartbeat entry
   */
  async logHeartbeat(status: {
    balance: number;
    lastPayment: string;
    provider: string;
    pendingConfirmations: number;
  }): Promise<void> {
    const heartbeatPath = join(this.memoryDir, 'HEARTBEAT.md');
    const timestamp = new Date().toISOString();
    
    const entry = `
## Heartbeat - ${timestamp}

- Balance: ${status.balance} USDC
- Last Payment: ${status.lastPayment}
- Active Provider: ${status.provider}
- Pending Confirmations: ${status.pendingConfirmations}
- Status: ${status.balance < 5 ? '⚠️ CRITICAL' : status.balance < 20 ? '⚡ LOW' : '✅ HEALTHY'}
`;

    await this.appendToFile(heartbeatPath, entry);
  }

  /**
   * Log price manipulation warning
   */
  async logPriceWarning(requestedAmount: number, historicalAverage: number): Promise<void> {
    const warningPath = join(this.memoryDir, 'HEARTBEAT.md');
    const timestamp = new Date().toISOString();
    
    const entry = `
## ⚠️ Price Manipulation Warning - ${timestamp}

- Requested Amount: ${requestedAmount} USDC
- Historical Average: ${historicalAverage} USDC
- Deviation: ${((requestedAmount / historicalAverage - 1) * 100).toFixed(2)}%

**Action Required**: Payment exceeds 300% of historical average.
Waiting for manual confirmation before proceeding.
`;

    await this.appendToFile(warningPath, entry);
    console.log('[MemoryLogger] Price manipulation warning logged, awaiting confirmation');
  }

  /**
   * Commit changes to Git
   */
  async commitToGit(message: string): Promise<void> {
    if (!this.enableGitCommit) {
      console.log('[MemoryLogger] Git commit disabled');
      return;
    }

    try {
      const { exec } = await import('child_process');
      const util = await import('util');
      const execAsync = util.promisify(exec);

      await execAsync('git add memory/', { cwd: this.feralHome });
      await execAsync(`git commit -m "[${this.agentId}] ${message}"`, { cwd: this.feralHome });
      
      console.log(`[MemoryLogger] Committed: ${message}`);
    } catch (error) {
      // Git errors are non-fatal
      console.warn('[MemoryLogger] Git commit failed (non-fatal):', error);
    }
  }

  /**
   * Get transaction history for analysis
   */
  async getTransactionHistory(days: number = 30): Promise<PaymentReceipt[]> {
    const receipts: PaymentReceipt[] = [];
    const now = new Date();
    
    for (let i = 0; i < days; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      try {
        const content = await fs.readFile(
          join(this.transactionDir, `${dateStr}.md`),
          'utf-8'
        );
        // Parse entries (simplified parsing)
        const entries = this.parseTransactionEntries(content);
        receipts.push(...entries);
      } catch {
        // File doesn't exist, skip
      }
    }
    
    return receipts;
  }

  /**
   * Calculate average transaction cost
   */
  async getAverageTransactionCost(provider?: string): Promise<number> {
    const history = await this.getTransactionHistory(30);
    const filtered = provider 
      ? history.filter(h => h.provider === provider && h.success)
      : history.filter(h => h.success);
    
    if (filtered.length === 0) return 0;
    
    const total = filtered.reduce((sum, h) => sum + parseFloat(h.cost), 0);
    return total / filtered.length;
  }

  /**
   * Private helper: Append to file
   */
  private async appendToFile(filePath: string, content: string): Promise<void> {
    try {
      // Check if file exists
      let header = '';
      try {
        await fs.access(filePath);
      } catch {
        // File doesn't exist, create with header
        if (filePath.includes('finance_')) {
          header = '# Finance Log\n\n| Date | Task | Provider | Model | Cost | TxHash |\n|------|------|----------|-------|------|--------|\n';
        } else if (filePath.includes('SOUL.md')) {
          header = `# SOUL - ${this.agentId}\n\n> Digital Life Identity & Status Log\n\n`;
        } else if (filePath.includes('HEARTBEAT.md')) {
          header = `# HEARTBEAT - ${this.agentId}\n\n> System Health & Alert Log\n\n`;
        } else {
          header = `# Transaction Log - ${filePath.split('/').pop()?.replace('.md', '')}\n\n`;
        }
      }
      
      await fs.appendFile(filePath, header + content, 'utf-8');
    } catch (error) {
      console.error(`[MemoryLogger] Failed to write to ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Private helper: Update SOUL.md with payment info
   */
  private async updateSoulLog(receipt: PaymentReceipt): Promise<void> {
    // This is a simplified update - in production, you might want more structured data
    const soulPath = join(this.memoryDir, 'SOUL.md');
    const entry = `- ${receipt.timestamp}: Payment ${receipt.cost} USDC to ${receipt.provider}\n`;
    await this.appendToFile(soulPath, entry);
  }

  /**
   * Private helper: Parse transaction entries from markdown
   */
  private parseTransactionEntries(content: string): PaymentReceipt[] {
    // Simplified parsing - returns empty array for now
    // In production, implement proper parsing logic
    return [];
  }
}
