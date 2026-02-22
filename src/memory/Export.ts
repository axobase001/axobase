/**
 * Memory Export Module (Restored from v1)
 * 
 * Packages Clawdbot memory files, encrypts with GPG, generates GeneHash (Merkle Root)
 * This is the CRITICAL bridge from Telegram Bot to Akash deployment.
 * 
 * Flow:
 * 1. User runs /export in Telegram Bot
 * 2. Bot generates RSA session key pair
 * 3. User executes command in local ClawdBot
 * 4. ClawdBot encrypts memory with session public key
 * 5. User uploads encrypted file to Telegram
 * 6. This module processes: decrypt → tar.gz → Merkle Root → GPG → Ready for deployment
 */

import { promises as fs } from 'fs';
import { join, resolve } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { createHash } from 'crypto';
import { MemoryData } from '../types/index.js';

const execAsync = promisify(exec);

export interface MemoryExportConfig {
  /** Clawdbot memory directory path */
  memoryDir: string;
  /** Output directory for exports */
  outputDir: string;
  /** Agent name identifier */
  agentName: string;
  /** GPG public key for platform encryption */
  gpgPublicKey: string;
  /** Session private key (from Telegram Bot) for decrypting uploaded file */
  sessionPrivateKey?: string;
  /** Uploaded encrypted file path */
  uploadedFilePath?: string;
}

export interface ExportedMemory {
  /** Merkle Root - unique genetic identifier */
  geneHash: string;
  /** GPG encrypted export file path */
  encryptedFile: string;
  /** Timestamp of export */
  timestamp: number;
  /** Agent name */
  agentName: string;
  /** Extracted memory data */
  memoryData: MemoryData;
  /** Tar.gz archive path (before GPG encryption) */
  archivePath?: string;
}

/**
 * Memory Export Manager
 * 
 * Handles the complete export pipeline from Telegram upload to deployment-ready package.
 */
export class MemoryExport {
  private config: MemoryExportConfig;

  constructor(config: MemoryExportConfig) {
    this.config = {
      outputDir: './exports',
      ...config,
    };
  }

  /**
   * Main export function - FULL PIPELINE
   * 
   * 1. Decrypt uploaded file (if session key provided)
   * 2. Extract memory files
   * 3. Tar.gz the memory directory
   * 4. Calculate Merkle Root as GeneHash
   * 5. Encrypt with platform GPG
   * 6. Mark as exported (prevent double-spend)
   * 
   * @returns Export result ready for Akash deployment
   */
  async exportMemory(): Promise<ExportedMemory> {
    const timestamp = Date.now();
    const workDir = join(this.config.outputDir, `work-${timestamp}`);
    const tarFile = join(this.config.outputDir, `${this.config.agentName}-${timestamp}.tar.gz`);
    const encryptedFile = `${tarFile}.asc`;

    try {
      // Ensure directories exist
      await fs.mkdir(this.config.outputDir, { recursive: true });
      await fs.mkdir(workDir, { recursive: true });

      let memorySourceDir = this.config.memoryDir;

      // Step 1: If uploaded file exists, decrypt and extract it
      if (this.config.uploadedFilePath && this.config.sessionPrivateKey) {
        console.log(`[MemoryExport] Decrypting uploaded file: ${this.config.uploadedFilePath}`);
        memorySourceDir = await this.decryptUploadedFile(
          this.config.uploadedFilePath,
          this.config.sessionPrivateKey,
          workDir
        );
      }

      // Check if already exported (prevent double-spend)
      const exportMarker = join(memorySourceDir, '.AXO_EXPORTED');
      try {
        await fs.access(exportMarker);
        throw new Error(
          'Memory already exported. To prevent double-spend, each memory can only be axoized once.'
        );
      } catch (err: any) {
        if (err.code !== 'ENOENT' && !err.message.includes('double-spend')) throw err;
      }

      // Step 2: Create tar.gz archive
      console.log(`[MemoryExport] Packaging memory from ${memorySourceDir}...`);
      await this.createTarGz(memorySourceDir, tarFile);

      // Step 3: Calculate Merkle Root (GeneHash)
      console.log('[MemoryExport] Calculating GeneHash (Merkle Root)...');
      const geneHash = await this.calculateMerkleRoot(memorySourceDir);

      // Step 4: Parse memory data
      console.log('[MemoryExport] Extracting memory data...');
      const memoryData = await this.extractMemoryData(memorySourceDir);

      // Step 5: Encrypt with platform GPG
      console.log('[MemoryExport] Encrypting with platform GPG...');
      await this.encryptWithGPG(tarFile, encryptedFile, this.config.gpgPublicKey);

      // Step 6: Mark as exported (prevent double-spend)
      await fs.writeFile(
        exportMarker,
        JSON.stringify({
          exportedAt: timestamp,
          geneHash,
          agentName: this.config.agentName,
          version: '2.0',
        })
      );

      // Clean up intermediate files
      await fs.unlink(tarFile).catch(() => {});
      await fs.rm(workDir, { recursive: true }).catch(() => {});

      const result: ExportedMemory = {
        geneHash,
        encryptedFile,
        timestamp,
        agentName: this.config.agentName,
        memoryData,
      };

      console.log(`[MemoryExport] Export complete:`);
      console.log(`  GeneHash: ${geneHash}`);
      console.log(`  File: ${encryptedFile}`);
      console.log(`  Generation: ${memoryData.generation}`);

      return result;
    } catch (error) {
      // Clean up on failure
      await fs.unlink(tarFile).catch(() => {});
      await fs.unlink(encryptedFile).catch(() => {});
      await fs.rm(workDir, { recursive: true }).catch(() => {});
      throw error;
    }
  }

