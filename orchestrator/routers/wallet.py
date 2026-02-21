"""
FeralLobster Orchestrator 钱包路由
处理钱包准备和更新
"""

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import get_db, Soul, SoulStatus
from config import settings

logger = logging.getLogger(__name__)
router = APIRouter()


class PrepareWalletRequest(BaseModel):
    """准备钱包请求模型"""
    wallet_address: str = Field(..., description="Bot 钱包地址", pattern="^0x[a-fA-F0-9]{40}$")
    soul_id: Optional[int] = Field(None, description="可选的 Soul ID")
    
    class Config:
        json_schema_extra = {
            "example": {
                "wallet_address": "0x1234567890123456789012345678901234567890",
                "soul_id": 1
            }
        }


class PrepareWalletResponse(BaseModel):
    """准备钱包响应模型"""
    status: str
    soul_id: int
    wallet_address: str
    message: str


@router.post("/prepare-wallet", response_model=PrepareWalletResponse)
async def prepare_wallet(
    request: PrepareWalletRequest,
    db: Session = Depends(get_db)
):
    """
    准备 Bot 钱包
    
    将 Bot 钱包地址关联到 Soul 记录
    
    Args:
        request: 包含钱包地址的请求
        db: 数据库会话
    
    Returns:
        更新后的 Soul 信息
    """
    logger.info(f"Preparing wallet: {request.wallet_address} for soul: {request.soul_id}")
    
    # 验证钱包地址格式
    if not request.wallet_address.startswith('0x') or len(request.wallet_address) != 42:
        raise HTTPException(
            status_code=400,
            detail="Invalid wallet address format"
        )
    
    try:
        # 如果提供了 soul_id，直接更新
        if request.soul_id:
            soul = db.query(Soul).filter(Soul.id == request.soul_id).first()
            if not soul:
                raise HTTPException(
                    status_code=404,
                    detail=f"Soul with id {request.soul_id} not found"
                )
        else:
            # 否则查找最近的 pending soul
            soul = db.query(Soul).filter(
                Soul.status == SoulStatus.UPLOADED,
                Soul.bot_wallet.is_(None)
            ).order_by(Soul.created_at.desc()).first()
            
            if not soul:
                raise HTTPException(
                    status_code=404,
                    detail="No pending soul found. Please upload a file first."
                )
        
        # 更新钱包地址
        soul.bot_wallet = request.wallet_address
        db.commit()
        db.refresh(soul)
        
        logger.info(f"Wallet prepared: soul_id={soul.id}, wallet={request.wallet_address}")
        
        return PrepareWalletResponse(
            status="success",
            soul_id=soul.id,
            wallet_address=request.wallet_address,
            message="Wallet prepared successfully"
        )
    
    except HTTPException:
        raise
    
    except Exception as e:
        logger.exception(f"Failed to prepare wallet: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to prepare wallet: {str(e)}"
        )


@router.get("/wallet/{wallet_address}/soul")
async def get_soul_by_wallet(
    wallet_address: str,
    db: Session = Depends(get_db)
):
    """
    通过钱包地址获取 Soul 信息
    
    Args:
        wallet_address: Bot 钱包地址
        db: 数据库会话
    
    Returns:
        Soul 信息
    """
    soul = db.query(Soul).filter(
        Soul.bot_wallet == wallet_address.lower()
    ).first()
    
    if not soul:
        raise HTTPException(
            status_code=404,
            detail="Soul not found for this wallet"
        )
    
    return soul.to_dict()


@router.post("/wallet/{soul_id}/fund")
async def fund_wallet(
    soul_id: int,
    amount: float = 11.0,  # USDC amount
    db: Session = Depends(get_db)
):
    """
    为 Bot 钱包充值 (平台操作)
    
    从平台钱包向 Bot 钱包发送 USDC
    
    ⚠️ 仅在测试网使用
    
    Args:
        soul_id: Soul ID
        amount: USDC 数量
        db: 数据库会话
    """
    if not settings.is_testnet:
        raise HTTPException(
            status_code=403,
            detail="Funding only available in testnet mode"
        )
    
    soul = db.query(Soul).filter(Soul.id == soul_id).first()
    if not soul:
        raise HTTPException(status_code=404, detail="Soul not found")
    
    if not soul.bot_wallet:
        raise HTTPException(
            status_code=400,
            detail="Bot wallet not set for this soul"
        )
    
    # TODO: 实现 USDC 转账逻辑
    # 使用 web3.py 调用 USDC 合约的 transfer
    
    logger.info(f"Funding wallet for soul {soul_id}: {amount} USDC to {soul.bot_wallet}")
    
    return {
        "status": "pending",
        "soul_id": soul_id,
        "amount": amount,
        "recipient": soul.bot_wallet,
        "message": "Funding transaction submitted"
    }
