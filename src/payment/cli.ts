#!/usr/bin/env node
/**
 * FeralLobster Payment CLI
 * Command-line interface for wallet management and payments
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { cli } from './FeralPayment';

const [,, command, ...args] = process.argv;

if (!command) {
  console.log(`
FeralLobster Payment CLI

Commands:
  generate-wallet [--agent-id=<id>]     Generate new encrypted wallet
  export-wallet --gpg-key=<email>       Export wallet encrypted for GPG key
  status [--agent-id=<id>]              Show wallet status and balance
  buy <provider> <task>                 Execute inference with payment

Environment Variables:
  PRIVATE_KEY_GPG_PASSPHRASE   Required for wallet operations
  BASE_RPC_URL                 Base network RPC endpoint
  NETWORK                      base or baseSepolia
  AGENT_ID                     Default agent identifier

Examples:
  npm run generate-wallet -- --agent-id=my-agent
  npm run export-wallet -- --gpg-key=backup@example.com
  npm run buy -- ainft "Analyze market trends"
`);
  process.exit(0);
}

cli(command, args).catch((error) => {
  console.error('CLI Error:', error);
  process.exit(1);
});
