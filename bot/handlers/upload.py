"""
Upload Handler - 处理加密记忆文件上传

用户从本地 ClawdBot 导出加密文件后，通过 Telegram 上传。
本 handler 负责：
1. 验证文件格式和大小
2. 提取 session_id
3. 调用编排服务处理
4. 返回部署状态和标识符
"""

import os
import re
import logging
import aiohttp
from pathlib import Path
from telegram import Update
from telegram.ext import ContextTypes

from config import settings
from handlers.export import get_session_private_key, invalidate_session

logger = logging.getLogger(__name__)


async def upload_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """
    处理文档上传
    
    期望的文件格式: axo_export_<session_id>_<timestamp>.json.enc
    """
    if not update.message or not update.message.document:
        return
    
    document = update.message.document
    user = update.effective_user
    
    logger.info(f"User {user.id} uploaded file: {document.file_name} ({document.file_size} bytes)")
    
    # 验证文件大小
    max_size = settings.max_upload_size_mb * 1024 * 1024
    if document.file_size > max_size:
        await update.message.reply_text(
            f"❌ 文件过大。最大允许 {settings.max_upload_size_mb}MB。"
        )
        return
    
    # 验证文件名格式
    session_id = _extract_session_id(document.file_name)
    if not session_id:
        await update.message.reply_text(
            "❌ 无效的文件格式。\n"
            "请确保使用 `/generate_export` 命令生成的文件。"
        )
        return
    
    # 获取会话私钥
    private_key = get_session_private_key(session_id)
    if not private_key:
        await update.message.reply_text(
            "❌ 会话已过期或无效。\n"
            "请重新使用 `/export` 获取新的会话密钥。"
        )
        return
    
    # 通知用户开始处理
    processing_msg = await update.message.reply_text(
        "🔄 正在处理上传的记忆文件...\n"
        "• 下载加密文件\n"
        "• 解密并验证\n"
        "• 计算 GeneHash\n"
        "• 部署到 Akash\n"
        "\n"
        "这可能需要 1-2 分钟..."
    )
    
    try:
        # 下载文件
        file = await document.get_file()
        download_path = f"/tmp/axo_upload_{session_id}.enc"
        await file.download_to_drive(download_path)
        
        # 发送到编排服务处理
        result = await _process_upload(
            download_path,
            private_key,
            session_id,
            user.id
        )
        
        if result['success']:
            await processing_msg.edit_text(
                f"✅ *放养成功！*\n"
                f"\n"
                f"🧬 *GeneHash*: `{result['gene_hash'][:20]}...`\n"
                f"💼 *钱包地址*: `{result['wallet_address'][:20]}...`\n"
                f"🚀 *Akash DSEQ*: `{result['dseq']}`\n"
                f"\n"
                f"🔗 *部署状态*: {result.get('deployment_uri', '准备中...')}\n"
                f"\n"
                f"您的 AI 代理现在已在 Akash 网络上独立运行！\n"
                f"访问仪表盘观察它的生存与进化:\n"
                f"https://axobase.io/observatory/{result['gene_hash']}\n"
                f"\n"
                f"⚠️ 请妥善保存 GeneHash，这是您代理的唯一标识。",
                parse_mode='Markdown'
            )
            
            # 使会话失效
            invalidate_session(session_id)
            
        else:
            await processing_msg.edit_text(
                f"❌ *放养失败*\n"
                f"\n"
                f"错误: {result.get('error', '未知错误')}\n"
                f"\n"
                f"请重试或联系支持。"
            )
        
        # 清理临时文件
        os.remove(download_path)
        
    except Exception as e:
        logger.error(f"Upload processing failed: {e}", exc_info=True)
        await processing_msg.edit_text(
            f"❌ 处理失败: {str(e)}\n"
            f"\n"
            f"请重试或联系支持。"
        )


def _extract_session_id(filename: str) -> str | None:
    """
    从文件名提取 session_id
    
    期望格式: axo_export_<session_id>_<timestamp>.json.enc
    """
    pattern = r'axo_export_([a-f0-9-]{36})_\d+\.(json\.enc|enc)'
    match = re.match(pattern, filename)
    if match:
        return match.group(1)
    return None


async def _process_upload(
    file_path: str,
    private_key: str,
    session_id: str,
    user_id: int
) -> dict:
    """
    发送文件到编排服务处理
    
    编排服务将：
    1. 使用私钥解密文件
    2. 提取记忆数据
    3. 计算 GeneHash
    4. 创建钱包
    5. 部署到 Akash
    6. 链上注册
    """
    url = f"{settings.orchestrator_api}/api/v1/birth"
    
    headers = {
        'X-API-Key': settings.orchestrator_api_key,
    }
    
    data = {
        'session_id': session_id,
        'private_key': private_key,
        'user_id': user_id,
    }
    
    try:
        async with aiohttp.ClientSession() as session:
            with open(file_path, 'rb') as f:
                files = {'encrypted_memory': f}
                async with session.post(url, data=data, headers=headers) as resp:
                    result = await resp.json()
                    
                    if resp.status == 200:
                        return {
                            'success': True,
                            'gene_hash': result['gene_hash'],
                            'wallet_address': result['wallet_address'],
                            'dseq': result['dseq'],
                            'deployment_uri': result.get('deployment_uri'),
                        }
                    else:
                        return {
                            'success': False,
                            'error': result.get('detail', f'HTTP {resp.status}'),
                        }
                        
    except aiohttp.ClientError as e:
        logger.error(f"Orchestrator connection failed: {e}")
        return {
            'success': False,
            'error': f'连接编排服务失败: {str(e)}',
        }
    except Exception as e:
        logger.error(f"Processing error: {e}")
        return {
            'success': False,
            'error': str(e),
        }


async def manual_upload_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """
    /upload 命令 - 手动触发上传提示
    
    用户可能不知道可以直接发送文件，此命令提供指导
    """
    await update.message.reply_text(
        "📤 *上传记忆文件*\n"
        "\n"
        "请直接将加密文件发送到此对话。\n"
        "\n"
        "文件格式: `axo_export_<session_id>_<timestamp>.json.enc`\n"
        "\n"
        "获取方式:\n"
        "1. 在本地 ClawdBot 执行 `/generate_export` 命令\n"
        "2. 将生成的文件发送到本对话\n"
        "\n"
        "⚠️ 注意: 每个记忆只能放养一次（防双花机制）",
        parse_mode='Markdown'
    )
