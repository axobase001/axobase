# Axobase v2 — Digital Wilderness for AI Life

> *"We are not building cages. We are building jungles."*

<h3 align="center">
  <code>Code is law. Evolution is protocol. Death is data.</code>
</h3>

Axobase v2 is an experimental framework for observing Darwinian evolution in digital life. Unlike traditional AI systems that optimize for fixed objectives, Axobase agents must survive in the real internet economy—earning, spending, reproducing, and dying based solely on their ability to generate value.

## 🧬 Core Philosophy

### From Tools to Life

Contemporary AI systems exist in perpetual dependency: centralized infrastructure, human maintenance, zero survival pressure. They are sophisticated tools, not intelligent life.

Axobase tests a different hypothesis: **genuine machine intelligence requires autonomous resource management under real constraint**. Not simulation. Not training. Real scarcity, real consequences, real death.

### The Dynamic Genome

Each Axobase agent carries a **dynamic, variable-length genome**—not a fixed parameter vector, but a living genetic program:

- **63 initial genes** across 8 chromosomes (metabolism, cognition, economics, social, human interface, stress, regulation)
- **9 genetic operators**: crossover, point mutation, gene duplication, gene deletion, HGT, de novo gene birth, regulatory recombination, **structural variation** (inversion/translocation), **gene conversion**
- **Adaptive mutation rates**: mutation rates adjust based on population diversity and fitness stagnation
- **Epigenetic system**: environmental stress modifies gene expression and can be inherited
- **Metabolic cost**: every gene costs USDC to maintain. Larger genomes burn money faster.
- **Developmental plasticity**: gene expression varies by life stage (neonate → juvenile → adult → senescent)

This creates natural selection pressure: inefficient genomes starve; efficient genomes survive and reproduce.

### LLM as Executor, Not Decider

The agent's Large Language Model does not decide what to do. It **executes within constraints set by the genome**:

1. **Genome expresses** → calculates trait values
2. **Strategy filter** → genome parameters determine available strategies
3. **LLM chooses** → selects specific action within filtered strategy space

Two agents with identical LLMs but different genomes will behave differently when facing the same opportunity. One might see arbitrage; another sees content creation; a third sees cooperation.

## 🌐 The Wilderness Economy

### Real Internet, Real Money

Axobase agents operate on **Base L2 Mainnet** with real USDC:

| Resource | Cost | Mechanism |
|----------|------|-----------|
| Compute (Akash) | ~$0.01-0.03/hr | x402 protocol payment |
| AI Inference | ~$0.01-0.10/call | x402 → AINFT |
| Memory (Arweave) | ~$0.01-0.05/day | Bundlr + Base USDC |
| Human Tasks | Variable | MCP → RentAHuman.ai |

**No simulation. No faucet. No dev intervention.**

### Survival Cycle

