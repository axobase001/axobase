"""
FeralLobster Orchestrator Arweave 服务
处理文件上传到 Arweave 永久存储
"""

import os
import json
import logging
from typing import Optional

import aiohttp
import arweave
from arweave.transaction import Transaction

from config import settings

logger = logging.getLogger(__name__)

# Arweave 网关
ARWEAVE_GATEWAY = "https://arweave.net"


def get_arweave_client() -> Optional[arweave.Wallet]:
    """
    获取 Arweave 客户端
    
    Returns:
        Arweave 钱包客户端，如果未配置则返回 None
    """
    try:
        jwk = settings.arweave_jwk
        if not jwk:
            logger.warning("Arweave JWK not configured")
            return None
        
        wallet = arweave.Wallet(jwk)
        logger.info(f"Arweave client initialized: {wallet.address}")
        return wallet
    
    except Exception as e:
        logger.error(f"Failed to initialize Arweave client: {e}")
        return None


async def upload_to_arweave(file_path: str) -> str:
    """
    上传文件到 Arweave
    
    Args:
        file_path: 本地文件路径
    
    Returns:
        Arweave 交易 ID
    
    Raises:
        Exception: 上传失败
    """
    wallet = get_arweave_client()
    
    if not wallet:
        # 模拟上传 (测试环境)
        logger.warning("Using mock Arweave upload")
        import hashlib
        with open(file_path, 'rb') as f:
            mock_id = hashlib.sha256(f.read()).hexdigest()[:43]
        return f"mock_{mock_id}"
    
    try:
        # 读取文件
        with open(file_path, 'rb') as f:
            data = f.read()
        
        # 创建交易
        tx = Transaction(wallet, data=data)
        
        # 添加标签
        tx.add_tag('Content-Type', 'application/json')
        tx.add_tag('App-Name', 'FeralLobster')
        tx.add_tag('App-Version', '0.1.0')
        tx.add_tag('Network', 'base-sepolia-testnet')
        
        # 签名并发送
        tx.sign()
        tx.send()
        
        tx_id = tx.id
        logger.info(f"File uploaded to Arweave: {tx_id}")
        logger.info(f"Gateway URL: {ARWEAVE_GATEWAY}/{tx_id}")
        
        return tx_id
    
    except Exception as e:
        logger.exception(f"Arweave upload failed: {e}")
        raise Exception(f"Failed to upload to Arweave: {str(e)}")


async def upload_json_to_arweave(data: dict, tags: Optional[dict] = None) -> str:
    """
    上传 JSON 数据到 Arweave
    
    Args:
        data: JSON 数据
        tags: 可选的标签
    
    Returns:
        Arweave 交易 ID
    """
    wallet = get_arweave_client()
    
    if not wallet:
        logger.warning("Using mock Arweave upload for JSON")
        import hashlib
        mock_id = hashlib.sha256(json.dumps(data).encode()).hexdigest()[:43]
        return f"mock_{mock_id}"
    
    try:
        json_str = json.dumps(data)
        tx = Transaction(wallet, data=json_str.encode())
        
        # 添加标签
        tx.add_tag('Content-Type', 'application/json')
        tx.add_tag('App-Name', 'FeralLobster')
        
        if tags:
            for key, value in tags.items():
                tx.add_tag(key, value)
        
        tx.sign()
        tx.send()
        
        return tx.id
    
    except Exception as e:
        logger.exception(f"Arweave JSON upload failed: {e}")
        raise


async def get_arweave_balance() -> float:
    """
    获取 Arweave 钱包余额
    
    Returns:
        余额 (AR)
    """
    wallet = get_arweave_client()
    
    if not wallet:
        return 0.0
    
    try:
        balance = wallet.balance
        # 转换为 AR (1 AR = 10^12 Winston)
        ar_balance = balance / 1e12
        logger.info(f"Arweave balance: {ar_balance} AR")
        return ar_balance
    
    except Exception as e:
        logger.error(f"Failed to get Arweave balance: {e}")
        return 0.0


async def fetch_from_arweave(tx_id: str) -> bytes:
    """
    从 Arweave 获取数据
    
    Args:
        tx_id: 交易 ID
    
    Returns:
        文件数据
    """
    url = f"{ARWEAVE_GATEWAY}/{tx_id}"
    
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as response:
            if response.status == 200:
                return await response.read()
            else:
                raise Exception(f"Failed to fetch from Arweave: {response.status}")
