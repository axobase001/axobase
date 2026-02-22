/**
 * GPG Manager
 * Handles encryption/decryption of wallet files using GPG
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { promises as fs } from 'fs';
import { join } from 'path';
import { secureMemory } from './SecureMemory';

const execAsync = promisify(exec);

export interface GPGManagerOptions {
  feralHome: string;
  agentId: string;
  passphrase: string;
}

export class GPGManager {
  private feralHome: string;
  private agentId: string;
  private passphrase: string;
  private walletDir: string;

  constructor(options: GPGManagerOptions) {
    this.feralHome = options.feralHome || process.env.FERAL_HOME || '/app';
    this.agentId = options.agentId || process.env.AGENT_ID || 'default';
    this.passphrase = options.passphrase || process.env.PRIVATE_KEY_GPG_PASSPHRASE || '';
    this.walletDir = join(this.feralHome, '.feral');
  }

  /**
   * Check if GPG is available
   */
  async checkGPG(): Promise<boolean> {
    try {
      await execAsync('gpg --version');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Decrypt wallet file and return private key
   * Stores decrypted key in secure memory, never returns as string
   */
  async decryptWallet(): Promise<string | null> {
    const walletPath = join(this.walletDir, 'wallet.asc');
    
    try {
      // Check if wallet file exists
      await fs.access(walletPath);
    } catch {
      console.error(`[GPGManager] Wallet file not found: ${walletPath}`);
      return null;
    }

    if (!this.passphrase) {
      throw new Error('GPG passphrase not provided. Set PRIVATE_KEY_GPG_PASSPHRASE environment variable.');
    }

    try {
      // Decrypt using GPG
      const command = `gpg --batch --yes --passphrase "${this.passphrase}" --decrypt "${walletPath}"`;
      const { stdout } = await execAsync(command);
      
      // Validate that output looks like a private key
      const trimmed = stdout.trim();
      if (!this.isValidPrivateKey(trimmed)) {
        throw new Error('Decrypted content does not appear to be a valid private key');
      }

      // Store in secure memory
      const tag = `wallet_${this.agentId}`;
      secureMemory.store(tag, Buffer.from(trimmed));

      console.log('[GPGManager] Wallet decrypted and stored in secure memory');
      return tag;
    } catch (error) {
      console.error('[GPGManager] Decryption failed:', error);
      throw new Error('Failed to decrypt wallet. Check passphrase and file integrity.');
    }
  }

  /**
   * Encrypt a private key and save to file
   * Used for wallet creation/backup
   */
  async encryptWallet(privateKey: string, outputPath?: string): Promise<string> {
    const targetPath = outputPath || join(this.walletDir, 'wallet.asc');
    
    // Ensure directory exists
    await fs.mkdir(this.walletDir, { recursive: true });

    try {
      // Create temporary file with private key
      const tempFile = join(this.walletDir, '.temp_key');
      await fs.writeFile(tempFile, privateKey, { mode: 0o600 });

      // Encrypt using GPG
      const command = `gpg --batch --yes --passphrase "${this.passphrase}" --symmetric --cipher-algo AES256 --output "${targetPath}" "${tempFile}"`;
      await execAsync(command);

      // Securely delete temp file
      await this.secureDelete(tempFile);

      console.log(`[GPGManager] Wallet encrypted and saved to ${targetPath}`);
      return targetPath;
    } catch (error) {
      console.error('[GPGManager] Encryption failed:', error);
      throw new Error('Failed to encrypt wallet');
    }
  }

  /**
   * Export encrypted wallet for backup
   */
  async exportWallet(gpgKeyId: string): Promise<string> {
    const walletPath = join(this.walletDir, 'wallet.asc');
    const backupPath = join(this.walletDir, `wallet_backup_${Date.now()}.asc`);

    try {
      // First decrypt
      const decryptCmd = `gpg --batch --yes --passphrase "${this.passphrase}" --decrypt "${walletPath}"`;
      const { stdout } = await execAsync(decryptCmd);

      // Then encrypt with target GPG key
      const tempFile = join(this.walletDir, '.temp_export');
      await fs.writeFile(tempFile, stdout.trim(), { mode: 0o600 });

      const encryptCmd = `gpg --batch --yes --encrypt --recipient "${gpgKeyId}" --output "${backupPath}" "${tempFile}"`;
      await execAsync(encryptCmd);

      // Securely delete temp file
      await this.secureDelete(tempFile);

      console.log(`[GPGManager] Wallet exported to ${backupPath} (encrypted for ${gpgKeyId})`);
      return backupPath;
    } catch (error) {
      console.error('[GPGManager] Export failed:', error);
      throw new Error('Failed to export wallet');
    }
  }

  /**
   * Generate a new wallet and encrypt it
   */
  async generateNewWallet(): Promise<{ address: string; encryptedPath: string }> {
    try {
      // Generate key using openssl
      const { stdout: privateKey } = await execAsync('openssl rand -hex 32');
      const cleanKey = '0x' + privateKey.trim();

      // Derive address from private key
      const { privateKeyToAccount } = await import('viem/accounts');
      const account = privateKeyToAccount(cleanKey as `0x${string}`);
      const address = account.address;

      // Encrypt and save
      const encryptedPath = await this.encryptWallet(cleanKey);

      // Clear key from memory
      // Note: This is best-effort in JS

      console.log(`[GPGManager] New wallet generated: ${address}`);
      return { address, encryptedPath };
    } catch (error) {
      console.error('[GPGManager] Wallet generation failed:', error);
      throw new Error('Failed to generate new wallet');
    }
  }

  /**
   * Get wallet address without decrypting private key
   * Looks for address file alongside wallet.asc
   */
  async getWalletAddress(): Promise<string | null> {
    const addressPath = join(this.walletDir, 'address');
    
    try {
      const address = await fs.readFile(addressPath, 'utf-8');
      return address.trim();
    } catch {
      // Address file doesn't exist
      return null;
    }
  }

  /**
   * Save wallet address to file
   */
  async saveWalletAddress(address: string): Promise<void> {
    const addressPath = join(this.walletDir, 'address');
    await fs.mkdir(this.walletDir, { recursive: true });
    await fs.writeFile(addressPath, address, { mode: 0o644 });
  }

  /**
   * Check if wallet exists
   */
  async walletExists(): Promise<boolean> {
    const walletPath = join(this.walletDir, 'wallet.asc');
    try {
      await fs.access(walletPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate private key format
   */
  private isValidPrivateKey(key: string): boolean {
    // Remove 0x prefix if present
    const clean = key.replace('0x', '');
    // Check if it's 64 hex characters
    return /^[0-9a-fA-F]{64}$/.test(clean);
  }

  /**
   * Securely delete a file (overwrite then delete)
   */
  private async secureDelete(filePath: string): Promise<void> {
    try {
      // Overwrite with random data
      const { stdout: randomData } = await execAsync('openssl rand -base64 1024');
      await fs.writeFile(filePath, randomData);
      
      // Delete
      await fs.unlink(filePath);
    } catch {
      // If secure delete fails, try regular delete
      try {
        await fs.unlink(filePath);
      } catch {
        // Ignore errors
      }
    }
  }
}