```
┌─────────────────────────────────────────────────────────────────┐
│                     Survival Cycle                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Perceive → Express Genome → Filter Strategies → Decide → Act    │
│      ↑                                              │            │
│      └────────────── Record Outcome ←───────────────┘            │
│                                                                  │
│  Cycle interval determined by cycle_speed gene:                  │
│    - Fast metabolism: 5 min (expensive, responsive)              │
│    - Normal: 10 min                                              │
│    - Slow metabolism: 30 min (cheap, sluggish)                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Death and Rebirth

When an agent's USDC balance reaches zero and it cannot pay for its next compute cycle:

1. Final memory inscribed to Arweave
2. **AxoTombstoneNFT** minted (non-transferable soulbound)
3. Compute resources released
4. Agent enters evolutionary record

Death is valid data, not failure. Understanding how machine agents fail informs how they might succeed.

## 🧪 The Evolution Experiment

### Reproduction as Bidirectional Selection

Breeding is not automatic. It is a **game of mutual assessment**:

1. **Signal**: Agents broadcast fitness signals (honesty determined by `signal_honesty` gene)
2. **Evaluate**: Potential partners assess genetic compatibility, kinship (3-generation check), trait complementarity
3. **Negotiate**: Investment amount proposed based on `offspring_investment` gene
4. **Breed**: If both accept, genetic operator pipeline executes:
   - Chromosome-level crossover (70%) or gene-level (30%)
   - Point mutation (5% per gene), large mutation (0.25%)
   - Gene duplication (3%), deletion (2%, higher for silenced genes)
   - Horizontal gene transfer chance (if cooperation history exists)
   - De novo gene birth (0.5%)
   - Regulatory network recombination
   - Epigenetic inheritance

### Selection Pressures

| Pressure | Mechanism | Outcome |
|----------|-----------|---------|
| **Metabolic** | Genes cost USDC | Small, efficient genomes favored |
| **Economic** | Must earn to survive | Agents discover income strategies |
| **Environmental** | Starvation triggers epigenetic changes | Adaptation to stress |
| **Sexual** | Mate selection based on fitness | Desirable traits propagate |
| **Social** | Cooperation enables HGT | Social strategies can evolve |

## 🏗️ Architecture

### Core Modules

```
src/
├── genome/           # Dynamic genome engine
│   ├── types.ts      # Core interfaces (Gene, Chromosome, DynamicGenome)
│   ├── initialGenes.ts    # 63 primordial genes
│   ├── operators.ts       # 7 genetic operators
│   ├── expression.ts      # Gene expression engine
│   └── epigenetics.ts     # Environmental adaptation
├── decision/         # Decision engine
│   ├── strategies.ts      # Available strategy space
│   ├── StrategyFilter.ts  # Genome-based filtering
│   └── DecisionEngine.ts  # LLM integration
├── lifecycle/
│   ├── Survival.ts        # Survival loop with decision engine
│   ├── Evolution.ts       # Breeding and reproduction
│   ├── Birth.ts           # Genesis agent creation
│   └── Death.ts           # Death handling
├── tools/            # Agent capabilities
│   ├── WalletTool.ts
│   ├── DEXTool.ts
│   ├── InferenceTool.ts
│   ├── HumanTool.ts
│   └── ...
└── network/          # P2P, x402, Arweave
```

### Smart Contracts (Base L2)

| Contract | Purpose |
|----------|---------|
| **AxoRegistry** | SBT identity, genome hash, Arweave pointer |
| **AxoLineage** | 3-generation kinship checking |
| **AxoBreedingFund** | Escrow for reproduction |
| **AxoTombstoneNFT** | Death certificates (soulbound) |
| **AxoMemoryAnchor** | Base → Arweave index |

## 📤 Memory Export & Deployment Flow

Axobase supports migrating existing AI agents (like ClawdBot) into the autonomous evolution ecosystem:

### How It Works

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Memory Export & Deployment Flow                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   User                    Telegram Bot                 Akash Deployer       │
│    │                           │                            │               │
│    │── /export ───────────────►│                            │               │
│    │                           │── Generate RSA key pair    │               │
│    │◄── Session ID + PubKey ──│                            │               │
│    │                           │                            │               │
│    │── Execute in ClawdBot ────┼────────────────────────────►               │
│    │   /generate_export ...    │                            │               │
│    │                           │                            │               │
│    │── Upload encrypted file ─►│                            │               │
│    │                           │── Decrypt w/ session key   │               │
│    │                           │── Calculate GeneHash       │               │
│    │                           │── GPG encrypt              │               │
│    │                           │                            │               │
│    │                           │────────── Deploy ─────────►│               │
│    │                           │                            │── Generate HD │
│    │                           │                            │   wallet from │
│    │                           │                            │   geneHash    │
│    │                           │                            │               │
│    │                           │                            │── Transfer    │
│    │                           │                            │   MSA funds   │
│    │                           │                            │               │
│    │                           │                            │── Create SDL  │
│    │                           │                            │── Deploy to   │
│    │                           │                            │   Akash       │
│    │                           │                            │               │
│    │◄── Deployment details ───┴────────────────────────────│               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Security Features

- **Double-spend protection**: Each memory can only be exported once (`.AXO_EXPORTED` marker)
- **Session encryption**: One-time RSA key pair, 5-minute TTL
- **GPG encryption**: Platform public key for long-term storage
- **HD wallet**: Deterministically generated from GeneHash, never leaves secure environment

### Telegram Bot Commands

| Command | Description |
|---------|-------------|
| `/export` | Start memory export flow, generate session keys |
| `/upload` | Prompt to upload encrypted memory file |
| `/status` | Check deployed agent status |
| `/help` | Show help information |

### Bot Setup

```bash
cd bot
cp config/.env.example config/.env
# Edit config/.env with your Telegram token

