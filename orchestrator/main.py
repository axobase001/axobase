#!/usr/bin/env python3
"""
Axobase Orchestrator Service

连接 Telegram Bot 和区块链部署的编排服务：
1. 接收加密记忆文件
2. 解密并处理
3. 调用 TypeScript 模块进行 GeneHash 计算
4. 部署到 Akash
5. 链上注册

FastAPI + async/await for high concurrency
"""

import os
import sys
import asyncio
import logging
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, UploadFile, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import uvicorn

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
    ]
)
logger = logging.getLogger(__name__)

# API 密钥验证
security = HTTPBearer()
API_KEY = os.getenv('ORCHESTRATOR_API_KEY', 'dev-key-change-in-production')


def verify_api_key(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """验证 API 密钥"""
    if credentials.credentials != API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API key")
    return credentials.credentials


class BirthRequest(BaseModel):
    """出生请求"""
    session_id: str
    private_key: str  # RSA 私钥（PEM 格式）
    user_id: int
    msa_amount: float = 5.0  # Minimum Survival Amount in USDC


class BirthResponse(BaseModel):
    """出生响应"""
    success: bool
    gene_hash: str
    wallet_address: str
    dseq: str
    deployment_uri: str | None = None
    error: str | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    logger.info("🚀 Orchestrator starting...")
    # 初始化资源
    yield
    # 清理资源
    logger.info("🛑 Orchestrator shutting down...")


app = FastAPI(
    title="Axobase Orchestrator",
    description="Deployment orchestration service for Axobase AI agents",
    version="2.1.0",
    lifespan=lifespan,
)


@app.post("/api/v1/birth", response_model=BirthResponse)
async def create_birth(
    request: BirthRequest,
    encrypted_memory: UploadFile = File(...),
    api_key: str = Depends(verify_api_key),
):
    """
    创建新的 AI Agent（出生仪式）
    
    完整流程:
    1. 保存上传的加密文件
    2. 使用 session private key 解密
    3. 调用 TypeScript MemoryExport 计算 GeneHash
    4. 创建 HD 钱包
    5. 转移 MSA 资金
    6. 部署到 Akash
    7. 链上注册
    8. 返回部署信息
    """
    logger.info(f"Birth request received for user {request.user_id}")
    
    try:
        # Step 1: 保存上传的文件
        temp_dir = f"/tmp/axo_birth_{request.session_id}"
        os.makedirs(temp_dir, exist_ok=True)
        
        encrypted_path = f"{temp_dir}/memory.enc"
        with open(encrypted_path, "wb") as f:
            content = await encrypted_memory.read()
            f.write(content)
        
        logger.info(f"Encrypted memory saved: {encrypted_path}")
        
        # Step 2: 解密文件 (使用 session private key)
        decrypted_path = f"{temp_dir}/memory.tar.gz"
        
        # 使用 OpenSSL 解密
        key_path = f"{temp_dir}/session_key.pem"
        with open(key_path, "w") as f:
            f.write(request.private_key)
        
        decrypt_cmd = f"openssl pkeyutl -decrypt -in '{encrypted_path}' -out '{decrypted_path}' -inkey '{key_path}'"
        proc = await asyncio.create_subprocess_shell(
            decrypt_cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await proc.communicate()
        
        if proc.returncode != 0:
            raise Exception(f"Decryption failed: {stderr.decode()}")
        
        logger.info(f"Memory decrypted: {decrypted_path}")
        
        # Step 3: 调用 TypeScript MemoryExport 处理
        # 这里我们会调用 Node.js 脚本来处理
        export_result = await _process_memory_export(decrypted_path, temp_dir)
        
        if not export_result['success']:
            raise Exception(f"Export processing failed: {export_result.get('error')}")
        
        gene_hash = export_result['gene_hash']
        encrypted_file = export_result['encrypted_file']
        
        logger.info(f"GeneHash calculated: {gene_hash}")
        
        # Step 4: 部署到 Akash (简化版，实际会调用 AkashClient)
        # 这里模拟部署流程
        wallet_address = f"0x{gene_hash[:40]}"
        dseq = f"{request.session_id[:8]}"
        
        logger.info(f"Deployment created: dseq={dseq}")
        
        # 清理临时文件
        import shutil
        shutil.rmtree(temp_dir, ignore_errors=True)
        
        return BirthResponse(
            success=True,
            gene_hash=gene_hash,
            wallet_address=wallet_address,
            dseq=dseq,
            deployment_uri=f"https://akash.network/deployments/{dseq}",
        )
        
    except Exception as e:
        logger.error(f"Birth process failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


async def _process_memory_export(decrypted_path: str, work_dir: str) -> dict:
    """
    调用 TypeScript MemoryExport 处理记忆文件
    
    实际实现会调用 Node.js 脚本执行 TypeScript 代码
    """
    # 简化的模拟实现
    # 实际应该调用:
    # node -e "const { MemoryExport } = require('./dist/memory/Export.js'); ..."
    
    import hashlib
    
    # 模拟计算 GeneHash
    with open(decrypted_path, 'rb') as f:
        content = f.read()
        gene_hash = hashlib.sha256(content).hexdigest()
    
    return {
        'success': True,
        'gene_hash': gene_hash,
        'encrypted_file': f"{work_dir}/export.asc",
    }


@app.get("/api/v1/agents")
async def list_agents(
    telegram_user_id: int,
    api_key: str = Depends(verify_api_key),
):
    """
    获取用户的代理列表
    
    从链上查询用户部署的所有代理
    """
    # 简化实现 - 实际应从数据库或链上查询
    return []


@app.get("/health")
async def health_check():
    """健康检查端点"""
    return {"status": "healthy", "version": "2.1.0"}


if __name__ == "__main__":
    port = int(os.getenv('PORT', 8000))
    host = os.getenv('HOST', '0.0.0.0')
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=os.getenv('DEBUG', 'false').lower() == 'true',
    )
