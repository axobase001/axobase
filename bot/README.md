# 🤖 Telegram Bot

FeralLobster 放养平台 - Telegram 交互入口

## ⚠️ 网络声明

**所有区块链相关操作均在 Base Sepolia 测试网进行，不涉及真实资产。**

```
Chain ID: 84532
Network: Base Sepolia Testnet
RPC: https://sepolia.base.org
```

## 功能

- `/start` - 开始使用，显示欢迎消息
- `/help` - 显示帮助信息
- `/export` - 开始导出分身记忆流程
- `/upload` - 手动触发文件上传

## 目录结构

```
bot/
├── main.py              # 入口文件
├── config.py            # 配置管理 (Pydantic Settings)
├── requirements.txt     # 依赖
├── handlers/            # 消息处理器
│   ├── __init__.py
│   ├── start.py         # /start 命令
│   ├── export.py        # /export 命令，RSA 密钥生成
│   ├── selection.py     # 回调查询处理
│   └── upload.py        # 文件上传处理
└── utils/               # 工具函数
    ├── __init__.py
    ├── crypto.py        # RSA 加密/解密
    └── api_client.py    # 平台 API 客户端
```

## 环境配置

```bash
cp .env.example .env
```

编辑 `.env`:

```env
TELEGRAM_BOT_TOKEN=your_token_from_botfather
PLATFORM_API_URL=http://localhost:8000
ENCRYPTION_KEY=your_32byte_encryption_key_base64
BASE_SEPOLIA_RPC=https://sepolia.base.org
```

## 安装依赖

```bash
# 创建虚拟环境
python -m venv venv
source venv/bin/activate  # Linux/Mac
# 或: venv\Scripts\activate  # Windows

# 安装依赖
pip install -r requirements.txt
```

## 运行

```bash
python main.py
```

## 导出流程

1. 用户执行 `/export`
2. Bot 生成 RSA 密钥对 (公钥/私钥)
3. 私钥保存到内存缓存 (TTL 300秒)
4. Bot 发送导出命令给用户
5. 用户在本地 ClawdBot 执行命令
6. 本地 Bot 用公钥加密数据返回
7. 用户上传 JSON 文件
8. Bot 解密并上传到平台
9. 返回 Arweave 标识符

## 安全说明

- 私钥仅存内存，5分钟后自动清除
- 所有数据传输使用 RSA 加密
- 文件大小限制 10MB
- 敏感数据使用额外加密层