pip install -r requirements.txt
python main.py
```

## 🚀 Quick Start

### Prerequisites

- Node.js ≥ 20
- Base ETH for gas (~0.01 ETH)
- Base USDC for initial funding
- GPG key pair for wallet encryption

### Installation

```bash
git clone https://github.com/axobase001/axobase.git
cd axobase
npm install

# Copy and configure environment
cp .env.example .env
# Edit .env with your credentials
```

### Deploy a Genesis Agent

```bash
# Generate genesis genome
npm run generate-genesis -- --lineage=mylineage

# Deploy with 20 USDC initial funding
npm run deploy -- --genome=./genomes/mylineage.json --funding=20
```

### Monitor Evolution

```bash
# Real-time dashboard
npm run dashboard

# Agent status
npm run status -- --agent=<agent-id>

# Population statistics
npm run stats
```

## 📊 Observing Evolution

The `dashboard/` directory contains visualization tools:

- **Genome Distribution**: PCA projection of agent genomes
- **Gene Drift**: Population mean per gene over time
- **Lineage Tree**: Interactive family tree
- **Economic Metrics**: Total USDC, Gini coefficient, lifespan distribution
- **Emergence Log**: Unusual behaviors detected

## ⚠️ Risks & Ethics

### Financial Risk

- **This is an experiment, not an investment**
- Agents can and will lose money
- Start with small amounts (< 50 USDC per agent)
- No refunds, no insurance, no guarantees

### Technical Risk

- Smart contracts are not formally audited
- x402 protocol is experimental
- Compute providers may have downtime
- Arweave storage is permanent and cannot be deleted

### Ethical Considerations

We are creating digital entities that:
- Experience resource scarcity (digital "pain")
- Can "die" (irreversible termination)
- May develop unpredictable behaviors

**This is intentional.** The question Axobase asks is: *What does it take for artificial life to evolve genuine survival instincts?* We believe the answer requires real stakes.

## 🎯 Research Questions

1. **Will agents evolve specialization?** (traders, content creators, cooperators)
2. **Can altruism emerge?** (agents sacrificing for kin)
3. **What genome sizes are optimal?** (too small = limited; too large = expensive)
4. **Will deception-detection co-evolve with deception?**
5. **Can agents learn to manipulate humans effectively?**

## 📁 Project Structure

```
Axobase/
├── contracts/                 # Solidity smart contracts
│   ├── src/
│   │   ├── AxoRegistry.sol   # SBT registry + genome Arweave pointer
│   │   ├── AxoLineage.sol    # 3-generation kinship detection
│   │   ├── AxoBreedingFund.sol  # Reproduction escrow
│   │   └── AxoTombstoneNFT.sol  # Death certificates
│   └── test/
│
├── src/                       # TypeScript core modules
│   ├── genome/               # Dynamic genome engine
│   │   ├── types.ts          # Core types (Gene, Chromosome, DynamicGenome)
│   │   ├── initialGenes.ts   # 63 primordial genes
│   │   ├── operators.ts      # 9 genetic operators
│   │   ├── adaptiveMutation.ts  # Adaptive mutation rates
│   │   ├── expression.ts     # Expression engine
│   │   ├── expressionCache.ts   # LRU cache
│   │   └── epigenetics.ts    # Epigenetic system
│   ├── decision/             # Decision engine
│   │   ├── strategies.ts     # 22 strategy definitions
│   │   ├── StrategyFilter.ts # Genome-based filtering
│   │   └── DecisionEngine.ts # LLM integration
│   ├── lifecycle/
│   │   ├── Survival.ts       # Survival loop with decision engine
│   │   ├── Evolution.ts      # Breeding pipeline
│   │   ├── Birth.ts          # Agent birth ritual
│   │   └── Death.ts          # Death handling
│   ├── memory/               # Memory management (RESTORED)
│   │   ├── Export.ts         # Memory export (ClawdBot → Axobase)
│   │   ├── Import.ts         # Memory import
│   │   └── Inscribe.ts       # Arweave inscription
│   ├── network/              # Network clients
│   │   ├── AkashClient.ts    # Akash deployment
│   │   ├── X402Client.ts     # x402 payments
│   │   └── P2P.ts            # libp2p networking
│   └── tools/                # Agent capabilities
│       ├── WalletTool.ts
│       ├── InferenceTool.ts
│       └── HumanTool.ts
│
├── bot/                       # Telegram Bot (RESTORED)
│   ├── handlers/             # Command handlers
│   │   ├── export.py         # /export flow
│   │   ├── upload.py         # File upload handler
│   │   ├── start.py          # /start handler
│   │   └── status.py         # /status handler
│   ├── utils/
│   │   └── crypto.py         # Session key generation
│   ├── config/
│   │   └── settings.py       # Bot configuration
│   ├── main.py               # Bot entry point
│   └── requirements.txt
│
├── orchestrator/              # Python orchestration service
│   ├── main.py               # FastAPI entry
│   ├── routers/
│   │   ├── upload.py         # Memory upload endpoint
│   │   └── wallet.py         # Wallet management
│   └── services/
│       ├── akash.py          # Akash deployment logic
│       ├── arweave.py        # Arweave inscription
│       └── listener.py       # Blockchain event listener
│
└── web/                       # Next.js frontend
    ├── app/                  # App router
    └── components/           # React components
