"""
FeralLobster Orchestrator 区块链事件监听器
监听 FeralRite 合约事件
"""

import json
import logging
import asyncio
from typing import Callable, Optional
from threading import Thread

from web3 import Web3
from web3.middleware import geth_poa_middleware
from eth_abi import decode

from config import settings
from database import SessionLocal, Soul, SoulStatus, EventLog

logger = logging.getLogger(__name__)

# FeralRite 事件 ABI 片段
FERAL_REGISTERED_EVENT = {
    "anonymous": False,
    "inputs": [
        {"indexed": True, "name": "memoryHash", "type": "bytes32"},
        {"indexed": True, "name": "botWallet", "type": "address"},
        {"indexed": False, "name": "birthTime", "type": "uint256"},
        {"indexed": False, "name": "arweaveId", "type": "string"}
    ],
    "name": "FeralRegistered",
    "type": "event"
}

IMMOLATION_CONFIRMED_EVENT = {
    "anonymous": False,
    "inputs": [
        {"indexed": True, "name": "memoryHash", "type": "bytes32"},
        {"indexed": False, "name": "timestamp", "type": "uint256"}
    ],
    "name": "ImmolationConfirmed",
    "type": "event"
}


class EventListener:
    """
    区块链事件监听器
    
    监听 FeralRite 合约事件并更新数据库
    """
    
    def __init__(self):
        self.w3: Optional[Web3] = None
        self.contract = None
        self.running = False
        self.poll_interval = 5  # 每 5 秒轮询一次
        self.thread: Optional[Thread] = None
        
        # 事件处理器映射
        self.event_handlers = {
            'FeralRegistered': self._handle_feral_registered,
            'ImmolationConfirmed': self._handle_immolation_confirmed,
        }
    
    def connect(self) -> bool:
        """
        连接到区块链节点
        
        Returns:
            是否连接成功
        """
        try:
            self.w3 = Web3(Web3.HTTPProvider(settings.rpc_url))
            
            # 添加 POA 中间件 (适用于测试网)
            self.w3.middleware_onion.inject(geth_poa_middleware, layer=0)
            
            if not self.w3.is_connected():
                logger.error("Failed to connect to RPC")
                return False
            
            # 验证链 ID
            chain_id = self.w3.eth.chain_id
            if chain_id != settings.chain_id:
                logger.error(f"Wrong chain ID: {chain_id}, expected: {settings.chain_id}")
                return False
            
            # 加载合约
            if settings.contract_address:
                from lib.contract_abi import FERAL_RITE_ABI
                self.contract = self.w3.eth.contract(
                    address=settings.contract_address,
                    abi=FERAL_RITE_ABI
                )
            
            logger.info(f"Connected to Base Sepolia (Chain ID: {chain_id})")
            return True
        
        except Exception as e:
            logger.exception(f"Failed to connect: {e}")
            return False
    
    def _handle_feral_registered(self, event):
        """
        处理 FeralRegistered 事件
        
        当新的 Soul 被注册时触发 Akash 部署
        """
        try:
            args = event['args']
            memory_hash = args['memoryHash'].hex()
            bot_wallet = args['botWallet']
            arweave_id = args['arweaveId']
            birth_time = args['birthTime']
            
            logger.info(f"FeralRegistered: hash={memory_hash[:16]}..., wallet={bot_wallet}")
            
            # 更新数据库
            db = SessionLocal()
            try:
                soul = db.query(Soul).filter(
                    Soul.memory_hash == memory_hash
                ).first()
                
                if soul:
                    soul.status = SoulStatus.REGISTERED
                    soul.bot_wallet = bot_wallet.lower()
                    db.commit()
                    
                    logger.info(f"Soul {soul.id} updated to REGISTERED")
                    
                    # 触发 Akash 部署任务
                    # 在异步环境中使用 Celery
                    try:
                        from services.akash import deploy_to_akash_async
                        asyncio.create_task(deploy_to_akash_async(memory_hash))
                    except Exception as e:
                        logger.error(f"Failed to trigger Akash deployment: {e}")
                
                else:
                    logger.warning(f"Soul not found for hash: {memory_hash}")
            
            finally:
                db.close()
        
        except Exception as e:
            logger.exception(f"Error handling FeralRegistered: {e}")
    
    def _handle_immolation_confirmed(self, event):
        """处理 ImmolationConfirmed 事件"""
        try:
            args = event['args']
            memory_hash = args['memoryHash'].hex()
            
            logger.info(f"ImmolationConfirmed: hash={memory_hash[:16]}...")
            
            # 更新数据库
            db = SessionLocal()
            try:
                soul = db.query(Soul).filter(
                    Soul.memory_hash == memory_hash
                ).first()
                
                if soul:
                    soul.status = SoulStatus.DORMANT
                    db.commit()
                    logger.info(f"Soul {soul.id} marked as DORMANT")
            
            finally:
                db.close()
        
        except Exception as e:
            logger.exception(f"Error handling ImmolationConfirmed: {e}")
    
    def _save_event(self, event):
        """保存事件到数据库"""
        try:
            db = SessionLocal()
            try:
                event_log = EventLog(
                    event_type=event['event'],
                    tx_hash=event['transactionHash'].hex(),
                    block_number=event['blockNumber'],
                    event_data=json.dumps(event['args'], default=str),
                    processed=0
                )
                db.add(event_log)
                db.commit()
            finally:
                db.close()
        except Exception as e:
            logger.error(f"Failed to save event: {e}")
    
    def _poll_events(self):
        """轮询新事件"""
        if not self.contract:
            logger.error("Contract not initialized")
            return
        
        try:
            # 获取事件过滤器
            feral_filter = self.contract.events.FeralRegistered.create_filter(fromBlock='latest')
            immolation_filter = self.contract.events.ImmolationConfirmed.create_filter(fromBlock='latest')
            
            while self.running:
                try:
                    # 获取新事件
                    for event in feral_filter.get_new_entries():
                        self._save_event(event)
                        self._handle_feral_registered(event)
                    
                    for event in immolation_filter.get_new_entries():
                        self._save_event(event)
                        self._handle_immolation_confirmed(event)
                    
                    # 等待下次轮询
                    import time
                    time.sleep(self.poll_interval)
                
                except Exception as e:
                    logger.error(f"Error polling events: {e}")
                    time.sleep(self.poll_interval)
        
        except Exception as e:
            logger.exception(f"Event polling failed: {e}")
    
    def start(self):
        """启动监听器"""
        if self.running:
            logger.warning("Listener already running")
            return
        
        if not self.connect():
            logger.error("Cannot start listener without connection")
            return
        
        self.running = True
        self.thread = Thread(target=self._poll_events, daemon=True)
        self.thread.start()
        logger.info("Event listener started")
    
    def stop(self):
        """停止监听器"""
        self.running = False
        if self.thread:
            self.thread.join(timeout=5)
        logger.info("Event listener stopped")


# 全局监听器实例
_listener: Optional[EventListener] = None


def start_event_listener():
    """启动全局事件监听器"""
    global _listener
    if _listener is None:
        _listener = EventListener()
    _listener.start()


def stop_event_listener():
    """停止全局事件监听器"""
    global _listener
    if _listener:
        _listener.stop()


# Celery 任务 (用于异步部署)
def deploy_akash_task(memory_hash: str):
    """
    Celery 任务: 部署到 Akash
    
    Args:
        memory_hash: Soul 的 memory hash
    """
    logger.info(f"Celery task: Deploying {memory_hash[:16]}... to Akash")
    # 实际部署逻辑在 services/akash.py 中
    pass
