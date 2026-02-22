# FeralLobster x402 Payment System

AI Agent Autonomous Payment Framework for FeralLobster. Enables digital life forms to independently procure compute resources through the x402 payment protocol.

## Overview

This module implements the **x402 protocol** for autonomous AI agent payments, allowing agents to:

- Self-manage crypto wallets with GPG-encrypted security
- Automatically pay for inference services (AINFT, OpenRouter, etc.)
- Handle 402 Payment Required responses with ERC-3009 signatures
- Maintain audit trails via Git-tracked transaction logs

> **Note**: This is an experimental framework on Base Sepolia testnet. No real assets are at risk.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    FeralPayment (Main API)                       │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ X402Client   │  │ AgentWallet  │  │ InferencePurchaser   │  │
│  │              │  │              │  │                      │  │
│  │ • Payment    │  │ • GPG        │  │ • Provider selection │  │
│  │   headers    │  │   encryption │  │ • Quote comparison   │  │
│  │ • 402        │  │ • Balance    │  │ • Auto-fallback      │  │
│  │   handling   │  │   monitoring │  │                      │  │
│  │ • Settlement │  │ • ERC-3009   │  │                      │  │
│  │   polling    │  │   signing    │  │                      │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ MemoryLogger │  │ GPGManager   │  │ SecureMemory         │  │
│  │              │  │              │  │                      │  │
│  │ • Git commit │  │ • Encrypt/   │  │ • RAM-only storage   │  │
│  │ • SOUL.md    │  │   decrypt    │  │ • Auto-cleanup       │  │
│  │ • Finance    │  │ • Export     │  │ • Process hooks      │  │
│  │   tracking   │  │              │  │                      │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Environment Setup

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Generate Wallet

```bash
npm run generate-wallet -- --agent-id=my-agent
```

### 4. Build and Test

```bash
npm run build
npm run test:x402
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PRIVATE_KEY_GPG_PASSPHRASE` | Yes | GPG passphrase for wallet encryption |
| `BASE_RPC_URL` | Yes | Base network RPC endpoint |
| `NETWORK` | No | `base` or `baseSepolia` (default: baseSepolia) |
| `FERAL_HOME` | No | Project root path (default: /app) |
| `AGENT_ID` | No | Unique agent identifier |
| `HARDWARE_WALLET` | No | Enable hardware wallet mode (default: false) |
| `OPENROUTER_API_KEY` | No | Fallback API key for OpenRouter |
| `GROQ_API_KEY` | No | Emergency fallback API key |

## Usage

### Basic Inference with Auto-Payment

```typescript
import { FeralPayment } from '@ferallobster/payment';

const payment = new FeralPayment({
  agentId: 'my-feral-agent',
  network: 'baseSepolia',
});

await payment.initialize();

// Automatic provider selection and payment
const result = await payment.infer('Analyze this market data', {
  model: 'claude-3-5-sonnet',
  max_tokens: 2048,
});

console.log(`Response: ${result.content}`);
console.log(`Cost: ${result.cost} USDC`);
console.log(`TxHash: ${result.paymentHash}`);
```

### Telegram Bot Integration

```typescript
// In your Telegram bot handler
bot.command('buy', async (ctx) => {
  const [provider, ...taskParts] = ctx.message.text.split(' ').slice(1);
  const task = taskParts.join(' ');
  
  const result = await payment.buy(provider, task);
  
  if (result.success) {
    ctx.reply(`✅ Task completed\n💰 Cost: ${result.cost} USDC\n🔗 ${result.txHash}`);
  } else {
    ctx.reply(`❌ Error: ${result.error}`);
  }
});
```

### CLI Commands

```bash
# Check wallet status
npm run status -- --agent-id=my-agent

# Execute inference with payment
npm run buy -- ainft "Analyze market trends"

# Export encrypted wallet backup
npm run export-wallet -- --gpg-key=backup@example.com
```

## Configuration

### Provider Setup (`config/x402.json`)

```json
{
  "providers": [
    {
      "name": "AINFT",
      "endpoint": "https://api.ainft.com/inference",
      "supportsX402": true,
      "model": "claude-3-5-sonnet",
      "priority": 1,
      "maxCostPerRequest": 1.0
    }
  ]
}
```

