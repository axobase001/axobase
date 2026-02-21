"""
FeralLobster Orchestrator 数据库模型
SQLAlchemy 定义
"""

from datetime import datetime
from typing import Optional
from sqlalchemy import (
    create_engine, Column, Integer, String, DateTime, 
    Text, ForeignKey, Enum, Float
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
import enum

from config import settings

# 创建引擎
engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False} if "sqlite" in settings.database_url else {},
    pool_pre_ping=True
)

# 会话工厂
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 基类
Base = declarative_base()


class SoulStatus(str, enum.Enum):
    """Soul 状态枚举"""
    PENDING = "pending"          # 等待处理
    UPLOADED = "uploaded"        # 已上传到 Arweave
    REGISTERED = "registered"    # 已在链上注册
    DEPLOYING = "deploying"      # 正在部署到 Akash
    DEPLOYED = "deployed"        # 已部署
    ACTIVE = "active"            # 运行中
    DORMANT = "dormant"          # 休眠
    ERROR = "error"              # 错误


class DeploymentStatus(str, enum.Enum):
    """部署状态枚举"""
    PENDING = "pending"
    CREATING = "creating"
    BIDDING = "bidding"
    LEASED = "leased"
    DEPLOYED = "deployed"
    FAILED = "failed"


class Soul(Base):
    """
    FeralSoul 数据库模型
    
    代表一个放养的 AI 代理
    """
    __tablename__ = "souls"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # 唯一标识
    memory_hash = Column(String(66), unique=True, index=True, nullable=False)
    
    # Arweave 存储
    arweave_id = Column(String(100), index=True)
    
    # Bot 钱包地址
    bot_wallet = Column(String(42), index=True)
    
    # 当前状态
    status = Column(
        Enum(SoulStatus),
        default=SoulStatus.PENDING,
        nullable=False
    )
    
    # 初始资金 (USDC，6位小数)
    initial_funds = Column(Integer, default=0)
    
    # Akash 部署信息
    akash_uri = Column(String(255), nullable=True)
    akash_lease_id = Column(String(100), nullable=True)
    
    # 创建时间
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关联的部署记录
    deployments = relationship("Deployment", back_populates="soul", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Soul(id={self.id}, hash={self.memory_hash[:16]}..., status={self.status})>"
    
    def to_dict(self):
        """转换为字典"""
        return {
            "id": self.id,
            "memory_hash": self.memory_hash,
            "arweave_id": self.arweave_id,
            "bot_wallet": self.bot_wallet,
            "status": self.status.value if self.status else None,
            "initial_funds": self.initial_funds,
            "akash_uri": self.akash_uri,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }


class Deployment(Base):
    """
    Akash 部署记录
    
    记录每次部署的详细信息
    """
    __tablename__ = "deployments"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # 关联的 Soul
    soul_id = Column(Integer, ForeignKey("souls.id"), nullable=False)
    
    # Akash 交易哈希
    akash_tx_hash = Column(String(66), nullable=True)
    
    # 部署状态
    status = Column(
        Enum(DeploymentStatus),
        default=DeploymentStatus.PENDING,
        nullable=False
    )
    
    # SDL 内容 (用于审计)
    sdl_content = Column(Text, nullable=True)
    
    # 部署日志
    logs = Column(Text, default="")
    
    # 提供者信息
    provider_address = Column(String(42), nullable=True)
    
    # 租赁价格 (uAKT/块)
    lease_price = Column(Float, nullable=True)
    
    # 创建时间
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关联的 Soul
    soul = relationship("Soul", back_populates="deployments")
    
    def __repr__(self):
        return f"<Deployment(id={self.id}, soul_id={self.soul_id}, status={self.status})>"
    
    def to_dict(self):
        """转换为字典"""
        return {
            "id": self.id,
            "soul_id": self.soul_id,
            "akash_tx_hash": self.akash_tx_hash,
            "status": self.status.value if self.status else None,
            "provider_address": self.provider_address,
            "lease_price": self.lease_price,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }


class EventLog(Base):
    """
    链上事件日志
    
    记录监听到的区块链事件
    """
    __tablename__ = "event_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # 事件类型
    event_type = Column(String(50), nullable=False, index=True)
    
    # 交易哈希
    tx_hash = Column(String(66), nullable=False, index=True)
    
    # 区块号
    block_number = Column(Integer, nullable=False)
    
    # 事件数据 (JSON)
    event_data = Column(Text, nullable=False)
    
    # 处理状态
    processed = Column(Integer, default=0)  # 0=未处理, 1=已处理, 2=处理失败
    
    # 创建时间
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f"<EventLog(id={self.id}, type={self.event_type}, tx={self.tx_hash[:16]}...)>"


# 数据库依赖
def get_db():
    """
    获取数据库会话
    
    用于 FastAPI 依赖注入
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# 初始化数据库
def init_db():
    """创建所有表"""
    Base.metadata.create_all(bind=engine)
