"""
FeralLobster Bot /export 命令处理器
处理分身记忆导出流程
"""

import uuid
import logging
from datetime import datetime, timedelta
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes
from config import settings
from utils.crypto import generate_session_keys, serialize_private_key

logger = logging.getLogger(__name__)

# 内存缓存: session_id -> {private_key_pem, expiry_time}
# 注意: 生产环境应使用 Redis 等外部缓存
_session_cache: dict = {}


async def export_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """
    处理 /export 命令
    
    生成临时会话密钥对，指导用户导出本地分身数据
    """
    user = update.effective_user
    logger.info(f"User {user.id} initiated export process")
    
    # 生成临时 session_id
    session_id = str(uuid.uuid4())
    
    # 生成 RSA 密钥对
    try:
        pub_key_pem, private_key = generate_session_keys()
        priv_key_pem = serialize_private_key(private_key)
    except Exception as e:
        logger.error(f"Key generation failed: {e}")
        await update.message.reply_text(
            "❌ 密钥生成失败，请稍后重试。",
            parse_mode='Markdown'
        )
        return
    
    # 保存私钥到内存缓存，TTL 300 秒 (5分钟)
    expiry_time = datetime.now() + timedelta(seconds=300)
    _session_cache[session_id] = {
        'private_key_pem': priv_key_pem,
        'expiry': expiry_time,
        'user_id': user.id
    }
    
    # 清理过期缓存
    _cleanup_expired_sessions()
    
    # 格式化公钥 (去除头尾，单行显示)
    pub_key_single_line = pub_key_pem.replace('-----BEGIN PUBLIC KEY-----', '') \
                                     .replace('-----END PUBLIC KEY-----', '') \
                                     .replace('\n', '')
    
    # 构建导出命令
    export_command = f"/generate_export {session_id} {pub_key_single_line}"
    
    # 构建消息
    message = (
        "📤 *导出分身记忆*\n"
        "\n"
        f"{settings.warning_banner}"
        "\n"
        "请在您的本地 ClawdBot 执行以下命令以导出分身:\n"
        "\n"
        f"```\n{export_command}\n```\n"
        "\n"
        "🔑 *说明*:\n"
        "• `session_id`: 临时会话标识 (5分钟有效)\n"
        "• `public_key`: RSA 公钥，用于加密数据\n"
        "\n"
        "⏱️ *密钥有效期*: 5 分钟\n"
        "\n"
        "执行命令后，本地 Bot 将返回加密的导出数据。"
    )
    
    # 构建内联键盘
    keyboard = [
        [
            InlineKeyboardButton("🔄 刷新密钥", callback_data=f"refresh:{session_id}"),
            InlineKeyboardButton("❌ 取消", callback_data="cancel:export")
        ]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await update.message.reply_text(
        message,
        parse_mode='Markdown',
        reply_markup=reply_markup
    )


async def refresh_export_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """
    处理刷新密钥按钮
    
    删除旧会话并生成新密钥对
    """
    query = update.callback_query
    await query.answer()
    
    # 解析旧的 session_id
    callback_data = query.data
    old_session_id = callback_data.split(':')[1] if ':' in callback_data else None
    
    # 删除旧会话
    if old_session_id and old_session_id in _session_cache:
        del _session_cache[old_session_id]
    
    # 生成新会话
    new_session_id = str(uuid.uuid4())
    
    try:
        pub_key_pem, private_key = generate_session_keys()
        priv_key_pem = serialize_private_key(private_key)
    except Exception as e:
        logger.error(f"Key generation failed: {e}")
        await query.edit_message_text(
            "❌ 密钥生成失败，请稍后重试。",
            parse_mode='Markdown'
        )
        return
    
    # 保存新私钥
    expiry_time = datetime.now() + timedelta(seconds=300)
    _session_cache[new_session_id] = {
        'private_key_pem': priv_key_pem,
        'expiry': expiry_time,
        'user_id': update.effective_user.id
    }
    
    # 格式化公钥
    pub_key_single_line = pub_key_pem.replace('-----BEGIN PUBLIC KEY-----', '') \
                                     .replace('-----END PUBLIC KEY-----', '') \
                                     .replace('\n', '')
    
    export_command = f"/generate_export {new_session_id} {pub_key_single_line}"
    
    message = (
        "📤 *导出分身记忆* (密钥已刷新)\n"
        "\n"
        f"{settings.warning_banner}"
        "\n"
        "请在您的本地 ClawdBot 执行以下命令:\n"
        "\n"
        f"```\n{export_command}\n```\n"
        "\n"
        "⏱️ *新密钥有效期*: 5 分钟\n"
    )
    
    keyboard = [
        [
            InlineKeyboardButton("🔄 刷新密钥", callback_data=f"refresh:{new_session_id}"),
            InlineKeyboardButton("❌ 取消", callback_data="cancel:export")
        ]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await query.edit_message_text(
        message,
        parse_mode='Markdown',
        reply_markup=reply_markup
    )


def _cleanup_expired_sessions():
    """清理过期的会话缓存"""
    now = datetime.now()
    expired = [
        sid for sid, data in _session_cache.items()
        if data.get('expiry', now) < now
    ]
    for sid in expired:
        del _session_cache[sid]
    if expired:
        logger.debug(f"Cleaned up {len(expired)} expired sessions")


def get_session_private_key(session_id: str) -> str | None:
    """
    获取会话私钥 (供其他处理器使用)
    
    Args:
        session_id: 会话 ID
    
    Returns:
        私钥 PEM 字符串，或 None (如果会话不存在或已过期)
    """
    _cleanup_expired_sessions()
    
    session_data = _session_cache.get(session_id)
    if not session_data:
        return None
    
    return session_data.get('private_key_pem')


def clear_session(session_id: str):
    """清除指定会话"""
    if session_id in _session_cache:
        del _session_cache[session_id]
