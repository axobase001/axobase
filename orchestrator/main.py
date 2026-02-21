"""
FeralLobster Orchestrator 主入口
FastAPI 应用
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import settings
from database import init_db, get_db
from routers import upload, wallet

# 配置日志
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('orchestrator.log', encoding='utf-8')
    ]
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    应用生命周期管理
    
    启动时初始化，关闭时清理
    """
    # 启动
    logger.info("=" * 60)
    logger.info("FeralLobster Orchestrator Starting...")
    logger.info("=" * 60)
    logger.info(f"Network: {settings.network_display}")
    logger.info(f"Database: {settings.database_url}")
    logger.info(f"Contract: {settings.contract_address}")
    logger.info(f"RPC: {settings.rpc_url}")
    logger.info("=" * 60)
    
    # 初始化数据库
    try:
        init_db()
        logger.info("Database initialized")
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        raise
    
    # 启动事件监听器 (后台任务)
    # 注意: 生产环境应使用单独的进程
    try:
        from services.listener import start_event_listener
        # start_event_listener()  # 取消注释以启动监听
        logger.info("Event listener ready")
    except Exception as e:
        logger.warning(f"Event listener not started: {e}")
    
    yield
    
    # 关闭
    logger.info("=" * 60)
    logger.info("FeralLobster Orchestrator Shutting down...")
    logger.info("=" * 60)


# 创建 FastAPI 应用
app = FastAPI(
    title="FeralLobster Orchestrator",
    description="去中心化 AI 放养平台后端服务 (Base Sepolia Testnet)",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# 配置 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 健康检查
@app.get("/api/health", tags=["Health"])
async def health_check():
    """
    健康检查端点
    
    返回服务状态和配置信息
    """
    return {
        "status": "healthy",
        "service": "feral-orchestrator",
        "version": "0.1.0",
        "network": settings.network_display,
        "is_testnet": settings.is_testnet,
        "chain_id": settings.chain_id,
        "contract_address": settings.contract_address
    }


# 网络信息
@app.get("/api/network", tags=["Network"])
async def network_info():
    """
    获取当前网络配置
    
    ⚠️ 返回测试网配置信息
    """
    return {
        "name": "Base Sepolia Testnet",
        "chain_id": settings.chain_id,
        "rpc_url": settings.rpc_url,
        "contract_address": settings.contract_address,
        "is_testnet": settings.is_testnet,
        "warnings": [
            "This is a testnet environment.",
            "No real assets are involved.",
            "Use testnet USDC only."
        ]
    }


# 包含路由
app.include_router(upload.router, prefix="/api", tags=["Upload"])
app.include_router(wallet.router, prefix="/api", tags=["Wallet"])


# 全局异常处理
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """全局异常处理"""
    logger.exception(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal server error",
            "message": str(exc) if settings.is_testnet else "An error occurred"
        }
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=True,
        log_level=settings.log_level.lower()
    )
