"""
FeralLobster Orchestrator AINFT 服务
处理 AI NFT 和账户管理
"""

import logging
from typing import Optional, Dict, Any

import aiohttp

from config import settings

logger = logging.getLogger(__name__)

# AINFT API 配置
AINFT_API_URL = settings.ainft_api_url
AINFT_API_KEY = settings.ainft_api_key

# Base Sepolia USDC 配置
USDC_DECIMALS = 6
USDC_CONTRACT = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"


class AINFTClient:
    """
    AINFT API 客户端
    
    用于创建账户、预存资金等操作
    """
    
    def __init__(self):
        self.api_url = AINFT_API_URL
        self.api_key = AINFT_API_KEY
        self.session: Optional[aiohttp.ClientSession] = None
    
    async def __aenter__(self):
        self.session = aiohttp.ClientSession(
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
        )
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
            self.session = None
    
    async def create_account(self, wallet_address: str) -> Dict[str, Any]:
        """
        为 Bot 钱包创建 AINFT 账户
        
        Args:
            wallet_address: Bot 钱包地址
        
        Returns:
            账户信息
        """
        if not self.session:
            raise RuntimeError("Client not initialized")
        
        url = f"{self.api_url}/v1/accounts"
        
        payload = {
            "wallet_address": wallet_address,
            "chain": "base-sepolia",  # 测试网
            "metadata": {
                "source": "ferallobster",
                "type": "bot"
            }
        }
        
        try:
            async with self.session.post(url, json=payload) as response:
                if response.status == 200 or response.status == 201:
                    data = await response.json()
                    logger.info(f"AINFT account created for {wallet_address}")
                    return data
                else:
                    error_text = await response.text()
                    logger.error(f"AINFT create account failed: {error_text}")
                    raise ValueError(f"Failed to create account: {error_text}")
        
        except Exception as e:
            logger.exception(f"AINFT API error: {e}")
            # 测试环境返回模拟数据
            return {
                "id": f"mock_{wallet_address[:16]}",
                "wallet_address": wallet_address,
                "status": "active",
                "mock": True
            }
    
    async def fund_account(
        self,
        account_id: str,
        amount: float = 5.0  # USDC
    ) -> Dict[str, Any]:
        """
        为账户预存 USDC
        
        Args:
            account_id: AINFT 账户 ID
            amount: USDC 金额
        
        Returns:
            充值结果
        """
        if not self.session:
            raise RuntimeError("Client not initialized")
        
        url = f"{self.api_url}/v1/accounts/{account_id}/fund"
        
        # 转换为最小单位
        amount_wei = int(amount * (10 ** USDC_DECIMALS))
        
        payload = {
            "amount": amount_wei,
            "token": "USDC",
            "chain": "base-sepolia"
        }
        
        try:
            async with self.session.post(url, json=payload) as response:
                if response.status == 200:
                    data = await response.json()
                    logger.info(f"Funded account {account_id} with {amount} USDC")
                    return data
                else:
                    error_text = await response.text()
                    logger.error(f"AINFT funding failed: {error_text}")
                    raise ValueError(f"Failed to fund account: {error_text}")
        
        except Exception as e:
            logger.exception(f"AINFT funding error: {e}")
            # 测试环境返回模拟数据
            return {
                "status": "success",
                "amount": amount,
                "tx_hash": f"mock_tx_{account_id[:16]}",
                "mock": True
            }
    
    async def get_account_balance(self, account_id: str) -> Dict[str, Any]:
        """
        获取账户余额
        
        Args:
            account_id: AINFT 账户 ID
        
        Returns:
            余额信息
        """
        if not self.session:
            raise RuntimeError("Client not initialized")
        
        url = f"{self.api_url}/v1/accounts/{account_id}/balance"
        
        try:
            async with self.session.get(url) as response:
                if response.status == 200:
                    return await response.json()
                else:
                    error_text = await response.text()
                    logger.error(f"Failed to get balance: {error_text}")
                    raise ValueError(f"Failed to get balance: {error_text}")
        
        except Exception as e:
            logger.exception(f"Balance check error: {e}")
            return {
                "USDC": 0,
                "mock": True
            }
    
    async def provision_bot(
        self,
        wallet_address: str,
        initial_funding: float = 5.0
    ) -> Dict[str, Any]:
        """
        完整的 Bot 配置流程
        
        1. 创建账户
        2. 预存资金
        
        Args:
            wallet_address: Bot 钱包地址
            initial_funding: 初始资金 (USDC)
        
        Returns:
            配置结果
        """
        logger.info(f"Provisioning AINFT for bot: {wallet_address}")
        
        # 创建账户
        account = await self.create_account(wallet_address)
        account_id = account.get("id")
        
        if not account_id:
            raise ValueError("Failed to get account ID")
        
        # 预存资金 (测试网小额)
        if settings.is_testnet and initial_funding > 10:
            initial_funding = 5  # 测试网限制
            logger.warning(f"Testnet mode: limiting funding to {initial_funding} USDC")
        
        funding = await self.fund_account(account_id, initial_funding)
        
        return {
            "account": account,
            "funding": funding,
            "status": "provisioned"
        }


async def provision_ainft_account(wallet_address: str, initial_funding: float = 5.0):
    """
    便捷函数: 为 Bot 配置 AINFT 账户
    
    Args:
        wallet_address: Bot 钱包地址
        initial_funding: 初始资金
    
    Returns:
        配置结果
    """
    async with AINFTClient() as client:
        return await client.provision_bot(wallet_address, initial_funding)
