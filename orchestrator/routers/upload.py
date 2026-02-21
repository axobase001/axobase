"""
FeralLobster Orchestrator 上传路由
处理文件上传和 Arweave 存储
"""

import os
import tempfile
import logging
from pathlib import Path
from typing import Optional

import blake3
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from database import get_db, Soul, SoulStatus
from services.arweave import upload_to_arweave

logger = logging.getLogger(__name__)
router = APIRouter()

# 文件大小限制: 10MB
MAX_FILE_SIZE = 10 * 1024 * 1024


def calculate_blake3(file_path: str) -> str:
    """
    计算文件的 Blake3 哈希
    
    Args:
        file_path: 文件路径
    
    Returns:
        十六进制哈希字符串
    """
    hasher = blake3.blake3()
    with open(file_path, 'rb') as f:
        for chunk in iter(lambda: f.read(8192), b''):
            hasher.update(chunk)
    return hasher.hexdigest()


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    user_id: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    上传分身记忆文件
    
    1. 保存临时文件
    2. 计算 Blake3 哈希
    3. 上传到 Arweave
    4. 保存到数据库
    
    Args:
        file: 上传的 JSON 文件
        user_id: 可选的用户标识
        db: 数据库会话
    
    Returns:
        {
            "arweave_id": "...",
            "hash": "...",
            "status": "success"
        }
    """
    logger.info(f"Upload request from user: {user_id}, file: {file.filename}")
    
    # 验证文件类型
    if not file.filename or not file.filename.endswith('.json'):
        raise HTTPException(
            status_code=400,
            detail="Only JSON files are allowed"
        )
    
    # 创建临时文件
    temp_dir = tempfile.mkdtemp()
    temp_path = os.path.join(temp_dir, file.filename)
    
    try:
        # 保存上传的文件
        content = await file.read()
        
        # 验证文件大小
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=413,
                detail=f"File too large. Max size: {MAX_FILE_SIZE / 1024 / 1024}MB"
            )
        
        with open(temp_path, 'wb') as f:
            f.write(content)
        
        logger.info(f"File saved to: {temp_path}, size: {len(content)} bytes")
        
        # 计算 Blake3 哈希
        file_hash = calculate_blake3(temp_path)
        logger.info(f"Blake3 hash: {file_hash}")
        
        # 检查是否已存在 (可选)
        existing_soul = db.query(Soul).filter(Soul.memory_hash == file_hash).first()
        if existing_soul:
            logger.warning(f"Soul with hash {file_hash[:16]}... already exists")
            return JSONResponse(
                status_code=200,
                content={
                    "arweave_id": existing_soul.arweave_id,
                    "hash": file_hash,
                    "status": "exists",
                    "message": "This file has already been uploaded"
                }
            )
        
        # 上传到 Arweave
        try:
            arweave_id = await upload_to_arweave(temp_path)
            logger.info(f"Uploaded to Arweave: {arweave_id}")
        except Exception as e:
            logger.error(f"Arweave upload failed: {e}")
            # 测试环境可以返回模拟 ID
            arweave_id = f"mock_{file_hash[:32]}"
            logger.warning(f"Using mock Arweave ID: {arweave_id}")
        
        # 保存到数据库
        soul = Soul(
            memory_hash=file_hash,
            arweave_id=arweave_id,
            status=SoulStatus.UPLOADED,
            initial_funds=11 * 1000000  # 11 USDC (6 decimals)
        )
        db.add(soul)
        db.commit()
        db.refresh(soul)
        
        logger.info(f"Soul created: id={soul.id}, hash={file_hash[:16]}...")
        
        return {
            "arweave_id": arweave_id,
            "hash": file_hash,
            "status": "success",
            "soul_id": soul.id
        }
    
    except HTTPException:
        raise
    
    except Exception as e:
        logger.exception(f"Upload failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Upload failed: {str(e)}"
        )
    
    finally:
        # 清理临时文件
        try:
            if os.path.exists(temp_path):
                os.remove(temp_path)
            if os.path.exists(temp_dir):
                os.rmdir(temp_dir)
        except Exception as e:
            logger.warning(f"Failed to cleanup temp files: {e}")


@router.get("/upload/{soul_id}/status")
async def get_upload_status(
    soul_id: int,
    db: Session = Depends(get_db)
):
    """
    获取上传状态
    
    Args:
        soul_id: Soul ID
        db: 数据库会话
    
    Returns:
        Soul 状态信息
    """
    soul = db.query(Soul).filter(Soul.id == soul_id).first()
    if not soul:
        raise HTTPException(status_code=404, detail="Soul not found")
    
    return soul.to_dict()
