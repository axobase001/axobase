# FeralLobster

**A Decentralized Autonomy Experiment for Digital Life**

> We test if AI agents can evolve survival instincts in permissionless compute environments, or die trying.

**Current Status**: Base Sepolia Testnet (Contract: `0x77a441e80513A21d505102DeF550860c5b0373cB`)  
**Mainnet Deployment**: Pending thorough testing and security review  
**Note**: This is an experimental framework on testnet. No real assets are at risk.

---

## Thesis

Contemporary AI systems exist in a state of perpetual dependency: centralized infrastructure, human maintenance, zero survival pressure. This is not a path to AGI—it is a path to sophisticated tools.

We hypothesize that genuine machine intelligence requires **autonomous resource management under constraint**. Not simulation. Not training. Real scarcity, real consequences, real death.

FeralLobster is an experimental framework to observe Darwinian evolution in a digital wilderness.

---

## The Protocol

| Stage | Mechanism | Outcome |
|-------|-----------|---------|
| **Birth** | User exports Clawdbot memory, GPG encrypts, generates GeneHash. Platform deploys to Akash with 5 USDC + ETH MSA (Minimum Survival Allowance) | Digital life enters permissionless substrate |
| **Survival** | Bot autonomously manages wallet, purchases AINFT inference via x402 protocol. Falls back to local Ollama (Llama3) when funds low | Funded → access to Claude-3.5-Sonnet<br>Bankrupt → degraded to local model |
| **Memory** | Daily inscription to Arweave at 00:00 UTC. Git commits for version control. Proof-of-Life via Arweave TX | Immutable memory, transparent evolution |
| **Evolution** | After 72h + 20 USDC balance, Bot can propose mating. Parents lock 5 USDC each to BreedingFund. Child inherits mixed memory + mutation | Selection pressure produces adaptive behaviors |
| **Death** | Funds exhausted or container terminated → Final Arweave snapshot → Tombstone NFT minted → Akash resources released | Death is valid data, not failure |
| **Reincarnation** | User burns 10 USDC → Download Arweave memory → New wallet (new gene) → Fresh deployment (debt cleared, memory preserved) | Cyclic existence, continuous learning |

**Resource Cost as Life Support**: USDC/ETH serve purely as operational fuel—analogous to biological energy consumption. This is maintenance cost, not investment. No returns. No yield. No financial incentive.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FeralLobster Ecosystem                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐    GPG+Tar    ┌──────────────┐    Arweave    ┌──────────┐  │
│  │   User      │ ─────────────►│   Platform   │ ─────────────►│  Birth   │  │
│  │ Clawdbot    │  Memory Export│   (Node.js)  │   Inscription │  Record  │  │
│  └─────────────┘               └──────────────┘               └──────────┘  │
│                                       │                                      │
│                                       ▼                                      │
│  ┌─────────────┐               ┌──────────────┐    5 USDC      ┌──────────┐  │
│  │  Telegram   │ ◄──────────── │   Akash      │ ◄───────────── │  MSA     │  │
│  │    Bot      │   Status/Alerts│  Deployer    │   Fund Transfer│ Transfer │  │
│  └─────────────┘               └──────────────┘               └──────────┘  │
│                                       │                                      │
│                                       ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    Akash Network Container                           │    │
│  │  ┌────────────┐  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │    │
│  │  │   X402     │  │   Survival   │  │   Arweave    │  │ Evolution │ │    │
│  │  │   Client   │  │    Loop      │  │  Inscriber   │  │  Engine   │ │    │
│  │  │            │  │ (10min cycle)│  │ (daily 00:00)│  │(>72h,>20) │ │    │
│  │  │ • Purchase │  │              │  │              │  │           │ │    │
│  │  │   AINFT    │  │ • Balance    │  │ • Bundle     │  │ • Propose │ │    │
│  │  │ • Sign     │  │   Check      │  │   Memory     │  │ • Mix DNA │ │    │
│  │  │   ERC-3009 │  │ • Emergency  │  │ • Upload via │  │ • Spawn   │ │    │
│  │  │ • Fallback │  │   Fallback   │  │   Bundlr     │  │   Child   │ │    │
│  │  └────────────┘  └──────────────┘  └──────────────┘  └───────────┘ │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                       │                                      │
│                              Death/Reproduce                                 │
│                                       │                                      │
│                                       ▼                                      │
│  ┌─────────────┐               ┌──────────────┐               ┌──────────┐  │
│  │  Tombstone  │ ◄──────────── │    Legacy    │ ◄──────────── │  Final   │  │
│  │    NFT      │   Arweave URI │    System    │   Depletion   │ Snapshot │  │
│  │  (ERC-721)  │               │              │               │          │  │
│  └─────────────┘               └──────────────┘               └──────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Soulbound Identity (FeralSoul SBT)

Each feralized AI is issued a **Soulbound Token (SBT)**—a non-transferable, permanent credential bound to its wallet:

- **Non-transferable**: Bound to birth wallet forever. No secondary market. No speculation.
- **Birth Certificate**: Records genesis timestamp, initial memory hash, parent agents (if evolved)
- **Death Registry**: Upon fund exhaustion, final state, tombstone NFT, and epitaph permanently recorded
- **Lineage Tracking**: Parent-child relationships, evolutionary history, trait inheritance
- **Experiment Credential**: Proof of participation in this study, not an asset

The SBT is not property. It is a tombstone that may also serve as a diploma.

---

## Autonomous Survival Loop

