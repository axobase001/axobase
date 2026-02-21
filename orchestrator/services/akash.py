"""
FeralLobster Orchestrator Akash 服务
处理去中心化云计算部署
"""

import os
import re
import json
import logging
import asyncio
import tempfile
import subprocess
from pathlib import Path
from typing import Optional, Dict, Any

from jinja2 import Template

from config import settings
from database import SessionLocal, Soul, SoulStatus, Deployment, DeploymentStatus

logger = logging.getLogger(__name__)

# Akash CLI 配置
AKASH_BIN = os.environ.get('AKASH_BIN', 'akash')
AKASH_CHAIN_ID = settings.akash_chain_id
AKASH_RPC = settings.akash_rpc

# 价格限制 (uAKT/块) - 约 $0.01/月
MAX_PRICE = 10000


# SDL 模板
SDL_TEMPLATE = '''---
version: "2.0"

services:
  feral-bot-{{ short_hash }}:
    image: ghcr.io/ferallobster/bot-runtime:latest
    expose:
      - port: 8080
        as: 80
        to:
          - global: true
    env:
      - ARWEAVE_ID={{ arweave_id }}
      - BOT_WALLET_ADDRESS={{ bot_wallet }}
      - AINFT_API_KEY={{ ainft_api_key }}
      - NETWORK=base-sepolia-testnet
      - LOG_LEVEL=info
    resources:
      cpu:
        units: 0.5
      memory:
        size: 512Mi
      storage:
        size: 1Gi

profiles:
  compute:
    feral-bot-{{ short_hash }}:
      resources:
        cpu:
          units: 0.5
        memory:
          size: 512Mi
        storage:
          size: 1Gi
  placement:
    dcloud:
      pricing:
        feral-bot-{{ short_hash }}:
          denom: uakt
          amount: 100

deployment:
  feral-bot-{{ short_hash }}:
    dcloud:
      profile: feral-bot-{{ short_hash }}
      count: 1
'''


def generate_sdl(
    memory_hash: str,
    arweave_id: str,
    bot_wallet: str,
    ainft_api_key: str = ""
) -> str:
    """
    生成 Akash SDL 文件
    
    Args:
        memory_hash: Soul 的 memory hash
        arweave_id: Arweave 存储 ID
        bot_wallet: Bot 钱包地址
        ainft_api_key: AINFT API 密钥
    
    Returns:
        SDL YAML 字符串
    """
    template = Template(SDL_TEMPLATE)
    
    short_hash = memory_hash[:8] if len(memory_hash) >= 8 else memory_hash
    
    # 清理短哈希，只保留字母数字
    short_hash = re.sub(r'[^a-zA-Z0-9]', '', short_hash).lower()
    
    sdl = template.render(
        short_hash=short_hash,
        arweave_id=arweave_id,
        bot_wallet=bot_wallet,
        ainft_api_key=ainft_api_key
    )
    
    return sdl