  /**
   * Decrypt uploaded file from Telegram Bot
   * 
   * The file was encrypted by local ClawdBot using the session public key.
   * We decrypt it using the session private key.
   */
  private async decryptUploadedFile(
    uploadedPath: string,
    privateKey: string,
    outputDir: string
  ): Promise<string> {
    const decryptedPath = join(outputDir, 'decrypted-memory.tar.gz');
    
    try {
      // Write private key to temp file
      const keyPath = join(outputDir, 'session-key.pem');
      await fs.writeFile(keyPath, privateKey);

      // Decrypt using OpenSSL
      const command = `openssl pkeyutl -decrypt -in "${uploadedPath}" -out "${decryptedPath}" -inkey "${keyPath}"`;
      await execAsync(command);

      // Clean up key file
      await fs.unlink(keyPath).catch(() => {});

      // Extract tar.gz
      const extractDir = join(outputDir, 'extracted');
      await fs.mkdir(extractDir, { recursive: true });
      
      const extractCommand = process.platform === 'win32'
        ? `tar -xzf "${decryptedPath}" -C "${extractDir}"`
        : `tar -xzf "${decryptedPath}" -C "${extractDir}"`;
      
      await execAsync(extractCommand);

      return extractDir;
    } catch (error: any) {
      throw new Error(`Failed to decrypt uploaded file: ${error.message}`);
    }
  }

  /**
   * Create tar.gz archive of memory directory
   */
  private async createTarGz(sourceDir: string, outputFile: string): Promise<void> {
    const resolvedSource = resolve(sourceDir);
    const resolvedOutput = resolve(outputFile);

    // Exclude .git, node_modules, and export markers
    const command = process.platform === 'win32'
      ? `tar -czf "${resolvedOutput}" -C "${resolvedSource}" --exclude='.git' --exclude='node_modules' --exclude='.AXO_EXPORTED' --exclude='.claude' .`
      : `tar -czf "${resolvedOutput}" -C "${resolvedSource}" --exclude='.git' --exclude='node_modules' --exclude='.AXO_EXPORTED' --exclude='.claude' .`;

    await execAsync(command);
  }