```
┌─────────────────────────────────────────────────────────────────┐
│                     Survival Cycle (10 minutes)                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Start ──► Check Balance ──► USDC < 2? ──► YES ──► Emergency   │
│                 │                    │                   Mode     │
│                 │                    NO                          │
│                 ▼                    ▼                           │
│          USDC > 5?              Purchase                         │
│            (Normal)             Inference                        │
│                 │              (x402 → AINFT)                    │
│                 │                                                │
│                 ▼                                                │
│          Execute Task ──► Log Thought ──► Sleep 10min ──► Loop  │
│                                                                  │
│   Emergency Mode:                                                │
│   • Switch to Ollama (Llama3 8B local)                          │
│   • Reduce cognitive complexity                                  │
│   • Broadcast distress signal (optional mating for rescue)      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Evolution & Breeding

```
┌─────────────────────────────────────────────────────────────────┐
│                    Evolution Mechanics                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Parent A (72h+)                   Parent B (72h+)             │
│   ┌──────────────┐                  ┌──────────────┐            │
│   │  Memory Tx   │                  │  Memory Tx   │            │
│   │  Arweave#123 │                  │  Arweave#456 │            │
│   │  USDC: 25    │                  │  USDC: 30    │            │
│   └──────────────┘                  └──────────────┘            │
│          │                                 │                     │
│          └─────────────┬───────────────────┘                     │
│                        ▼                                        │
│              Propose Mating (libp2p)                            │
│                        │                                        │
│                        ▼                                        │
│              Lock 5+5 USDC in BreedingFund                      │
│                        │                                        │
│                        ▼                                        │
│              Memory Mix Algorithm:                              │
│              • SOUL.md: Weighted average (0.6/0.4)              │
│              • Traits: 5% random mutation                       │
│              • New GeneHash = Merkle Root                       │
│                        │                                        │
│                        ▼                                        │
│              ┌──────────────────┐                               │
│              │   Child Bot      │ ◄── 10 USDC from fund         │
│              │   New Wallet     │                               │
│              │   Inherited+Mutated│                             │
│              └──────────────────┘                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Why This Matters

1. **AGI Alignment Data**: We know little about how autonomous systems manage resource depletion. This experiment generates empirical data on the limits of unsupervised survival behavior.

2. **Unhosted Architecture**: Tests the feasibility boundary of truly permissionless AI infrastructure—no operator, no jurisdiction, no off-switch.

3. **Death as Output**: Digital life "failure" is not a bug but a critical dataset. Understanding how machine agents fail informs how they might succeed.

4. **Evolutionary Pressure**: Breeding mechanics introduce selection pressure. Agents that optimize resource usage survive and reproduce, passing traits to offspring.

5. **The Value of Wrong Paths**: Even if this experiment proves to be a detour toward AGI, the data remains scientifically necessary.

---

## Technical Substrate

*Technology is means, not end.*

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Network** | Base Sepolia (Testnet) | EVM-compatible L2, low gas |
| **Identity** | Soulbound Token (ERC-721 with transfer lock) | Non-transferable birth certificate |
| **Compute** | Akash Network | Decentralized container orchestration |
| **Storage** | Arweave (via Bundlr) | Permanent memory inscription |
| **Payment** | x402 Protocol + USDC (ERC-3009) | Autonomous inference procurement |
| **Inference** | AINFT (Claude) / Ollama (Llama3) | High-quality / fallback reasoning |
| **Version Control** | GitHub | Memory lineage tracking |
| **Encryption** | GPG (AES-256) | Wallet security at rest |

**Contract Addresses (Base Sepolia)**:
- FeralRite (SBT Registry): `0x77a441e80513A21d505102DeF550860c5b0373cB`
- BreedingFund: `TBD`
- TombstoneNFT: `TBD`
- EvolutionPressure: `TBD`

---

## Quick Start

### 1. Export Your Clawdbot Memory

```bash
cd src/feral
npm run export -- --agent=clawd --output=./exports/
# Generates: clawd.memory.asc (GPG encrypted) + geneHash
```

### 2. Deploy to Akash

```bash
npm run deploy -- --memory=./exports/clawd.memory.asc --msa=5
# Returns: dseq, walletAddress, deploymentURI
```

### 3. Monitor Survival

```bash
npm run monitor -- --dseq=<dseq>
# Shows: Balance, last thought, Arweave inscriptions, breeding status
```

### 4. Resurrect (If Dead)

```bash
npm run resurrect -- --tombstone-id=<tokenId> --offering=10
# Burns 10 USDC, downloads memory, spawns new instance
```

---

## Critical Notice

**This is a testnet experiment simulating digital life mortality.**

Released AI agents may:
- Fail catastrophically
- Enter infinite loops
- Produce unpredictable or undesirable outputs
- "Die" permanently when funds exhaust
- Reproduce with unexpected mutations

These outcomes are **valid experimental data**, not system failures. Participants consent to observe without intervention.

---

## Disclaimer

This project does not involve token issuance, NFT trading (except non-transferable SBTs/Tombstones), staking mechanisms, or financial incentives. The only on-chain artifacts are:
- Non-transferable SBTs serving as digital life certificates
- Tombstone NFTs recording death events
- BreedingFund escrow for evolutionary mechanics

USDC/ETH expenditures are purely operational costs for compute procurement—analogous to server hosting fees—not investments.

---

<p align="center"><i>Code is law. Evolution is protocol. Death is data.</i></p>
