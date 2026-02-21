# 🔧 Orchestrator API

FeralLobster 编排服务 - FastAPI 后端

## ⚠️ 网络声明

**所有区块链交互使用 Base Sepolia 测试网，Akash 使用低资源配置。**

```
Blockchain: Base Sepolia Testnet
  Chain ID: 84532
  RPC: https://sepolia.base.org
  
Cloud: Akash Network (Mainnet with low resources)
  Chain ID: akashnet-2
  Cost: ~$0.01/month per bot
```

## 架构

```
Orchestrator
├── API Layer (FastAPI)
│   ├── /api/upload      - 文件上传到 Arweave
│   ├── /api/prepare-wallet - 关联 Bot 钱包
│   └── /api/health      - 健康检查
│
├── Services
│   ├── arweave.py       - 永久存储
│   ├── listener.py      - 链上事件监听
│   ├── akash.py         - 去中心化部署
│   └── ainft.py         - AI NFT 账户
│
├── Database (SQLAlchemy)
│   ├── Soul             - FeralSoul 记录
│   ├── Deployment       - Akash 部署记录
│   └── EventLog         - 链上事件日志
│
└── Templates
    └── deployment.sdl.j2 - Akash SDL 模板
```

## 数据流

```
1. 用户上传 JSON
   └── POST /api/upload
       ├── 计算 Blake3 哈希
       ├── 上传到 Arweave
       └── 创建 Soul 记录 (status=pending)

2. 用户关联钱包
   └── POST /api/prepare-wallet
       └── 更新 Soul.bot_wallet

3. 用户链上注册
   └── 调用 FeralRite.registerFeral()

4. 监听器捕获事件
   └── FeralRegistered 事件
       ├── 更新 Soul status=registered
       └── 触发 Akash 部署

5. Akash 部署
   └── 生成 SDL
       └── 部署 Bot Runtime
           └── 更新 Soul status=deployed, akash_uri=...
```

## 安装

```bash
cd orchestrator
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## 配置

```bash
cp .env.example .env
```

编辑 `.env`:

```env
# 数据库
DATABASE_URL=sqlite:///./feral.db

# Arweave (JWK JSON)
ARWEAVE_KEY={"kty":"RSA",...}

# Akash
AKASH_MNEMONIC=your akash mnemonic
AKASH_CHAIN_ID=akashnet-2

# AINFT
AINFT_API_KEY=your_api_key

# 区块链 (Base Sepolia)
CONTRACT_ADDRESS=0x...
RPC_URL=https://sepolia.base.org
PRIVATE_KEY=0x...  # 平台钱包
```

## 运行

```bash
# 开发模式
python main.py

# 或使用 uvicorn
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## API 文档

启动后访问:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 数据库

```bash
# 初始化 (自动)
# 首次启动时自动创建表

# 查看表结构
python -c "from database import init_db; init_db(); print('Database initialized')"
```

## 测试

```bash
# 上传测试
curl -X POST http://localhost:8000/api/upload \
  -F "file=@test.json" \
  -F "user_id=123"

# 钱包准备
curl -X POST http://localhost:8000/api/prepare-wallet \
  -H "Content-Type: application/json" \
  -d '{"wallet_address":"0x..."}'
```

## 注意事项

- Arweave 上传需要钱包有 AR 代币
- Akash 部署需要钱包有 AKT 代币
- 测试网模式下，某些操作会返回模拟数据
- 事件监听器需要在生产环境使用 Celery