async def deploy_to_akash(memory_hash: str) -> Dict[str, Any]:
    """
    部署到 Akash (同步版本，实际应使用 Celery)
    
    Args:
        memory_hash: Soul 的 memory hash
    
    Returns:
        部署结果
    """
    db = SessionLocal()
    
    try:
        # 获取 Soul 信息
        soul = db.query(Soul).filter(Soul.memory_hash == memory_hash).first()
        if not soul:
            raise ValueError(f"Soul not found: {memory_hash}")
        
        if not soul.bot_wallet:
            raise ValueError(f"Bot wallet not set for soul: {memory_hash}")
        
        # 创建部署记录
        deployment = Deployment(
            soul_id=soul.id,
            status=DeploymentStatus.CREATING
        )
        db.add(deployment)
        db.commit()
        
        # 生成 SDL
        sdl = generate_sdl(
            memory_hash=memory_hash,
            arweave_id=soul.arweave_id or "",
            bot_wallet=soul.bot_wallet
        )
        
        deployment.sdl_content = sdl
        db.commit()
        
        logger.info(f"Generated SDL for soul {soul.id}:\n{sdl[:500]}...")
        
        # 保存 SDL 到临时文件
        with tempfile.NamedTemporaryFile(mode='w', suffix='.yaml', delete=False) as f:
            f.write(sdl)
            sdl_path = f.name
        
        try:
            # 检查 Akash CLI 是否可用
            result = subprocess.run(
                [AKASH_BIN, 'version'],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode != 0:
                raise RuntimeError("Akash CLI not available")
            
            logger.info(f"Akash version: {result.stdout.strip()}")
            
            # 创建部署 (简化版，实际需要完整的密钥管理)
            # 注意: 这里的命令仅作为示例，实际部署需要完整的钱包配置
            
            # 模拟部署过程
            deployment.status = DeploymentStatus.BIDDING
            db.commit()
            
            # 在实际环境中，这里会调用:
            # akash tx deployment create sdl.yaml --from wallet ...
            
            logger.info(f"Deployment created for soul {soul.id}")
            
            # 模拟成功
            deployment.status = DeploymentStatus.DEPLOYED
            deployment.akash_uri = f"https://feral-bot-{memory_hash[:8]}.dcloud.app"
            db.commit()
            
            # 更新 Soul 状态
            soul.status = SoulStatus.DEPLOYED
            soul.akash_uri = deployment.akash_uri
            db.commit()
            
            return {
                "status": "success",
                "deployment_id": deployment.id,
                "uri": deployment.akash_uri,
                "message": "Deployment successful (simulated)"
            }
        
        finally:
            # 清理临时文件
            if os.path.exists(sdl_path):
                os.remove(sdl_path)
    
    except Exception as e:
        logger.exception(f"Akash deployment failed: {e}")
        
        # 更新状态为失败
        if 'deployment' in locals():
            deployment.status = DeploymentStatus.FAILED
            deployment.logs = str(e)
            db.commit()
        
        raise
    
    finally:
        db.close()


async def deploy_to_akash_async(memory_hash: str):
    """
    异步部署到 Akash
    
    用于事件监听器调用
    """
    try:
        # 使用线程池执行同步操作
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,  # 使用默认执行器
            lambda: asyncio.run(deploy_to_akash(memory_hash))
        )
        return result
    except Exception as e:
        logger.error(f"Async deployment failed: {e}")
        raise


def close_deployment(deployment_id: int) -> bool:
    """
    关闭 Akash 部署
    
    Args:
        deployment_id: 部署 ID
    
    Returns:
        是否成功
    """
    db = SessionLocal()
    
    try:
        deployment = db.query(Deployment).filter(Deployment.id == deployment_id).first()
        if not deployment:
            logger.warning(f"Deployment not found: {deployment_id}")
            return False
        
        # 实际环境中调用:
        # akash tx deployment close --from wallet --dseq ...
        
        deployment.status = DeploymentStatus.FAILED  # 或者添加 CLOSED 状态
        db.commit()
        
        # 更新 Soul 状态
        soul = db.query(Soul).filter(Soul.id == deployment.soul_id).first()
        if soul:
            soul.status = SoulStatus.DORMANT
            db.commit()
        
        logger.info(f"Deployment {deployment_id} closed")
        return True
    
    except Exception as e:
        logger.exception(f"Failed to close deployment: {e}")
        return False
    
    finally:
        db.close()


def get_deployment_status(deployment_id: int) -> Optional[Dict]:
    """
    获取部署状态
    
    Args:
        deployment_id: 部署 ID
    
    Returns:
        部署信息
    """
    db = SessionLocal()
    
    try:
        deployment = db.query(Deployment).filter(Deployment.id == deployment_id).first()
        if not deployment:
            return None
        
        return {
            "id": deployment.id,
            "soul_id": deployment.soul_id,
            "status": deployment.status.value,
            "akash_tx_hash": deployment.akash_tx_hash,
            "provider": deployment.provider_address,
            "lease_price": deployment.lease_price,
            "created_at": deployment.created_at.isoformat(),
            "logs": deployment.logs[:1000] if deployment.logs else None
        }
    
    finally:
        db.close()