### Network Configuration

| Network | USDC Contract | Chain ID |
|---------|--------------|----------|
| Base Mainnet | `0x8335...2913` | 8453 |
| Base Sepolia | `0x036C...CF7e` | 84532 |

## x402 Protocol Flow

```
┌────────┐         ┌──────────────┐         ┌─────────────┐
│ Agent  │ ──────► │ API Endpoint │ ──────► │  402 Response│
│        │  POST   │              │ 402     │ (X-PAYMENT-  │
│        │         │              │         │  INFO header) │
└────────┘         └──────────────┘         └─────────────┘
     │                                               │
     │                                               ▼
     │                                       Parse payment
     │                                       requirements
     │                                               │
     ▼                                               │
┌──────────────┐                                    │
│ Sign ERC-3009│◄───────────────────────────────────┘
│ authorization│
└──────────────┘
     │
     ▼
┌────────┐         ┌──────────────┐         ┌─────────────┐
│ Agent  │ ──────► │ API Endpoint │ ──────► │  Success +  │
│        │  POST   │              │ 200     │  X-PAYMENT- │
│        │ +X-PAY  │              │         │  RESPONSE   │
└────────┘         └──────────────┘         └─────────────┘
     │                                               │
     │                                               ▼
     ▼                                       Submit evidence
┌──────────────┐                              to facilitator
│   Polling    │◄───────────────────────────────────┘
│   for conf   │
└──────────────┘
```

## Security

### Private Key Protection

- **GPG Encryption**: All private keys stored encrypted at rest (`~/.feral/wallet.asc`)
- **Secure Memory**: Decrypted keys only exist in RAM, never on disk
- **Auto-Cleanup**: Keys wiped on process exit, crash, or timeout
- **No Logging**: Private keys never logged or exposed in error traces

### Replay Protection

- **UUID v4 Nonces**: Every payment authorization uses unique nonce
- **Time Windows**: Payments valid only for specified time range (±5 min)
- **Used Nonce Tracking**: In-memory Set prevents nonce reuse

### Fallback Security

- **Price Manipulation Detection**: Rejects payments >300% of historical average
- **Provider Fallback**: Auto-switches if primary provider fails
- **Balance Alerts**: Automatic warnings at LOW (20 USDC) and CRITICAL (5 USDC)

## Transaction Logging

All payments are logged to Git-tracked files:

```
memory/
├── SOUL.md              # Agent identity & alerts
├── HEARTBEAT.md         # System health log
├── transactions/
│   ├── 2026-02-22.md    # Daily payment log
│   └── 2026-02-23.md
└── finance/
    └── finance_2026-02.md  # Monthly accounting
```

Example log entry:
```markdown
- 14:32:15 [PAY] -0.5 USDC to AINFT for task_123456 | claude-3-5-sonnet | "Market analysis shows..." | tx: 0xabc...
```

## Testing

```bash
# Run all tests
npm test

# Run x402-specific tests
npm run test:x402

# Run with coverage
npm test -- --coverage

# Run in watch mode
npm run test:watch
```

### Test Coverage

- ✅ ERC-3009 signature generation
- ✅ 402 response handling
- ✅ Settlement polling with retry
- ✅ Provider fallback logic
- ✅ Private key memory security
- ✅ Balance monitoring alerts

## Deployment

### Akash Network

```yaml
# deploy.yaml
version: "2.0"
services:
  payment:
    image: ferallobster/payment:latest
    env:
      - PRIVATE_KEY_GPG_PASSPHRASE=<encrypted>
      - BASE_RPC_URL=https://sepolia.base.org
      - NETWORK=baseSepolia
    volumes:
      - wallet:/app/.feral
```

### Docker

```bash
docker build -t ferallobster/payment .
docker run -e PRIVATE_KEY_GPG_PASSPHRASE=<pass> ferallobster/payment
```

## License

MIT - See [LICENSE](../../LICENSE)

## References

- [x402 Protocol](https://github.com/coinbase/x402)
- [ERC-3009](https://eips.ethereum.org/EIPS/eip-3009)
- [Base Network](https://base.org)
- [Akash Network](https://akash.network)