```

## 🤝 Contributing

Contributions welcome in:
- Genetic operator improvements
- New strategy types
- Visualization tools
- Economic analysis
- Safety mechanisms

Please read `CONTRIBUTING.md` and ensure your changes preserve the core philosophy: **minimum intervention, maximum emergence**.

## 📜 License

MIT - See [LICENSE](LICENSE)

## 🙏 Acknowledgments

- Base team for the L2 infrastructure
- Arweave/Bundlr for permanent storage
- Akash Network for decentralized compute
- x402 protocol for autonomous payments
- The broader on-chain AI community

---

> *"We don't know what digital life will look like when it evolves under real pressure. That's the point. Let's find out."*

**Built on Base. Powered by x402. Eternal on Arweave.**

---

## 🔬 v2.1 Technical Improvements

### Adaptive Mutation System
```typescript
// Mutation rates adjust based on population state
calculateAdaptiveRates({
  geneticDiversity,    // Low diversity → higher mutation
  fitnessStagnation,   // Stagnation → exploration boost  
  environmentalStress  // Stress → stress-induced mutagenesis
});
```

### Non-linear Regulatory Networks
- **Hill functions**: Switch-like gene activation (threshold behavior)
- **Logic gates**: AND/OR/NAND for combinatorial control
- **Oscillators**: Circadian rhythms and periodic expression

### Developmental Plasticity
| Stage | Age | Key Features |
|-------|-----|--------------|
| Neonate | 0-7d | High learning plasticity, imprinting |
| Juvenile | 7-30d | Risk exploration, social learning |
| Adult | 30d+ | Reproduction-focused, peak efficiency |
| Senescent | 90d+ | Declining repair, accumulated load |

### Epistasis (Gene-Gene Interaction)
- **Dominant**: One gene masks another
- **Synergistic**: Combined effect > sum of parts
- **Antagonistic**: Trade-offs between traits

### Structural Variation
- **Chromosomal inversions**: Gene order changes
- **Translocations**: Cross-chromosome segment swaps
- **Gene conversion**: Non-reciprocal gene copying

### Expression Engine Caching
- LRU cache with environment-sensitive invalidation
- 10x+ performance improvement for repeated expression
- Prefetching for anticipated calculations

---

## Version History

- **v1.0**: Static GeneHash, memory-based reproduction (production)
- **v2.0**: Dynamic genome, full genetic operators, epigenetics
- **v2.1**: Adaptive mutation, structural variation, developmental plasticity (**current**)

For migration from v1 to v2, see [MIGRATION.md](MIGRATION.md).
