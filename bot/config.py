"""
FeralLobster Telegram Bot 配置模块
使用 pydantic-settings 加载环境变量
"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, field_validator


class Settings(BaseSettings):
    """
    Bot 配置类
    
    所有区块链操作明确标注为 Base Sepolia Testnet Only
    主网切换需手动修改 is_testnet 为 False 并重新部署
    """
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False
    )
    
    # Telegram Bot Token (从 @BotFather 获取)
    telegram_bot_token: str = Field(..., description="Telegram Bot Token")
    
    # 平台 API 地址
    platform_api_url: str = Field(
        default="http://localhost:8000",
        description="Orchestrator API 地址"
    )
    
    # 加密密钥 (32字节 base64 编码，用于敏感数据)
    encryption_key: str = Field(..., description="加密密钥")
    
    # ============================================
    # ⚠️ 网络配置 - 强制测试网模式
    # ============================================
    is_testnet: bool = Field(
        default=True,
        description="是否测试网模式 (强制 True)"
    )
    
    # Base Sepolia RPC (测试网专用)
    base_sepolia_rpc: str = Field(
        default="https://sepolia.base.org",
        description="Base Sepolia RPC 节点 (测试网专用)"
    )
    
    # 可选: Sentry DSN (错误追踪)
    sentry_dsn: str | None = Field(default=None, description="Sentry DSN")
    
    # 日志级别
    log_level: str = Field(default="INFO", description="日志级别")
    
    @field_validator("is_testnet")
    @classmethod
    def force_testnet(cls, v: bool) -> bool:
        """
        强制测试网模式
        如需切换到主网，必须:
        1. 修改此配置为 return False
        2. 更新所有 RPC 地址
        3. 重新部署合约到主网
        4. 重新配置所有环境变量
        """
        if not v:
            raise ValueError(
                "⚠️ 主网模式已禁用! "
                "如需切换到主网，请: "
                "1) 修改 config.py 中的 is_testnet 验证逻辑 "
                "2) 更新 RPC 为 Base Mainnet "
                "3) 重新部署合约到主网 "
                "4) 更新所有配置"
            )
        return True
    
    @property
    def network_display(self) -> str:
        """显示当前网络状态"""
        return "🧪 Base Sepolia Testnet" if self.is_testnet else "⛓️ Base Mainnet"
    
    @property
    def warning_banner(self) -> str:
        """测试网警告横幅"""
        if self.is_testnet:
            return (
                "⚠️ *测试网模式*\n"
                "所有交易均在 Base Sepolia 测试网进行，\n"
                "不涉及真实资产。\n"
            )
        return ""


# 全局配置实例
settings = Settings()
