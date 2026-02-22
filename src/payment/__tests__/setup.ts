/**
 * Jest Test Setup
 */

import { TextEncoder, TextDecoder } from 'util';

// Polyfill for Node 16
global.TextEncoder = TextEncoder as any;
global.TextDecoder = TextDecoder as any;

// Mock console methods during tests (optional)
// global.console = {
//   ...console,
//   // Uncomment to ignore specific console methods during tests
//   // log: jest.fn(),
//   // debug: jest.fn(),
// };

// Set test environment variables
process.env.FERAL_HOME = '/tmp/test-feral';
process.env.AGENT_ID = 'test-agent';
process.env.PRIVATE_KEY_GPG_PASSPHRASE = 'test-passphrase';
process.env.NETWORK = 'baseSepolia';
process.env.BASE_RPC_URL = 'https://sepolia.base.org';

// Clean up after all tests
afterAll(() => {
  // Any global cleanup
});
