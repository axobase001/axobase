"""
Axobase Bot 配置

⚠️ 重要：生产环境请使用环境变量，不要硬编码敏感信息！
"""

import os
from typing import Optional

# Bot 配置
TELEGRAM_BOT_TOKEN: str = os.getenv('TELEGRAM_BOT_TOKEN', '')

# 网络配置
NETWORK: str = os.getenv('AXO_NETWORK', 'mainnet')  # 'mainnet' or 'sepolia'

# 编排服务 API
ORCHESTRATOR_API: str = os.getenv('ORCHESTRATOR_API', 'http://localhost:8000')
ORCHESTRATOR_API_KEY: str = os.getenv('ORCHESTRATOR_API_KEY', '')

# GPG 配置
GPG_KEY_ID: str = os.getenv('GPG_KEY_ID', 'axobase-platform')

# 日志级别
LOG_LEVEL: str = os.getenv('LOG_LEVEL', 'INFO')

# 会话密钥 TTL (秒)
SESSION_KEY_TTL: int = int(os.getenv('SESSION_KEY_TTL', '300'))  # 5分钟

# 文件上传限制 (MB)
MAX_UPLOAD_SIZE_MB: int = int(os.getenv('MAX_UPLOAD_SIZE_MB', '50'))


class Settings:
    """配置类"""
    
    def __init__(self):
        self.telegram_token = TELEGRAM_BOT_TOKEN
        self.network = NETWORK
        self.orchestrator_api = ORCHESTRATOR_API
        self.orchestrator_api_key = ORCHESTRATOR_API_KEY
        self.gpg_key_id = GPG_KEY_ID
        self.log_level = LOG_LEVEL
        self.session_key_ttl = SESSION_KEY_TTL
        self.max_upload_size_mb = MAX_UPLOAD_SIZE_MB
    
    @property
    def is_mainnet(self) -> bool:
        """是否主网"""
        return self.network.lower() == 'mainnet'
    
    @property
    def network_name(self) -> str:
        """网络名称"""
        return 'Base 主网' if self.is_mainnet else 'Base Sepolia 测试网'
    
    @property
    def network_display(self) -> str:
        """网络显示信息"""
        if self.is_mainnet:
            return (
                "🌐 *网络*: Base 主网 (Chain ID: 8453)\n"
                "💰 *货币*: Base USDC\n"
                "⚠️ *注意*: 这是生产环境，涉及真实资产"
            )
        else:
            return (
                "🧪 *网络*: Base Sepolia 测试网\n"
                "💰 *货币*: 测试 USDC\n"
                "✅ *注意*: 这是测试环境"
            )
    
    @property
    def warning_banner(self) -> str:
        """警告横幅"""
        if self.is_mainnet:
            return (
                "⚠️ *风险提示*:\n"
                "• Axobase 是实验性项目\n"
                "• 您的代理可能会亏损资金\n"
                "• 从小额开始 (< 50 USDC)\n"
                "• 无退款，无保证\n"
            )
        return ""


# 全局配置实例
settings = Settings()
