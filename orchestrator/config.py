"""
FeralLobster Orchestrator 配置
FastAPI 后端服务配置
"""

import json
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, field_validator


class Settings(BaseSettings):
    """
    Orchestrator 配置类
    
    ⚠️ 所有区块链交互使用 Base Sepolia 测试网
    """
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False
    )
    
    # ============================================
    # 数据库配置
    # ============================================
    database_url: str = Field(
        default="sqlite:///./feral.db",
        description="数据库连接 URL"
    )
    
    # ============================================
    # Arweave 配置 (永久存储)
    # ============================================
    arweave_key: str = Field(
        default="",
        description="Arweave 钱包 JWK (JSON 格式)"
    )
    
    # ============================================
    # Akash 配置 (去中心化云计算)
    # ============================================
    akash_mnemonic: str = Field(
        default="",
        description="Akash 钱包助记词"
    )
    
    akash_chain_id: str = Field(
        default="akashnet-2",  # 主网
        # default="akash-edgenet-1",  # 测试网
        description="Akash 网络 ID"
    )
    
    akash_rpc: str = Field(
        default="https://rpc.akashnet.net:443",  # 主网
        # default="https://rpc.edgenet.akash.network:443",  # 测试网
        description="Akash RPC 节点"
    )
    
    # ============================================
    # AINFT 配置
    # ============================================
    ainft_api_key: str = Field(
        default="",
        description="AINFT API 密钥"
    )
    
    ainft_api_url: str = Field(
        default="https://api.ainft.ai",
        description="AINFT API 地址"
    )
    
    # ============================================
    # 区块链配置 (Base Sepolia Testnet Only)
    # ============================================
    contract_address: str = Field(
        default="",
        description="FeralRite 合约地址 (Base Sepolia)"
    )
    
    rpc_url: str = Field(
        default="https://sepolia.base.org",
        description="Base Sepolia RPC 节点"
    )
    
    chain_id: int = Field(
        default=84532,
        description="Base Sepolia Chain ID"
    )
    
    # 平台钱包私钥 (用于合约交互和资金)
    private_key: str = Field(
        default="",
        description="平台钱包私钥 (Base Sepolia，仅测试)"
    )
    
    # ============================================
    # ⚠️ 网络模式 - 强制测试网
    # ============================================
    is_testnet: bool = Field(
        default=True,
        description="是否测试网模式 (强制 True)"
    )
    
    @field_validator("is_testnet")
    @classmethod
    def force_testnet(cls, v: bool) -> bool:
        """
        强制测试网模式
        如需切换到主网，必须手动修改代码并重新配置所有参数
        """
        if not v:
            raise ValueError(
                "⚠️ 主网模式已禁用! "
                "当前配置仅支持 Base Sepolia 测试网。"
                "如需切换到主网，请手动修改 config.py 并重新部署。"
            )
        return True
    
    @field_validator("arweave_key")
    @classmethod
    def parse_arweave_key(cls, v: str) -> dict:
        """解析 Arweave JWK JSON"""
        if not v:
            return {}
        try:
            if isinstance(v, str):
                return json.loads(v)
            return v
        except json.JSONDecodeError:
            raise ValueError("ARWEAVE_KEY 必须是有效的 JSON 格式")
    
    # ============================================
    # Celery/Redis 配置
    # ============================================
    redis_url: str = Field(
        default="redis://localhost:6379/0",
        description="Redis 连接 URL (用于 Celery)"
    )
    
    celery_broker_url: Optional[str] = None
    celery_result_backend: Optional[str] = None
    
    # ============================================
    # API 配置
    # ============================================
    api_host: str = Field(default="0.0.0.0", description="API 监听地址")
    api_port: int = Field(default=8000, description="API 端口")
    api_secret_key: str = Field(default="change-me", description="API 密钥")
    
    cors_origins: list = Field(
        default=["http://localhost:3000", "http://127.0.0.1:3000"],
        description="CORS 允许的源"
    )
    
    @property
    def arweave_jwk(self) -> dict:
        """获取 Arweave JWK"""
        if isinstance(self.arweave_key, dict):
            return self.arweave_key
        return json.loads(self.arweave_key) if self.arweave_key else {}
    
    @property
    def network_display(self) -> str:
        """显示当前网络状态"""
        networks = []
        if self.is_testnet:
            networks.append("🧪 Base Sepolia")
            networks.append("🧪 Akash Mainnet (Low Resources)")
        else:
            networks.append("⛓️ Base Mainnet")
            networks.append("☁️ Akash Mainnet")
        return " | ".join(networks)
    
    def model_post_init(self, __context):
        """初始化后处理"""
        # 设置 Celery URL
        if not self.celery_broker_url:
            object.__setattr__(self, 'celery_broker_url', self.redis_url)
        if not self.celery_result_backend:
            object.__setattr__(self, 'celery_result_backend', self.redis_url)


# 全局配置实例
settings = Settings()
