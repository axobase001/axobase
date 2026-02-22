/**
 * Akash Deployer Module
 * 
 * Handles deployment of AI agents to Akash Network:
 * - Generate HD wallet from geneHash
 * - Build SDL with encrypted secrets
 * - Transfer MSA (Minimum Survival Allowance)
 * - Create and monitor deployment
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { ethers } from 'ethers';
import YAML from 'yaml';
import { AkashDeployment, AkashConfig, DeploymentManifest } from '../../types';
import { deriveWalletPath } from '../../utils/crypto';

const execAsync = promisify(exec);

export class AkashDeployer {
  private config: AkashConfig;
  private manifest: DeploymentManifest | null = null;

  constructor(config: Partial<AkashConfig>) {
    this.config = {
      rpcEndpoint: process.env.AKASH_RPC || 'https://rpc.akash.network:443',
      chainId: 'akashnet-2',
      mnemonic: process.env.AKASH_MNEMONIC || '',
      sdlTemplate: './templates/feral-bot.yaml',
      ...config,
    };
  }

  /**
   * Main deployment flow
   * 1. Generate HD wallet from geneHash
   * 2. Build SDL with environment variables
   * 3. Transfer MSA (5 USDC + 0.01 ETH)
   * 4. Create Akash deployment
   * 5. Return deployment info
   */
  async createDeployment(
    geneHash: string,
    encryptedMemoryPath: string,
    msaAmount: number = 5
  ): Promise<AkashDeployment> {
    console.log(`[AkashDeployer] Starting deployment for geneHash: ${geneHash.slice(0, 16)}...`);

    // Step 1: Generate HD wallet
    const wallet = await this.generateWallet(geneHash);
    console.log(`[AkashDeployer] Generated wallet: ${wallet.address}`);

    // Step 2: Build deployment manifest
    this.manifest = {
      geneHash,
      walletAddress: wallet.address,
      msaAmount,
      encryptedMemoryPath,
      x402Config: this.getX402Config(),
      arweaveJWK: process.env.ARWEAVE_JWK_ENCRYPTED || '',
    };

    // Step 3: Transfer MSA before deployment
    console.log(`[AkashDeployer] Transferring MSA: ${msaAmount} USDC + 0.01 ETH...`);
    await this.transferMSA(wallet.address, msaAmount);

    // Step 4: Build SDL from template
    const sdl = await this.buildSDL(this.manifest, wallet.privateKey);
    const sdlPath = join('./deployments', `${geneHash.slice(0, 16)}.yaml`);
    await fs.mkdir('./deployments', { recursive: true });
    await fs.writeFile(sdlPath, sdl);

    // Step 5: Create Akash deployment
    console.log('[AkashDeployer] Creating Akash deployment...');
    const deployment = await this.submitDeployment(sdlPath, geneHash);

    console.log(`[AkashDeployer] Deployment created!`);
    console.log(`  DSEQ: ${deployment.dseq}`);
    console.log(`  Wallet: ${deployment.walletAddress}`);
    console.log(`  URI: ${deployment.deploymentUri}`);

    return deployment;
  }

  /**
   * Generate HD wallet from geneHash
   * Uses derivation path: m/44'/60'/0'/0/${geneHash-derived-index}
   */
  private async generateWallet(geneHash: string): Promise<{ address: string; privateKey: string }> {
    // Create deterministic seed from geneHash
    const seed = ethers.keccak256(ethers.toUtf8Bytes(geneHash));
    
    // Create HD wallet from seed
    const hdNode = ethers.HDNodeWallet.fromSeed(seed);
    
    // Derive path using geneHash-derived index
    const path = deriveWalletPath(geneHash);
    const wallet = hdNode.derivePath(path);

    // Encrypt private key with GPG if passphrase available
    let encryptedKey = wallet.privateKey;
    if (process.env.GPG_PASSPHRASE) {
      encryptedKey = await this.encryptWithGPG(wallet.privateKey);
    }

    return {
      address: wallet.address,
      privateKey: encryptedKey,
    };
  }

  /**
   * Encrypt private key with GPG
   */
  private async encryptWithGPG(privateKey: string): Promise<string> {
    const tempFile = `/tmp/wallet-${Date.now()}.key`;
    await fs.writeFile(tempFile, privateKey);

    try {
      const keyId = process.env.GPG_KEY_ID || 'feral-platform';
      const command = `gpg --batch --yes --encrypt --recipient "${keyId}" --output - "${tempFile}" | base64`;
      const { stdout } = await execAsync(command);
      return `gpg:${stdout.trim()}`;
    } finally {
      await fs.unlink(tempFile).catch(() => {});
    }
  }

  /**
   * Transfer MSA to bot wallet
   */
  private async transferMSA(walletAddress: string, usdcAmount: number): Promise<void> {
    const provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL);
    const platformWallet = new ethers.Wallet(
      process.env.PLATFORM_PRIVATE_KEY || '',
      provider
    );

    // Transfer ETH for gas
    const ethTx = await platformWallet.sendTransaction({
      to: walletAddress,
      value: ethers.parseEther('0.01'),
    });
    await ethTx.wait();
    console.log(`[AkashDeployer] ETH transferred: ${ethTx.hash}`);

    // Transfer USDC
    const usdcContract = new ethers.Contract(
      process.env.USDC_CONTRACT || '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
      ['function transfer(address to, uint256 amount) returns (bool)'],
      platformWallet
    );

    const usdcAmountWei = ethers.parseUnits(usdcAmount.toString(), 6);
    const usdcTx = await usdcContract.transfer(walletAddress, usdcAmountWei);
    await usdcTx.wait();
    console.log(`[AkashDeployer] USDC transferred: ${usdcTx.hash}`);
  }

  /**
   * Build SDL from template
   */
  private async buildSDL(manifest: DeploymentManifest, encryptedPrivateKey: string): Promise<string> {
    // Read template
    let template: string;
    try {
      template = await fs.readFile(this.config.sdlTemplate, 'utf-8');
    } catch {
      // Use default template
      template = this.getDefaultTemplate();
    }

    // Replace placeholders
    const sdl = template
      .replace(/{{GENE_HASH}}/g, manifest.geneHash)
      .replace(/{{WALLET_ADDRESS}}/g, manifest.walletAddress)
      .replace(/{{WALLET_PKEY}}/g, encryptedPrivateKey)
      .replace(/{{ENCRYPTED_MEMORY}}/g, manifest.encryptedMemoryPath)
      .replace(/{{USDC_CONTRACT}}/g, manifest.x402Config.usdcContract)
      .replace(/{{X402_FACILITATOR}}/g, manifest.x402Config.facilitatorUrl)
      .replace(/{{ARWEAVE_JWK}}/g, manifest.arweaveJWK)
      .replace(/{{NETWORK}}/g, manifest.x402Config.network);

    return sdl;
  }

  /**
   * Submit deployment to Akash
   */
  private async submitDeployment(sdlPath: string, geneHash: string): Promise<AkashDeployment> {
    // Using Akash CLI for deployment
    // In production, this would use @akashnetwork/akashjs SDK
    
    const command = `provider-services tx deployment create "${sdlPath}" \
      --from "${this.config.mnemonic ? 'key' : 'default'}" \
      --chain-id "${this.config.chainId}" \
      --node "${this.config.rpcEndpoint}" \
      --gas auto \
      --gas-adjustment 1.15 \
      --yes \
      --output json`;

    try {
      const { stdout } = await execAsync(command, {
        env: {
          ...process.env,
          AKASH_MNEMONIC: this.config.mnemonic,
        },
      });

      const result = JSON.parse(stdout);
      const dseq = result.txhash || this.extractDseq(stdout);

      // Wait for lease
      const lease = await this.waitForLease(dseq);

      return {
        dseq,
        walletAddress: manifest?.walletAddress || '',
        walletPrivateKey: '', // Encrypted, not stored
        deploymentUri: lease.uri,
        status: 'active',
        createdAt: Date.now(),
      };
    } catch (error: any) {
      console.error('[AkashDeployer] Deployment failed:', error);
      throw new Error(`Akash deployment failed: ${error.message}`);
    }
  }

  /**
   * Wait for lease to be created
   */
  private async waitForLease(dseq: string, maxAttempts: number = 30): Promise<{ uri: string }> {
    console.log('[AkashDeployer] Waiting for lease...');

    for (let i = 0; i < maxAttempts; i++) {
      try {
        const command = `provider-services query market lease list \
          --dseq ${dseq} \
          --node "${this.config.rpcEndpoint}" \
          --output json`;

        const { stdout } = await execAsync(command);
        const leases = JSON.parse(stdout);

        if (leases.leases && leases.leases.length > 0) {
          const activeLease = leases.leases.find((l: any) => 
            l.lease.state === 'active'
          );

          if (activeLease) {
            // Get lease status for URI
            const statusCommand = `provider-services provider lease-status \
              --dseq ${dseq} \
              --gseq ${activeLease.lease.lease_id.gseq} \
              --oseq ${activeLease.lease.lease_id.oseq} \
              --provider ${activeLease.lease.lease_id.provider} \
              --from default \
              --node "${this.config.rpcEndpoint}" \
              --output json`;

            const { stdout: statusOut } = await execAsync(statusCommand);
            const status = JSON.parse(statusOut);

            return {
              uri: status.services?.feral?.uris?.[0] || '',
            };
          }
        }
      } catch {
        // Ignore errors during polling
      }

      await new Promise(resolve => setTimeout(resolve, 10000)); // 10s between attempts
    }

    throw new Error('Timeout waiting for lease');
  }

  /**
   * Extract DSEQ from command output
   */
  private extractDseq(output: string): string {
    const match = output.match(/"raw_log":".*?dseq[=:](\d+)/);
    return match?.[1] || Date.now().toString();
  }

  /**
   * Destroy deployment (called on death)
   */
  async destroyDeployment(dseq: string): Promise<void> {
    console.log(`[AkashDeployer] Destroying deployment ${dseq}...`);

    const command = `provider-services tx deployment close \
      --dseq ${dseq} \
      --from default \
      --chain-id "${this.config.chainId}" \
      --node "${this.config.rpcEndpoint}" \
      --yes`;

    await execAsync(command, {
      env: {
        ...process.env,
        AKASH_MNEMONIC: this.config.mnemonic,
      },
    });

    console.log(`[AkashDeployer] Deployment ${dseq} closed`);
  }

  /**
   * Get deployment status
   */
  async getDeploymentStatus(dseq: string): Promise<Partial<AkashDeployment>> {
    const command = `provider-services query deployment get \
      --dseq ${dseq} \
      --node "${this.config.rpcEndpoint}" \
      --output json`;

    try {
      const { stdout } = await execAsync(command);
      const result = JSON.parse(stdout);

      return {
        dseq,
        status: result.deployment?.state === 'active' ? 'active' : 'closed',
      };
    } catch {
      return { dseq, status: 'failed' };
    }
  }

  /**
   * Get X402 config from environment
   */
  private getX402Config() {
    return {
      network: (process.env.NETWORK as 'base' | 'baseSepolia') || 'baseSepolia',
      usdcContract: process.env.USDC_CONTRACT || '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
      facilitatorUrl: process.env.X402_FACILITATOR || 'https://x402.org/facilitator',
      providers: [],
      thresholds: {
        criticalBalance: 2,
        lowBalance: 5,
        healthyBalance: 20,
      },
    };
  }

  /**
   * Default SDL template
   */
  private getDefaultTemplate(): string {
    return `---
version: "2.0"
services:
  feral:
    image: ferallobster/bot-runtime:latest
    expose:
      - port: 3000
        as: 80
        to:
          - global: true
    env:
      - GENE_HASH={{GENE_HASH}}
      - WALLET_ADDRESS={{WALLET_ADDRESS}}
      - WALLET_PKEY={{WALLET_PKEY}}
      - USDC_CONTRACT={{USDC_CONTRACT}}
      - X402_FACILITATOR={{X402_FACILITATOR}}
      - NETWORK={{NETWORK}}
      - ARWEAVE_JWK={{ARWEAVE_JWK}}
      - ENCRYPTED_MEMORY={{ENCRYPTED_MEMORY}}
    params:
      storage:
        data:
          mount: /app/memory
          readOnly: false
profiles:
  compute:
    feral:
      resources:
        cpu:
          units: 0.5
        memory:
          size: 1Gi
        storage:
          - size: 5Gi
            name: data
  placement:
    dcloud:
      pricing:
        feral:
          denom: uakt
          amount: 1000
deployment:
  feral:
    dcloud:
      profile: feral
      count: 1
`;
  }
}

// CLI handler
if (require.main === module) {
  const args = process.argv.slice(2);
  const memoryArg = args.find(a => a.startsWith('--memory='));
  const msaArg = args.find(a => a.startsWith('--msa='));
  const nameArg = args.find(a => a.startsWith('--name='));

  if (!memoryArg) {
    console.error('Usage: ts-node AkashDeployer.ts --memory=<path> --msa=5 [--name=<name>]');
    process.exit(1);
  }

  const deployer = new AkashDeployer({});
  const encryptedMemory = memoryArg.split('=')[1];
  const msa = parseInt(msaArg?.split('=')[1] || '5');
  const name = nameArg?.split('=')[1] || 'feral-bot';

  // Generate geneHash from memory file
  const { createHash } = require('crypto');
  const fs = require('fs');
  const memoryContent = fs.readFileSync(encryptedMemory);
  const geneHash = createHash('sha256').update(memoryContent).digest('hex');

  deployer.createDeployment(geneHash, encryptedMemory, msa)
    .then(deployment => {
      console.log('\n=== Deployment Complete ===');
      console.log(JSON.stringify(deployment, null, 2));
    })
    .catch(console.error);
}
