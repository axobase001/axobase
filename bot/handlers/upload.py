"""
FeralLobster Bot 文件上传处理器
处理 JSON 导出文件上传和标识符生成
"""

import json
import logging
from telegram import Update
from telegram.ext import ContextTypes, JobQueue
from config import settings
from utils.api_client import PlatformAPI

logger = logging.getLogger(__name__)

# 文件大小限制: 10MB
MAX_FILE_SIZE = 10 * 1024 * 1024


async def upload_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """
    处理上传的 JSON 文件
    
    验证文件 -> 读取内容 -> 上传到平台 -> 返回标识符
    """
    user = update.effective_user
    document = update.message.document
    
    logger.info(f"User {user.id} uploading file: {document.file_name}, size: {document.file_size}")
    
    # 验证文件扩展名
    if not document.file_name.endswith('.json'):
        await update.message.reply_text(
            "❌ 请上传 JSON 格式的文件。",
            parse_mode='Markdown'
        )
        return
    
    # 验证文件大小
    if document.file_size > MAX_FILE_SIZE:
        await update.message.reply_text(
            f"❌ 文件过大 ({document.file_size / 1024 / 1024:.1f}MB)。\n"
            f"最大允许大小: {MAX_FILE_SIZE / 1024 / 1024}MB",
            parse_mode='Markdown'
        )
        return
    
    # 发送处理中消息
    processing_msg = await update.message.reply_text(
        "⏳ 正在处理文件，请稍候...",
        parse_mode='Markdown'
    )
    
    try:
        # 下载文件
        file = await context.bot.get_file(document.file_id)
        file_bytes = await file.download_as_bytearray()
        
        # 验证 JSON 结构
        try:
            export_data = json.loads(file_bytes.decode('utf-8'))
        except json.JSONDecodeError as e:
            await processing_msg.edit_text(
                f"❌ 无效的 JSON 文件: {str(e)}",
                parse_mode='Markdown'
            )
            return
        
        # 验证必需字段
        required_fields = ['messages', 'personality', 'instance_id']
        missing_fields = [f for f in required_fields if f not in export_data]
        if missing_fields:
            await processing_msg.edit_text(
                f"❌ 导出数据缺少必要字段: {', '.join(missing_fields)}\n\n"
                f"{settings.warning_banner}",
                parse_mode='Markdown'
            )
            return
        
        # 验证 messages 是数组
        if not isinstance(export_data.get('messages'), list):
            await processing_msg.edit_text(
                "❌ messages 字段必须是数组。",
                parse_mode='Markdown'
            )
            return
        
        # 验证 personality 是对象
        if not isinstance(export_data.get('personality'), dict):
            await processing_msg.edit_text(
                "❌ personality 字段必须是对象。",
                parse_mode='Markdown'
            )
            return
        
        # 上传到平台
        async with PlatformAPI() as api:
            result = await api.upload_file(
                file_data=bytes(file_bytes),
                user_id=user.id,
                filename=document.file_name
            )
        
        arweave_id = result.get('arweave_id', 'N/A')
        hash_value = result.get('hash', 'N/A')
        
        # 格式化标识符
        identifier = f"{arweave_id}::{hash_value}"
        
        # 构建成功消息
        success_message = (
            "✅ *文件处理成功*\n"
            "\n"
            f"{settings.warning_banner}"
            "\n"
            "🔑 *标识符* (保存此标识符):\n"
            f"```\n{identifier}\n```\n"
            "\n"
            "📋 *下一步*:\n"
            "1. 复制并保存上方标识符\n"
            "2. 访问 Web 平台完成放养\n"
            "3. 使用标识符认领您的分身\n"
            "\n"
            "⚠️ *此消息将在 10 秒后自毁*\"
        )
        
        # 发送标识符消息
        identifier_msg = await update.message.reply_text(
            success_message,
            parse_mode='Markdown'
        )
        
        # 删除处理中消息
        await processing_msg.delete()
        
        # 调度消息删除任务
        if context.job_queue:
            context.job_queue.run_once(
                _delete_message,
                10,  # 10 秒后
                data={
                    'chat_id': update.effective_chat.id,
                    'message_id': identifier_msg.message_id
                },
                name=f"delete_msg_{identifier_msg.message_id}"
            )
        
        # 记录日志
        logger.info(f"User {user.id} uploaded file successfully, arweave_id: {arweave_id}")
        
    except ValueError as e:
        # API 错误
        logger.error(f"Upload failed for user {user.id}: {e}")
        await processing_msg.edit_text(
            f"❌ 上传失败: {str(e)}\n\n"
            f"{settings.warning_banner}",
            parse_mode='Markdown'
        )
    
    except Exception as e:
        # 未知错误
        logger.exception(f"Unexpected error processing upload for user {user.id}")
        await processing_msg.edit_text(
            f"❌ 处理文件时出错: {str(e)}\n"
            f"请稍后重试或联系支持。\n\n"
            f"{settings.warning_banner}",
            parse_mode='Markdown'
        )


async def _delete_message(context: ContextTypes.DEFAULT_TYPE) -> None:
    """
    定时删除消息的回调函数
    
    Args:
        context: Job context，包含 chat_id 和 message_id
    """
    job_data = context.job.data
    chat_id = job_data.get('chat_id')
    message_id = job_data.get('message_id')
    
    if chat_id and message_id:
        try:
            await context.bot.delete_message(chat_id=chat_id, message_id=message_id)
            logger.debug(f"Deleted message {message_id} in chat {chat_id}")
        except Exception as e:
            logger.warning(f"Failed to delete message {message_id}: {e}")


async def manual_upload_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """
    /upload 命令 - 提示用户上传文件
    """
    await update.message.reply_text(
        "📤 *上传分身记忆文件*\n"
        "\n"
        f"{settings.warning_banner}"
        "\n"
        "请直接发送 JSON 文件:\n"
        "• 文件大小需小于 10MB\n"
        "• 必须是有效的 JSON 格式\n"
        "• 需包含 messages, personality, instance_id 字段\n"
        "\n"
        "您可以从本地 ClawdBot 导出获得此文件。",
        parse_mode='Markdown'
    )