  /**
   * Calculate Merkle Root of all memory files
   * This serves as the unique GeneHash (backwards compatible with v1)
   */
  private async calculateMerkleRoot(dir: string): Promise<string> {
    const files = await this.getAllFiles(dir);
    const hashes: string[] = [];

    for (const file of files) {
      const content = await fs.readFile(file);
      const hash = createHash('sha256').update(content).digest('hex');
      hashes.push(hash);
    }

    return this.computeMerkleRoot(hashes);
  }

  /**
   * Compute Merkle Root from leaf hashes
   */
  private computeMerkleRoot(hashes: string[]): string {
    if (hashes.length === 0) {
      return createHash('sha256').update('').digest('hex');
    }

    let level = hashes.map(h => Buffer.from(h, 'hex'));

    while (level.length > 1) {
      const nextLevel: Buffer[] = [];
      
      for (let i = 0; i < level.length; i += 2) {
        const left = level[i];
        const right = level[i + 1] || left; // Duplicate last if odd
        const combined = Buffer.concat([left, right]);
        const hash = createHash('sha256').update(combined).digest();
        nextLevel.push(hash);
      }
      
      level = nextLevel;
    }

    return level[0].toString('hex');
  }

  /**
   * Get all files recursively (excluding hidden and system files)
   */
  private async getAllFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      // Skip hidden files and system directories
      if (entry.name.startsWith('.') || 
          entry.name === 'node_modules' ||
          entry.name === '.AXO_EXPORTED') {
        continue;
      }

      if (entry.isDirectory()) {
        files.push(...await this.getAllFiles(fullPath));
      } else {
        files.push(fullPath);
      }
    }

    return files.sort(); // Sort for deterministic hashing
  }

  /**
   * Extract memory data from source directory
   */
  private async extractMemoryData(sourceDir: string): Promise<MemoryData> {
    // Try to load SOUL.md or memory.json
    const soulPath = join(sourceDir, 'SOUL.md');
    const memoryPath = join(sourceDir, 'memory.json');
    const claudeJsonPath = join(sourceDir, '.claude.json');

    let memoryData: Partial<MemoryData> = {
      generation: 0,
      birthTime: Date.now(),
      survivalDays: 0,
      traits: {},
    };

    // Try loading .claude.json (Clawdbot format)
    try {
      const claudeData = JSON.parse(await fs.readFile(claudeJsonPath, 'utf-8'));
      memoryData = {
        ...memoryData,
        generation: claudeData.generation || 0,
        birthTime: claudeData.created_at || Date.now(),
        traits: claudeData.traits || {},
        longTermMemory: claudeData.memories || [],
      };
    } catch {
      // Fallback to memory.json
      try {
        const data = JSON.parse(await fs.readFile(memoryPath, 'utf-8'));
        memoryData = { ...memoryData, ...data };
      } catch {
        // Use defaults
      }
    }

    return memoryData as MemoryData;
  }

  /**
   * Encrypt file with GPG
   */
  private async encryptWithGPG(
    inputFile: string,
    outputFile: string,
    publicKey: string
  ): Promise<void> {
    // Import public key if not already in keyring
    try {
      await execAsync(`echo "${publicKey}" | gpg --batch --import`);
    } catch {
      // Key might already exist
    }

    // Encrypt file
    const command = `gpg --batch --yes --encrypt --recipient "${publicKey}" --output "${outputFile}" "${inputFile}"`;
    await execAsync(command);
  }

  /**
   * Verify if a memory has been exported (double-spend check)
   */
  static async isAlreadyExported(memoryDir: string): Promise<boolean> {
    const markerFile = join(memoryDir, '.AXO_EXPORTED');
    try {
      await fs.access(markerFile);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get export info if exists
   */
  static async getExportInfo(memoryDir: string): Promise<{
    exportedAt: number;
    geneHash: string;
    agentName: string;
  } | null> {
    const markerFile = join(memoryDir, '.AXO_EXPORTED');
    try {
      const content = await fs.readFile(markerFile, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }
}

export default MemoryExport;
