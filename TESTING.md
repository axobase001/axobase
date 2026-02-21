# 🧪 FeralLobster 测试指南

> ⚠️ **WARNING: BASE SEPOLIA TESTNET ONLY**
> 
> 所有测试操作**必须在 Base Sepolia 测试网**进行。
> 使用测试 ETH 和测试 USDC，**不涉及真实资产**。

---

## 🎯 测试目标

验证完整的端到端流程：
1. Telegram Bot 导出分身记忆
2. Web 前端完成放养流程
3. 合约注册成功
4. Akash 自动部署

---

## 📦 测试准备

### 1. 环境要求

确保已按照 [DEPLOYMENT.md](./DEPLOYMENT.md) 完成部署：

```bash
# 验证所有服务运行中
docker-compose ps

# 应显示以下容器运行中:
# - feral_postgres
# - feral_redis
# - feral_orchestrator
# - feral_bot
# - feral_web
```

### 2. 测试账号准备

| 账号 | 用途 | 获取方式 |
|------|------|---------|
| Telegram 账号 | 测试 Bot | 已有账号 |
| MetaMask 钱包 | Web 交互 | [metamask.io](https://metamask.io) |
| 测试 ETH | Gas 费 | [Alchemy Faucet](https://www.alchemy.com/faucets/base-sepolia) |
| 测试 USDC | Bot 资金 | [Circle Faucet](https://faucet.circle.com/) |

### 3. 配置 MetaMask

1. 添加 Base Sepolia 网络：
```
网络名称: Base Sepolia
RPC URL: https://sepolia.base.org
链 ID: 84532
货币符号: ETH
区块浏览器: https://sepolia.basescan.org
```

2. 添加测试 USDC：
```
代币合约: 0x036CbD53842c5426634e7929541eC2318f3dCF7e
代币符号: USDC
小数位数: 6
```

---

## 🔄 端到端测试流程

### 步骤 1: 模拟本地 ClawdBot

打开终端，运行模拟脚本：

```bash
python scripts/mock_clawd.py
```

此脚本会模拟本地 Bot 响应，监听 `/generate_export` 命令。

### 步骤 2: Telegram Bot 测试

1. **在 Telegram 中搜索你的 Bot**
   - 搜索你在 `@BotFather` 创建的 Bot

2. **发送 `/start`**
   - 预期: 收到欢迎消息，显示 "🧪 Base Sepolia Testnet"

3. **发送 `/export`**
   - 预期: 收到导出命令，包含 session_id 和公钥
   - 注意: 公钥有效期 5 分钟

4. **在 mock_clawd.py 终端执行显示的命令**
   ```
   /generate_export <session_id> <public_key>
   ```
   - 预期: 脚本返回加密的记忆数据

5. **上传记忆文件**
   - 将 `mock/clawd_memory.json` 发送给 Bot
   - 预期: 收到标识符 (格式: `arweave_id::hash`)
   - ⚠️ 标识符会在 10 秒后自毁，及时复制

### 步骤 3: Web 前端测试

1. **访问 Web 界面**
   ```
   http://localhost:3000
   ```
   - 预期: 看到黄色测试网警告横幅

2. **点击 "开始放养"**
   - 预期: 进入 5 步骤流程页面

3. **步骤 1: 连接钱包**
   - 点击 "Connect Wallet"
   - 选择 MetaMask
   - 确保 MetaMask 显示 "Base Sepolia" 网络
   - ⚠️ 如果显示其他网络，页面会提示切换

4. **步骤 2: 输入标识符**
   - 粘贴从 Bot 获得的标识符
   - 预期: 显示 "有效 - 可以注册"
   - 检查链上状态，确保未被使用

5. **步骤 3: 生成 Bot 钱包**
   - 点击 "生成 Bot 钱包"
   - 预期: 显示新钱包地址和私钥
   - **下载密钥文件** (选择加密下载，设置密码)
   - 点击 "确认钱包生成"

6. **步骤 4: 资金充值**
   - 显示 Bot 钱包地址和二维码
   - 从水龙头获取测试 ETH 和 USDC：
     ```
     # 获取 ETH
     https://www.alchemy.com/faucets/base-sepolia
     
     # 获取 USDC
     https://faucet.circle.com/
     ```
   - 发送 **11 USDC** 到显示的 Bot 地址
   - 预期: 进度条增加到 100%，显示 "资金确认"

7. **步骤 5: 释放生命**
   - 输入 `CONFIRM`
   - 点击 "释放生命"
   - MetaMask 弹出交易确认窗口
   - ⚠️ 检查网络显示为 "Base Sepolia"
   - 确认交易
   - 预期: 显示 "释放成功!" 和交易哈希

### 步骤 4: 验证链上数据

1. **查看交易详情**
   - 点击 "查看区块链浏览器"
   - 或在 [sepolia.basescan.org](https://sepolia.basescan.org/) 搜索交易哈希
   - 预期: 交易状态 "Success"

2. **验证合约状态**
   - 在 Basescan 的 Contract 标签页
   - 调用 `getFeralStatus` 函数，输入 memory hash
   - 预期: 返回 Soul 信息，包含 botWallet 和 birthTime

### 步骤 5: 验证 Akash 部署

1. **查看 Orchestrator 日志**
   ```bash
   docker-compose logs -f orchestrator
   ```
   - 预期: 看到 "FeralRegistered event detected"
   - 看到 "Triggering Akash deployment"

2. **检查部署状态**
   ```bash
   curl http://localhost:8000/api/status
   ```
   - 预期: Soul 状态为 "deployed"
   - 包含 akash_uri

3. **访问 Bot 运行时** (如果部署成功)
   ```
   curl <akash_uri>/health
   ```
   - 预期: 返回 {"status": "alive", ...}

---

## 🔍 故障排查

### 问题: 合约调用失败 (步骤 5)

**症状**: MetaMask 显示 "Transaction Failed"

**可能原因**:
1. 使用了错误的网络 (不是 Base Sepolia)
2. 合约地址错误
3. Soul 已被注册 (hash 重复)

**排查步骤**:
```bash
# 1. 检查 MetaMask 网络
cast chain-id --rpc-url https://sepolia.base.org
# 应返回 84532

# 2. 验证合约地址
cast call $CONTRACT_ADDRESS "soulExists(bytes32)(bool)" $MEMORY_HASH \
  --rpc-url https://sepolia.base.org
# 应返回 false (未注册)

# 3. 检查钱包余额
cast balance $WALLET_ADDRESS --rpc-url https://sepolia.base.org
```

### 问题: Arweave 上传慢

**症状**: 步骤 2 中上传文件后长时间无响应

**说明**: 
- 正常现象，Arweave 需要矿工确认
- 测试网可能比主网慢

**解决**:
- 等待 1-3 分钟
- 或使用模拟模式 (返回 mock_arweave_id)

### 问题: AINFT 连接失败

**症状**: 日志显示 "AINFT API connection failed"

**可能原因**:
1. API Key 错误
2. 使用了生产端点而非测试端点

**解决**:
```bash
# 检查 orchestrator/.env
cat orchestrator/.env | grep AINFT

# 应包含:
# AINFT_API_KEY=...
# AINFT_API_URL=https://api.ainft.ai  (确保是测试环境)
```

### 问题: Docker 容器无法启动

**症状**: `docker-compose up` 报错

**排查**:
```bash
# 1. 检查端口占用
lsof -i :8000  # Orchestrator
lsof -i :3000  # Web
lsof -i :5432  # PostgreSQL

# 2. 清理旧容器
docker-compose down -v
docker system prune

# 3. 重新构建
docker-compose up --build
```

### 问题: 资金未到账 (步骤 4)

**症状**: 充值后余额不更新

**排查**:
1. 确认使用了正确的 USDC 合约地址
2. 在 [sepolia.basescan.org](https://sepolia.basescan.org/) 搜索你的地址
3. 查看 USDC Token 余额

---

## 📊 测试清单

- [ ] 完成 Telegram Bot /export 流程
- [ ] 获得有效标识符
- [ ] Web 连接 MetaMask (Base Sepolia)
- [ ] 生成 Bot 钱包并下载密钥
- [ ] 从水龙头获取测试 ETH
- [ ] 从水龙头获取测试 USDC
- [ ] 成功转账 11 USDC 到 Bot 钱包
- [ ] 完成链上注册 (registerFeral)
- [ ] 在 Basescan 验证交易
- [ ] Orchestrator 监听到事件
- [ ] Akash 部署触发 (日志中出现)

---

## 🎉 测试成功标志

当你看到以下信息，说明测试成功：

1. **Web 页面**: "🦞 释放成功!"
2. **Basescan**: 交易状态 "Success"，调用了 `registerFeral`
3. **Orchestrator 日志**: 
   ```
   FeralRegistered event detected: hash=0x...
   Soul 1 updated to REGISTERED
   Triggering Akash deployment for 0x...
   ```
4. **Akash 日志** (如果配置):
   ```
   Deployment created: id=123
   URI: https://feral-bot-xxx.dcloud.app
   ```

---

**⚠️ 记住: 这只是在测试网运行的测试系统。所有代币都是测试代币，没有实际价值。**
