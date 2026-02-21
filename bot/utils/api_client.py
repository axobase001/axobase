"""
FeralLobster Bot 平台 API 客户端
与 Orchestrator 后端通信
"""

import aiohttp
import logging
from typing import BinaryIO
from config import settings

logger = logging.getLogger(__name__)


class PlatformAPI:
    """
    平台 API 客户端
    
    所有区块链相关操作均标注为 Base Sepolia Testnet Only
    """
    
    def __init__(self, base_url: str = None):
        self.base_url = base_url or settings.platform_api_url
        self.session: aiohttp.ClientSession | None = None
    
    async def __aenter__(self):
        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=30)
        )
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
            self.session = None
    
    async def upload_file(
        self, 
        file_data: bytes | BinaryIO, 
        user_id: int,
        filename: str = "export.json"
    ) -> dict:
        """
        上传分身记忆文件到平台
        
        Args:
            file_data: 文件字节数据或文件对象
            user_id: Telegram 用户 ID
            filename: 文件名
        
        Returns:
            API 响应: {arweave_id: str, hash: str}
        
        Raises:
            ValueError: 上传失败
            aiohttp.ClientError: 网络错误
        """
        if not self.session:
            raise RuntimeError("Client not initialized. Use async with context.")
        
        url = f"{self.base_url}/api/upload"
        
        # 准备 multipart/form-data
        data = aiohttp.FormData()
        data.add_field(
            'file',
            file_data,
            filename=filename,
            content_type='application/json'
        )
        data.add_field('user_id', str(user_id))
        
        # 添加测试网标识头
        headers = {
            'X-Network': 'base-sepolia-testnet',
            'X-Testnet-Only': 'true'
        }
        
        logger.info(f"Uploading file for user {user_id} to {url}")
        
        async with self.session.post(url, data=data, headers=headers) as response:
            if response.status == 200:
                result = await response.json()
                logger.info(f"Upload successful: {result.get('arweave_id', 'N/A')}")
                return result
            else:
                error_text = await response.text()
                logger.error(f"Upload failed: {response.status} - {error_text}")
                raise ValueError(f"上传失败 (HTTP {response.status}): {error_text}")
    
    async def get_status(self) -> dict:
        """
        获取平台状态
        
        Returns:
            状态信息
        """
        if not self.session:
            raise RuntimeError("Client not initialized")
        
        url = f"{self.base_url}/api/health"
        
        async with self.session.get(url) as response:
            if response.status == 200:
                return await response.json()
            else:
                raise ValueError(f"Health check failed: {response.status}")
    
    async def register_feral(
        self,
        user_id: int,
        memory_hash: str,
        arweave_id: str,
        initial_funds: int
    ) -> dict:
        """
        注册新的 FeralSoul (Base Sepolia Testnet Only)
        
        Args:
            user_id: Telegram 用户 ID
            memory_hash: 记忆哈希
            arweave_id: Arweave 存储 ID
            initial_funds: 初始资金 (USDC, 6位小数)
        
        Returns:
            交易收据
        """
        if not self.session:
            raise RuntimeError("Client not initialized")
        
        url = f"{self.base_url}/api/ferals/register"
        
        payload = {
            'user_id': user_id,
            'memory_hash': memory_hash,
            'arweave_id': arweave_id,
            'initial_funds': initial_funds,
            'network': 'base-sepolia-testnet'  # 强制测试网
        }
        
        logger.info(f"Registering FeralSoul for user {user_id} on Base Sepolia Testnet")
        
        async with self.session.post(url, json=payload) as response:
            if response.status == 200:
                return await response.json()
            else:
                error_text = await response.text()
                raise ValueError(f"注册失败: {error_text}")
