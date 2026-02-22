/**
 * Cryptographic Utilities
 * 
 * Provides cryptographic functions for the FeralLobster ecosystem:
 * - Merkle tree operations for GeneHash generation
 * - Wallet derivation from geneHash (HD wallets)
 * - Hashing utilities
 */

import { createHash, randomBytes } from 'crypto';

/**
 * Generates a Merkle Root from leaf data
 * @param leaves - Array of data strings to hash
 * @returns Hex string of the Merkle Root
 */
export function generateMerkleRoot(leaves: string[]): string {
  if (leaves.length === 0) {
    return createHash('sha256').update('').digest('hex');
  }

  // Hash all leaves
  let hashes = leaves.map(leaf => 
    createHash('sha256').update(leaf).digest('hex')
  );

  // Build tree bottom-up
  while (hashes.length > 1) {
    const nextLevel: string[] = [];
    
    // Pad if odd number of leaves
    if (hashes.length % 2 === 1) {
      hashes.push(hashes[hashes.length - 1]);
    }

    for (let i = 0; i < hashes.length; i += 2) {
      const combined = hashes[i] + hashes[i + 1];
      nextLevel.push(createHash('sha256').update(combined).digest('hex'));
    }

    hashes = nextLevel;
  }

  return hashes[0];
}

/**
 * Generates a unique GeneHash from memory data
 * @param memoryData - Key-value pairs of memory attributes
 * @returns Hex string GeneHash
 */
export function generateGeneHash(memoryData: Record<string, string>): string {
  const sorted = Object.keys(memoryData).sort();
  const leaves = sorted.map(key => `${key}:${memoryData[key]}`);
  return generateMerkleRoot(leaves);
}

/**
 * Generates cryptographically secure random bytes
 * @param length - Number of bytes to generate (default: 32)
 * @returns Hex string
 */
export function generateRandomBytes(length: number = 32): string {
  return randomBytes(length).toString('hex');
}

/**
 * Hashes file content using SHA-256
 * @param content - Content to hash (Buffer or string)
 * @returns Hex hash string
 */
export function hashContent(content: Buffer | string): string {
  return createHash('sha256').update(content).digest('hex');
}

/**
 * Derives a wallet path from geneHash for HD wallet derivation
 * Path format: m/44'/60'/0'/0/${geneHash-derived-index}
 * @param geneHash - Agent's gene hash
 * @returns BIP44 derivation path
 */
export function deriveWalletPath(geneHash: string): string {
  // Use first 8 chars of geneHash as derivation index
  const index = parseInt(geneHash.slice(0, 8), 16) % 2147483647; // Max uint31
  return `m/44'/60'/0'/0/${index}`;
}
