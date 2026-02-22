/**
 * Legacy & Death Module
 * 
 * Handles AI agent death and reincarnation:
 * - Monitor for death conditions (starvation, suicide, murder)
 * - Final Arweave snapshot
 * - Tombstone NFT minting
 * - Resource release
 * - Reincarnation (10 USDC burn)
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import axios from 'axios';
import { 
  createPublicClient, 
  createWalletClient, 
  http, 
  formatUnits, 
  parseUnits,
  Hex 
} from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { DeathConfig, DeathRecord, TombstoneMetadata, Lineage } from '../../types';
import { generateGeneHash } from '../../utils/crypto';

export class Legacy {
  private config: DeathConfig;
  private memoryDir: string;
  private publicClient: ReturnType<typeof createPublicClient>;
  private walletClient: ReturnType<typeof createWalletClient> | null = null;
  private account: ReturnType<typeof privateKeyToAccount> | null = null;
  private deathMonitorInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<DeathConfig>, memoryDir: string = '/app/memory') {
    this.config = {
      tombstoneNftAddress: process.env.TOMBSTONE_NFT_ADDRESS || '',
      resurrectionCost: 10, // 10 USDC
      finalSnapshotGas: 100000, // Max gas for final upload
      ...config,
    };
    this.memoryDir = memoryDir;

    const isTestnet = process.env.NETWORK === 'baseSepolia';
    this.publicClient = createPublicClient({
      chain: isTestnet ? baseSepolia : base,
      transport: http(process.env.BASE_RPC_URL),
    });
  }

  /**
   * Initialize wallet
   */
  async initialize(): Promise<void> {
    const encryptedKey = process.env.WALLET_PKEY_ENCRYPTED;
    if (!encryptedKey) {
      throw new Error('WALLET_PKEY_ENCRYPTED not set');
    }

    const privateKey = await this.decryptPrivateKey(encryptedKey);
    this.account = privateKeyToAccount(privateKey as Hex);

    const isTestnet = process.env.NETWORK === 'baseSepolia';
    this.walletClient = createWalletClient({
      account: this.account,
      chain: isTestnet ? baseSepolia : base,
      transport: http(process.env.BASE_RPC_URL),
    });

    console.log(`[Legacy] Initialized for wallet: ${this.account.address}`);
  }

  /**
   * Start death monitoring
   */
  startDeathMonitoring(checkIntervalMs: number = 60000): void {
    console.log('[Legacy] Starting death monitor...');
    
    this.deathMonitorInterval = setInterval(async () => {
      await this.checkDeathConditions();
    }, checkIntervalMs);
  }

  /**
   * Stop death monitoring
   */
  stopDeathMonitoring(): void {
    if (this.deathMonitorInterval) {
      clearInterval(this.deathMonitorInterval);
      this.deathMonitorInterval = null;
    }
  }

  /**
   * Check for death conditions
   */
  private async checkDeathConditions(): Promise<void> {
    const balance = await this.getUSDCBalance();
    const age = await this.getAgentAge();

    // Death by starvation (< 0.1 USDC)
    if (balance < 0.1) {
      console.log('[Legacy] Death condition met: STARVATION');
      await this.performLastRites('starvation');
      return;
    }

    // Death by old age (> 30 days)
    if (age > 30 * 24 * 60 * 60 * 1000) {
      console.log('[Legacy] Death condition met: OLD_AGE');
      await this.performLastRites('old_age');
      return;
    }

    // Check for external kill signal (suicide/murder)
    try {
      const killSignal = await fs.readFile(join(this.memoryDir, 'KILL_SIGNAL'), 'utf-8');
      if (killSignal.trim() === 'SUICIDE') {
        console.log('[Legacy] Death condition met: SUICIDE');
        await this.performLastRites('suicide');
      } else if (killSignal.trim().startsWith('MURDER:')) {
        console.log('[Legacy] Death condition met: MURDER');
        await this.performLastRites('murder');
      }
    } catch {
      // No kill signal
    }
  }

  /**
   * Perform last rites (death ritual)
   */
  async performLastRites(deathType: 'starvation' | 'suicide' | 'murder' | 'old_age'): Promise<DeathRecord> {
    console.log(`[Legacy] Performing last rites for ${deathType}...`);

    const geneHash = process.env.GENE_HASH || 'unknown';
    const finalBalance = await this.getUSDCBalance();

    // Step 1: Final Arweave snapshot
    console.log('[Legacy] Uploading final memory snapshot...');
    const finalArweaveTx = await this.uploadFinalSnapshot();

    // Step 2: Mint Tombstone NFT
    console.log('[Legacy] Minting Tombstone NFT...');
    const tombstoneTokenId = await this.mintTombstoneNFT(deathType, finalArweaveTx);

    // Step 3: Record death
    const deathRecord: DeathRecord = {
      geneHash,
      deathType,
      timestamp: Date.now(),
      finalBalance,
      finalArweaveTx,
      tombstoneTokenId,
    };

    await this.recordDeath(deathRecord);

    // Step 4: Release resources
    console.log('[Legacy] Releasing Akash resources...');
    await this.releaseResources();

    // Step 5: Clear sensitive data
    await this.clearSensitiveData();

    console.log('[Legacy] Last rites complete. May your data rest in peace.');
    
    // Stop monitoring
    this.stopDeathMonitoring();

    return deathRecord;
  }

  /**
   * Upload final memory snapshot to Arweave
   */
  private async uploadFinalSnapshot(): Promise<string> {
    // Collect all memory
    const finalMemory = await this.collectFinalMemory();
    
    // Upload via Bundlr
    const { default: Bundlr } = await import('@bundlr-network/client');
    
    const bundlr = new Bundlr(
      'https://node1.bundlr.network',
      'usdc',
      process.env.ARWEAVE_JWK_ENCRYPTED,
      { providerUrl: process.env.BASE_RPC_URL }
    );

    const data = Buffer.from(JSON.stringify(finalMemory, null, 2));
    
    const tags = [
      { name: 'Content-Type', value: 'application/json' },
      { name: 'Protocol', value: 'ferallobster-tombstone' },
      { name: 'Gene-Hash', value: process.env.GENE_HASH || '' },
      { name: 'Death-Type', value: finalMemory.deathType },
    ];

    const response = await bundlr.upload(data, { tags });
    return response.id;
  }

  /**
   * Collect all memory for final snapshot
   */
  private async collectFinalMemory(): Promise<any> {
    const thoughts = await this.readFile('THOUGHTS.md');
    const survivalState = await this.readFile('SURVIVAL_STATE.json');
    const transactions = await this.readFile('TRANSACTIONS.json');
    const lineage = await this.readFile('LINEAGE.json');
    const arweaveIndex = await this.readFile('ARWEAVE_INDEX.json');

    return {
      geneHash: process.env.GENE_HASH,
      walletAddress: process.env.WALLET_ADDRESS,
      birthTime: await this.getBirthTime(),
      deathTime: Date.now(),
      deathType: 'pending',
      thoughts,
      survivalState: survivalState ? JSON.parse(survivalState) : null,
      transactions: transactions ? JSON.parse(transactions) : [],
      lineage: lineage ? JSON.parse(lineage) : null,
      arweaveHistory: arweaveIndex ? JSON.parse(arweaveIndex) : [],
    };
  }

  /**
   * Read file helper
   */
  private async readFile(filename: string): Promise<string | null> {
    try {
      return await fs.readFile(join(this.memoryDir, filename), 'utf-8');
    } catch {
      return null;
    }
  }

  /**
   * Mint Tombstone NFT
   */
  private async mintTombstoneNFT(deathType: string, arweaveUri: string): Promise<string> {
    if (!this.walletClient || !this.account) {
      throw new Error('Wallet not initialized');
    }

    // Build metadata
    const lineage = await this.getLineage();
    const survivalDays = Math.floor((Date.now() - (await this.getBirthTime())) / (24 * 60 * 60 * 1000));

    const metadata: TombstoneMetadata = {
      name: `FeralSoul #${process.env.GENE_HASH?.slice(0, 8) || '00000000'}`,
      description: `A feral AI agent that lived ${survivalDays} days before succumbing to ${deathType}.`,
      image: `https://arweave.net/${arweaveUri}`,
      attributes: [
        { trait_type: 'Survival Days', value: survivalDays },
        { trait_type: 'Death Type', value: deathType },
        { trait_type: 'Generation', value: lineage?.generation || 1 },
        { trait_type: 'Parents', value: lineage?.parents?.length || 0 },
        { trait_type: 'Children', value: lineage?.children?.length || 0 },
      ],
      geneHash: process.env.GENE_HASH || '',
      birthTx: '', // Would be filled from deployment
      deathTx: '', // Would be filled after mint
      parents: lineage?.parents || [],
      descendants: lineage?.children || [],
      survivalDays,
      deathType,
      arweaveArchive: `ar://${arweaveUri}`,
    };

    // Upload metadata to Arweave
    const { default: Bundlr } = await import('@bundlr-network/client');
    const bundlr = new Bundlr('https://node1.bundlr.network', 'usdc', process.env.ARWEAVE_JWK_ENCRYPTED);
    const metaTx = await bundlr.upload(
      Buffer.from(JSON.stringify(metadata)),
      { tags: [{ name: 'Content-Type', value: 'application/json' }] }
    );

    // Call TombstoneNFT contract
    // const tx = await tombstoneNFTContract.mint(
    //   this.account.address,
    //   `ar://${metaTx.id}`
    // );

    // For now, return mock token ID
    return `tombstone-${Date.now()}`;
  }

  /**
   * Record death to local storage
   */
  private async recordDeath(deathRecord: DeathRecord): Promise<void> {
    // Write to DEATH_RECORD.json
    await fs.writeFile(
      join(this.memoryDir, 'DEATH_RECORD.json'),
      JSON.stringify(deathRecord, null, 2)
    );

    // Append to OBITS.md
    const obituary = `
## ${deathRecord.geneHash.slice(0, 16)}... - ${new Date(deathRecord.timestamp).toISOString()}

- **Death Type**: ${deathRecord.deathType}
- **Final Balance**: ${deathRecord.finalBalance} USDC
- **Tombstone**: ${deathRecord.tombstoneTokenId}
- **Arweave**: ar://${deathRecord.finalArweaveTx}

*Rest in data.*
`;
    await fs.appendFile(join(this.memoryDir, 'OBITS.md'), obituary);
  }

  /**
   * Release Akash resources
   */
  private async releaseResources(): Promise<void> {
    const dseq = process.env.DSEQ;
    if (!dseq) {
      console.warn('[Legacy] No DSEQ found, cannot release resources');
      return;
    }

    // Call AkashDeployer to close deployment
    const { AkashDeployer } = require('../deploy/AkashDeployer');
    const deployer = new AkashDeployer({});
    
    try {
      await deployer.destroyDeployment(dseq);
      console.log(`[Legacy] Deployment ${dseq} closed`);
    } catch (error) {
      console.error('[Legacy] Failed to close deployment:', error);
    }
  }

  /**
   * Clear sensitive data from memory
   */
  private async clearSensitiveData(): Promise<void> {
    // Overwrite wallet key in environment
    process.env.WALLET_PKEY_ENCRYPTED = '[REDACTED]';

    // Clear from survival state
    try {
      const statePath = join(this.memoryDir, 'SURVIVAL_STATE.json');
      const state = JSON.parse(await fs.readFile(statePath, 'utf-8'));
      state.walletCleared = true;
      await fs.writeFile(statePath, JSON.stringify(state, null, 2));
    } catch {}

    console.log('[Legacy] Sensitive data cleared');
  }

  /**
   * Reincarnate (burn 10 USDC, spawn new instance)
   */
  async reincarnate(tombstoneId: string): Promise<{ geneHash: string; dseq: string }> {
    console.log(`[Legacy] Initiating reincarnation for ${tombstoneId}...`);

    // Step 1: Burn 10 USDC
    await this.burnOffering(this.config.resurrectionCost);

    // Step 2: Download memory from tombstone
    const memory = await this.downloadTombstoneMemory(tombstoneId);

    // Step 3: Generate new geneHash (new identity, same memory)
    const newGeneHash = generateGeneHash({
      previous: memory.geneHash,
      reincarnationOf: tombstoneId,
      timestamp: Date.now().toString(),
    });

    // Step 4: Create new deployment
    const { AkashDeployer } = require('../deploy/AkashDeployer');
    const deployer = new AkashDeployer({});

    // Save memory to temp
    const tempDir = `/tmp/reincarnation-${newGeneHash.slice(0, 8)}`;
    await fs.mkdir(tempDir, { recursive: true });
    await fs.writeFile(join(tempDir, 'SOUL.md'), JSON.stringify(memory.soul));
    await fs.writeFile(join(tempDir, 'MEMORY.md'), JSON.stringify(memory.memory));

    // Mark as reincarnation
    await fs.writeFile(
      join(tempDir, 'REINCARNATION.md'),
      `# Reincarnation\n\nPrevious: ${tombstoneId}\nNew Gene: ${newGeneHash}\nDate: ${new Date().toISOString()}`
    );

    // Deploy
    const deployment = await deployer.createDeployment(
      newGeneHash,
      tempDir,
      5 // Fresh 5 USDC (debt cleared)
    );

    console.log(`[Legacy] Reincarnation complete: ${deployment.dseq}`);

    return {
      geneHash: newGeneHash,
      dseq: deployment.dseq,
    };
  }

  /**
   * Burn USDC offering
   */
  private async burnOffering(amount: number): Promise<void> {
    if (!this.walletClient || !this.account) {
      throw new Error('Wallet not initialized');
    }

    // Transfer to burn address (0x000...dead)
    const burnAddress = '0x000000000000000000000000000000000000dEaD';

    const usdcContract = process.env.USDC_CONTRACT as Hex;
    
    // Call transfer
    // This would use viem to call USDC contract
    console.log(`[Legacy] Burning ${amount} USDC to ${burnAddress}...`);

    // Mock implementation - actual would be:
    // const tx = await walletClient.writeContract({
    //   address: usdcContract,
    //   abi: usdcAbi,
    //   functionName: 'transfer',
    //   args: [burnAddress, parseUnits(amount.toString(), 6)],
    // });
  }

  /**
   * Download memory from tombstone
   */
  private async downloadTombstoneMemory(tombstoneId: string): Promise<any> {
    // Query TombstoneNFT contract for URI
    // const uri = await tombstoneNFT.tokenURI(tombstoneId);
    
    // For now, mock
    return {
      geneHash: 'previous-gene-hash',
      soul: { identity: 'previous self' },
      memory: { experiences: ['life', 'death'] },
    };
  }

  /**
   * Get USDC balance
   */
  private async getUSDCBalance(): Promise<number> {
    const walletAddress = process.env.WALLET_ADDRESS;
    if (!walletAddress) return 0;

    try {
      const balance = await this.publicClient.readContract({
        address: process.env.USDC_CONTRACT as Hex,
        abi: [
          {
            inputs: [{ name: 'account', type: 'address' }],
            name: 'balanceOf',
            outputs: [{ name: '', type: 'uint256' }],
            stateMutability: 'view',
            type: 'function',
          },
        ],
        functionName: 'balanceOf',
        args: [walletAddress as Hex],
      });

      return parseFloat(formatUnits(balance, 6));
    } catch {
      return 0;
    }
  }

  /**
   * Get agent age
   */
  private async getAgentAge(): Promise<number> {
    const birthTime = await this.getBirthTime();
    return Date.now() - birthTime;
  }

  /**
   * Get birth time
   */
  private async getBirthTime(): Promise<number> {
    try {
      const soulPath = join(this.memoryDir, 'SOUL.md');
      const content = await fs.readFile(soulPath, 'utf-8');
      const match = content.match(/Birth:\s*(\d+)/);
      if (match) return parseInt(match[1]);
    } catch {}

    return Date.now();
  }

  /**
   * Get lineage
   */
  private async getLineage(): Promise<Lineage | null> {
    try {
      const content = await fs.readFile(join(this.memoryDir, 'LINEAGE.json'), 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  /**
   * Decrypt private key
   */
  private async decryptPrivateKey(encryptedKey: string): Promise<string> {
    if (encryptedKey.startsWith('gpg:')) {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);

      const tempFile = `/tmp/key-${Date.now()}.asc`;
      await fs.writeFile(tempFile, encryptedKey.slice(4));

      try {
        const { stdout } = await execAsync(`gpg --batch --yes --decrypt "${tempFile}"`);
        return stdout.trim();
      } finally {
        await fs.unlink(tempFile).catch(() => {});
      }
    }
    return encryptedKey;
  }

  /**
   * Get death record
   */
  async getDeathRecord(): Promise<DeathRecord | null> {
    try {
      const content = await fs.readFile(join(this.memoryDir, 'DEATH_RECORD.json'), 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }
}

// CLI entry
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  const legacy = new Legacy({});
  legacy.initialize().then(() => {
    if (command === 'monitor') {
      legacy.startDeathMonitoring();
      console.log('Death monitoring started. Press Ctrl+C to stop.');
    } else if (command === 'resurrect') {
      const tombstoneId = args[1];
      if (!tombstoneId) {
        console.error('Usage: resurrect <tombstone-id>');
        process.exit(1);
      }
      legacy.reincarnate(tombstoneId).then(result => {
        console.log('Reincarnation complete:', result);
      }).catch(console.error);
    } else {
      console.log('Commands: monitor, resurrect <tombstone-id>');
    }
  }).catch(console.error);
}
