# 🚀 FeralLobster 部署指南

> ⚠️ **WARNING: BASE SEPOLIA TESTNET ONLY**
> 
> 本项目**仅在 Base Sepolia 测试网**运行。所有配置、合约地址和 RPC 节点均为测试网专用。
> 
> **禁止**使用主网私钥或主网资金！

---

## 📋 前置要求

### 1. 开发环境

| 工具 | 版本 | 安装命令 |
|------|------|---------|
| **Foundry** | 最新 | `curl -L https://foundry.paradigm.xyz \| bash` |
| **Node.js** | 18+ | [nodejs.org](https://nodejs.org/) |
| **Python** | 3.11+ | [python.org](https://python.org/) |
| **Docker Desktop** | 最新 | [docker.com](https://docker.com/) |
| **Git** | 2.30+ | 系统包管理器 |

### 2. 验证安装

```bash
# 验证 Foundry
forge --version  # 应显示版本号

# 验证 Node
node --version   # v18.x.x 或更高

# 验证 Python
python --version  # Python 3.11.x

# 验证 Docker
docker --version && docker-compose --version
```

---

## 🧪 测试网配置

### 1. Base Sepolia RPC

```bash
# 公开 RPC (可能有速率限制)
export BASE_SEPOLIA_RPC="https://sepolia.base.org"

# 或 Alchemy (推荐，需注册)
export BASE_SEPOLIA_RPC="https://base-sepolia.g.alchemy.com/v2/YOUR_API_KEY"

# 或 Infura (需注册)
export BASE_SEPOLIA_RPC="https://base-sepolia.infura.io/v3/YOUR_PROJECT_ID"
```

### 2. 测试网水龙头 (获取免费 ETH)

| 提供商 | 链接 | 要求 |
|--------|------|------|
| **Base 官方** | [coinbase.com/faucets](https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet) | Coinbase 账号，每 24h 0.1 ETH |
| **Alchemy** | [alchemy.com/faucets/base-sepolia](https://www.alchemy.com/faucets/base-sepolia) | Alchemy 账号，主网活跃地址 |
| **Infura** | [infura.io/faucet/base-sepolia](https://www.infura.io/faucet/base-sepolia) | Infura 账号 |
| **QuickNode** | [faucet.quicknode.com/base/sepolia](https://faucet.quicknode.com/base/sepolia) | QuickNode 账号 |

### 3. 测试网 USDC

Base Sepolia USDC 合约地址：
```
0x036CbD53842c5426634e7929541eC2318f3dCF7e
```

可以从 [USDC Faucet](https://faucet.circle.com/) 获取测试 USDC。

---

## 🔐 环境配置

### 1. 克隆仓库

```bash
git clone https://github.com/0xinvictus1999/FeralLobster.git
cd FeralLobster
```

### 2. 配置环境变量

```bash
# 1. 合约环境
cp contracts/.env.example contracts/.env
# 编辑 contracts/.env，填入你的测试网私钥

# 2. Orchestrator 环境
cp orchestrator/.env.example orchestrator/.env
# 编辑 orchestrator/.env，填入所有必需配置

# 3. Bot 环境
cp bot/.env.example bot/.env
# 编辑 bot/.env，填入 Telegram Bot Token

# 4. Web 环境
cp web/.env.local.example web/.env.local
# 编辑 web/.env.local，填入合约地址
```

⚠️ **重要警告**
- 使用**全新的测试网钱包**，不要使用主网钱包
- 私钥仅用于测试网，不要在其他项目重复使用
- 不要将 `.env` 文件提交到 Git

---

## 📜 部署智能合约

### 1. 安装依赖

```bash
cd contracts
forge install
```

### 2. 部署到 Base Sepolia

```bash
# 确保 .env 中配置了 PRIVATE_KEY
source .env

# 部署合约
forge script script/Deploy.s.sol \
  --rpc-url $BASE_SEPOLIA_RPC \
  --broadcast \
  --verify  # 如果配置了 BASESCAN_API_KEY
```

### 3. 记录合约地址

部署成功后，控制台会输出：
```
Contract Address: 0x...
```

将此地址更新到：
- `web/.env.local` 中的 `NEXT_PUBLIC_CONTRACT_ADDRESS`
- `orchestrator/.env` 中的 `CONTRACT_ADDRESS`

---

## 🐳 Docker 部署

### 1. 构建并启动所有服务

```bash
# 在项目根目录
docker-compose up --build

# 后台运行
docker-compose up --build -d

# 查看日志
docker-compose logs -f
```

### 2. 验证服务状态

```bash
# 检查所有容器
docker-compose ps

# 测试 Orchestrator API
curl http://localhost:8000/api/health

# 测试 Web 前端
open http://localhost:3000
```

### 3. 停止服务

```bash
docker-compose down

# 同时删除数据卷 (谨慎使用)
docker-compose down -v
```

---

## 🤖 配置 Telegram Bot

### 1. 创建 Bot

1. 在 Telegram 中搜索 `@BotFather`
2. 发送 `/newbot`
3. 按照提示设置 Bot 名称和用户名
4. 保存获得的 **Bot Token**
5. 将 Token 填入 `bot/.env` 的 `TELEGRAM_BOT_TOKEN`

### 2. 配置 Webhook (可选，生产环境)

```bash
# 设置 Webhook
curl -F "url=https://your-domain.com/webhook" \
  https://api.telegram.org/bot<TOKEN>/setWebhook
```

---

## ☁️ 配置 AINFT

### 1. 注册账号

访问 [ainft.com](https://ainft.com) 注册账号。

⚠️ **注意**: 确保使用**测试环境** API 端点。

### 2. 获取 API Key

1. 登录 AINFT 控制台
2. 创建新项目
3. 生成 API Key
4. 将 Key 填入 `orchestrator/.env` 和 `bot-runtime` 配置

---

## ⛓️ 配置 Akash (可选)

### 1. 安装 Akash CLI

```bash
# macOS/Linux
curl https://raw.githubusercontent.com/ovrclk/akash/master/godownloader.sh | sh

# 或从源码安装
go install github.com/akash-network/node/cmd/akash@latest
```

### 2. 创建 Akash 钱包

```bash
# 生成新钱包
akash keys add feral-wallet

# 保存助记词到安全位置
# 将助记词填入 orchestrator/.env 的 AKASH_MNEMONIC
```

### 3. 获取测试网 AKT

```bash
# 查看地址
akash keys show feral-wallet -a

# 从水龙头获取测试 AKT
# https://faucet.akash.network/ (edgenet)
```

⚠️ **注意**: 当前配置使用 Akash 主网但极低资源配置 (约 $0.01/月)。

---

## ✅ 部署验证

### 1. 合约验证

访问 [sepolia.basescan.org](https://sepolia.basescan.org/)，搜索你的合约地址，确认：
- 合约代码已验证
- 可以读取 `getFeralStatus` 函数

### 2. 服务验证

```bash
# 1. 测试 Orchestrator 健康检查
curl http://localhost:8000/api/health

# 2. 测试 Bot (发送 /start 到 Bot)
# 应返回欢迎消息

# 3. 测试 Web (访问 http://localhost:3000)
# 应显示主页和测试网警告

# 4. 连接 MetaMask
# 应提示切换到 Base Sepolia
```

### 3. 完整流程测试

参考 [TESTING.md](./TESTING.md) 进行端到端测试。

---

## 🔧 故障排查

### 问题: 合约部署失败

**原因**: 
- 使用了错误的网络
- 私钥格式错误
- 没有足够的手续费 (ETH)

**解决**:
```bash
# 检查网络
cast chain-id --rpc-url $BASE_SEPOLIA_RPC
# 应返回 84532

# 检查余额
cast balance $YOUR_ADDRESS --rpc-url $BASE_SEPOLIA_RPC

# 从水龙头获取 ETH
```

### 问题: Web 无法连接钱包

**原因**: 
- MetaMask 网络不正确
- 合约地址配置错误

**解决**:
- 确保 MetaMask 切换到 Base Sepolia
- 检查 `.env.local` 中的合约地址

### 问题: Docker 服务启动失败

**解决**:
```bash
# 查看详细日志
docker-compose logs orchestrator
docker-compose logs bot
docker-compose logs web

# 重新构建
docker-compose down
docker-compose up --build
```

---

## 📞 支持

- **GitHub Issues**: [github.com/0xinvictus1999/FeralLobster/issues](https://github.com/0xinvictus1999/FeralLobster/issues)
- **文档**: [项目 Wiki](https://github.com/0xinvictus1999/FeralLobster/wiki)

---

**⚠️ 再次警告: 本项目仅在 Base Sepolia 测试网运行。不要在上主网前使用真实资金！**
