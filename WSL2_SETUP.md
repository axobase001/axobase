# WSL2 配置指南

在 Windows 上使用 WSL2 (Windows Subsystem for Linux) 运行 FeralLobster 项目。

---

## 📋 前置要求

- Windows 10 版本 2004 及更高版本（内部版本 19041 及更高版本）
- Windows 11（所有版本）
- 管理员权限

---

## 1️⃣ 安装 WSL2

### 自动安装（推荐）

以管理员身份打开 PowerShell，运行：

```powershell
wsl --install
```

这将安装：
- WSL2 内核
- Ubuntu（默认发行版）

### 手动安装（如果自动安装失败）

```powershell
# 启用 WSL
Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux

# 启用虚拟机平台
Enable-WindowsOptionalFeature -Online -FeatureName VirtualMachinePlatform

# 设置 WSL2 为默认版本
wsl --set-default-version 2

# 从 Microsoft Store 安装 Ubuntu
# 搜索 "Ubuntu" 并安装
```

### 重启电脑

安装完成后，**必须重启电脑**。

---

## 2️⃣ 配置 Ubuntu

### 首次启动

重启后，从开始菜单打开 "Ubuntu"：

```bash
# 设置用户名
Enter new UNIX username: ferallobster

# 设置密码
New password: [输入密码]
Retype new password: [再次输入]
```

### 更新系统

```bash
sudo apt update && sudo apt upgrade -y
```

### 安装基础工具

```bash
sudo apt install -y curl git vim build-essential pkg-config libssl-dev
```

---

## 3️⃣ 安装 Foundry

```bash
# 安装 Foundry
curl -L https://foundry.paradigm.xyz | bash

# 使 foundryup 可用
source ~/.bashrc

# 安装 forge, cast, anvil, chisel
foundryup

# 验证安装
forge --version
cast --version
anvil --version
```

预期输出：
```
forge 0.2.0 (a1b2c3d 2024-XX-XXTXX:XX:XX.XXXXXXXZ)
cast 0.2.0 (a1b2c3d 2024-XX-XXTXX:XX:XX.XXXXXXXZ)
anvil 0.2.0 (a1b2c3d 2024-XX-XXTXX:XX:XX.XXXXXXXZ)
```

---

## 4️⃣ 安装 Node.js 18+

```bash
# 使用 nvm 安装 Node.js
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# 使 nvm 可用
source ~/.bashrc

# 安装 Node.js 18
nvm install 18
nvm use 18
nvm alias default 18

# 验证
node --version  # v18.x.x
npm --version   # 9.x.x
```

---

## 5️⃣ 安装 Python 3.11+

```bash
# 添加 deadsnakes PPA
sudo add-apt-repository ppa:deadsnakes/ppa
sudo apt update

# 安装 Python 3.11
sudo apt install -y python3.11 python3.11-venv python3.11-dev python3-pip

# 设置默认 Python
sudo update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.11 1

# 验证
python3 --version  # Python 3.11.x
```

---

## 6️⃣ 安装 Docker Desktop

### Windows 端安装

1. 下载 [Docker Desktop](https://www.docker.com/products/docker-desktop)
2. 安装时勾选 "Use WSL 2 instead of Hyper-V"
3. 在 Settings > Resources > WSL Integration 中启用 Ubuntu

### WSL 端验证

```bash
# 在 Ubuntu 中测试 Docker
docker --version
docker-compose --version

# 测试运行
docker run hello-world
```

---

## 7️⃣ 配置 FeralLobster 项目

### 克隆项目

```bash
# 进入 WSL home 目录
cd ~

# 克隆项目
git clone https://github.com/0xinvictus1999/FeralLobster.git
cd FeralLobster
```

### 访问 Windows 文件（可选）

WSL 可以访问 Windows 文件：

```bash
# Windows C 盘在 WSL 中的路径
cd /mnt/c

# 例如访问桌面
cd /mnt/c/Users/$USER/Desktop
```

### 配置项目

```bash
# 1. 安装合约依赖
cd ~/FeralLobster/contracts
forge install

# 2. 编译合约
forge build

# 3. 运行测试（使用 Base Sepolia Fork）
forge test --fork-url https://sepolia.base.org -vvv
```

---

## 8️⃣ 使用 VS Code 开发

### 安装 VS Code

Windows 端安装 [VS Code](https://code.visualstudio.com/)

### 安装插件

1. 打开 VS Code
2. 安装 "Remote - WSL" 扩展
3. 按 `Ctrl+Shift+P`，输入 "WSL: Connect to WSL"
4. 打开 `~/FeralLobster` 文件夹

### 配置 Solidity 支持

在 VS Code (WSL 模式) 中安装：
- Solidity (Juan Blanco)
- Solidity + Hardhat (Nomic Foundation)

---

## 9️⃣ 常用命令速查

### WSL 管理

```powershell
# PowerShell 中运行

# 查看 WSL 状态
wsl --status

# 查看已安装的发行版
wsl --list --verbose

# 设置默认发行版
wsl --set-default Ubuntu

# 设置默认 WSL 版本
wsl --set-default-version 2

# 关闭所有 WSL
wsl --shutdown

# 进入特定发行版
wsl -d Ubuntu
```

### 项目运行

```bash
# WSL Ubuntu 中运行

# 编译合约
cd ~/FeralLobster/contracts
forge build

# 运行测试
forge test

# 部署到 Base Sepolia
forge script script/Deploy.s.sol \
  --rpc-url $BASE_SEPOLIA_RPC \
  --broadcast

# 启动 Docker 服务
cd ~/FeralLobster
docker-compose up --build
```

---

## 🔧 故障排查

### 问题: WSL 安装失败

**解决**:
```powershell
# 确保虚拟化已启用
# 重启进入 BIOS，启用 Virtualization Technology (VT-x/AMD-V)

# 手动启用所需功能
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart
```

### 问题: 网络连接失败

**解决**:
```bash
# 在 WSL 中重置网络
sudo rm /etc/resolv.conf
sudo bash -c 'echo "nameserver 8.8.8.8" > /etc/resolv.conf'
sudo bash -c 'echo "[network]" >> /etc/wsl.conf'
sudo bash -c 'echo "generateResolvConf = false" >> /etc/wsl.conf'
```

### 问题: 内存不足

**解决**: 创建 `.wslconfig` 文件

在 Windows 用户目录 `C:\Users\<用户名>\.wslconfig`：

```ini
[wsl2]
memory=8GB
processors=4
swap=2GB
```

然后运行：
```powershell
wsl --shutdown
```

### 问题: Foundry 命令找不到

**解决**:
```bash
# 确保 foundry 在 PATH 中
export PATH="$HOME/.foundry/bin:$PATH"
source ~/.bashrc

# 重新安装
foundryup
```

---

## 📚 参考链接

- [WSL 官方文档](https://docs.microsoft.com/windows/wsl/)
- [Foundry 文档](https://book.getfoundry.sh/)
- [FeralLobster GitHub](https://github.com/0xinvictus1999/FeralLobster)

---

**现在您可以在 WSL2 中完整运行 FeralLobster 项目了！**
