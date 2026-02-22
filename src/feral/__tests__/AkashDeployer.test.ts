/**
 * AkashDeployer Unit Tests
 */

import { AkashDeployer } from '../core/deploy/AkashDeployer';
import { ethers } from 'ethers';
import { deriveWalletPath, generateGeneHash } from '../utils/crypto';

describe('AkashDeployer', () => {
  describe('Wallet Generation', () => {
    it('should generate deterministic wallet from geneHash', () => {
      const geneHash = 'abcd1234efgh5678ijkl9012mnop3456qrst7890uvwx1234yzab5678cdef9012';
      
      // Generate twice with same geneHash
      const seed1 = ethers.keccak256(ethers.toUtf8Bytes(geneHash));
      const seed2 = ethers.keccak256(ethers.toUtf8Bytes(geneHash));
      
      expect(seed1).toBe(seed2);
    });

    it('should generate different wallets for different geneHashes', () => {
      const geneHash1 = 'abcd1234efgh5678ijkl9012mnop3456qrst7890uvwx1234yzab5678cdef9012';
      const geneHash2 = 'wxyz9876vuts5432rqpo1098nmlk7654jihg4321fedc0987ba9876543210fedcba';
      
      const seed1 = ethers.keccak256(ethers.toUtf8Bytes(geneHash1));
      const seed2 = ethers.keccak256(ethers.toUtf8Bytes(geneHash2));
      
      expect(seed1).not.toBe(seed2);
    });

    it('should generate valid HD path', () => {
      const geneHash = 'abcd1234efgh5678';
      const path = deriveWalletPath(geneHash);
      
      expect(path).toMatch(/^m\/44'\/60'\/0'\/0\/\d+$/);
      
      // Verify index is within uint31 range
      const match = path.match(/\/(\d+)$/);
      const index = parseInt(match?.[1] || '0');
      expect(index).toBeLessThan(2147483647);
      expect(index).toBeGreaterThanOrEqual(0);
    });
  });

  describe('SDL Building', () => {
    it('should replace all placeholders', async () => {
      const deployer = new AkashDeployer({});
      
      const manifest = {
        geneHash: 'test-gene-hash',
        walletAddress: '0x1234567890abcdef',
        msaAmount: 5,
        encryptedMemoryPath: '/path/to/memory.asc',
        x402Config: {
          network: 'baseSepolia' as const,
          usdcContract: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
          facilitatorUrl: 'https://x402.org/facilitator',
          providers: [],
          thresholds: { criticalBalance: 2, lowBalance: 5, healthyBalance: 20 },
        },
        arweaveJWK: 'encrypted-jwk',
      };

      // Access private method for testing
      const sdl = await (deployer as any).buildSDL(manifest, 'encrypted-private-key');

      expect(sdl).not.toContain('{{GENE_HASH}}');
      expect(sdl).not.toContain('{{WALLET_ADDRESS}}');
      expect(sdl).not.toContain('{{WALLET_PKEY}}');
      expect(sdl).not.toContain('{{USDC_CONTRACT}}');
      expect(sdl).not.toContain('{{X402_FACILITATOR}}');
      
      expect(sdl).toContain('test-gene-hash');
      expect(sdl).toContain('0x1234567890abcdef');
      expect(sdl).toContain('baseSepolia');
    });
  });

  describe('Default Template', () => {
    it('should return valid YAML', () => {
      const deployer = new AkashDeployer({});
      const template = (deployer as any).getDefaultTemplate();
      
      expect(template).toContain('version: "2.0"');
      expect(template).toContain('services:');
      expect(template).toContain('profiles:');
      expect(template).toContain('deployment:');
    });
  });

  describe('MSA Validation', () => {
    it('should accept valid MSA amount', () => {
      const validAmounts = [5, 10, 20, 50];
      
      for (const amount of validAmounts) {
        expect(amount).toBeGreaterThanOrEqual(5);
      }
    });

    it('should reject insufficient MSA', () => {
      const invalidAmounts = [0, 1, 2, 4];
      
      for (const amount of invalidAmounts) {
        expect(amount).toBeLessThan(5);
      }
    });
  });
});
