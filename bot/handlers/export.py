"""
Export Handler - /export 命令处理

这是 Axobase 最关键的流程之一：
1. 用户发送 /export
2. Bot 生成临时 RSA 密钥对
3. 用户复制命令到本地 ClawdBot 执行
4. ClawdBot 加密记忆并生成文件
5. 用户上传文件到 Telegram
6. Bot 处理并发送到编排服务

安全设计：
- 会话密钥 5 分钟过期
- 每个记忆只能导出一次（防双花）
- 私钥从未离开 Telegram Bot 内存
"""

import uuid
import logging
from datetime import datetime, timedelta
from typing import Dict, Optional
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes

from config import settings
from utils.crypto import generate_session_keys, serialize_private_key

logger = logging.getLogger(__name__)

# 内存缓存: session_id -> {private_key_pem, expiry_time, user_id}
# 注意: 生产环境应使用 Redis 等外部缓存
_session_cache: Dict[str, dict] = {}


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
    expiry_time = datetime.now() + timedelta(seconds=settings.session_key_ttl)
    _session_cache[session_id] = {
        'private_key_pem': priv_key_pem,
        'expiry': expiry_time,
        'user_id': user.id,
        'used': False,
    }
    
    # 清理过期缓存
    _cleanup_expired_sessions()
    
    # 格式化公钥 (去除头尾，单行显示)
    pub_key_single_line = pub_key_pem.replace('-----BEGIN PUBLIC KEY-----', '') \
                                     .replace('-----END PUBLIC KEY-----', '') \
                                     .replace('\n', '')
    
    # 构建导出命令
    export_command = f"/generate_export {session_id} {pub_key_single_line[:100]}..."
    
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
        "执行命令后，本地 Bot 将返回加密的导出数据文件，"
        "请将该文件上传到本对话完成放养流程。"
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


async def refresh_export(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """
    处理刷新密钥按钮
    
    删除旧会话并生成新密钥对
    """
    query = update.callback_query
    await query.answer()
    
    # 解析旧 session_id
    data = query.data
    old_session_id = data.split(':')[1] if ':' in data else None
    
    # 删除旧会话
    if old_session_id and old_session_id in _session_cache:
        del _session_cache[old_session_id]
        logger.info(f"Old session {old_session_id} removed")
    
    # 生成新会话
    await query.edit_message_text("🔄 正在生成新密钥...")
    
    # 重新调用 export_handler
    # 创建模拟的 Update 对象
    class MockMessage:
        async def reply_text(self, *args, **kwargs):
            return await query.edit_message_text(*args, **kwargs)
    
    class MockUpdate:
        effective_user = query.from_user
        message = MockMessage()
    
    await export_handler(MockUpdate(), context)


def get_session_private_key(session_id: str) -> Optional[str]:
    """
    获取会话私钥（用于解密上传的文件）
    
    使用后立即删除，确保一次性使用
    """
    session = _session_cache.get(session_id)
    if not session:
        return None
    
    # 检查是否过期
    if datetime.now() > session['expiry']:
        del _session_cache[session_id]
        return None
    
    # 检查是否已使用
    if session.get('used'):
        return None
    
    # 标记为已使用
    session['used'] = True
    
    return session['private_key_pem']


def invalidate_session(session_id: str) -> None:
    """使会话失效"""
    if session_id in _session_cache:
        del _session_cache[session_id]


def _cleanup_expired_sessions() -> None:
    """清理过期会话"""
    now = datetime.now()
    expired = [
        sid for sid, session in _session_cache.items()
        if now > session['expiry']
    ]
    for sid in expired:
        del _session_cache[sid]
    
    if expired:
        logger.debug(f"Cleaned up {len(expired)} expired sessions")


# 为保持兼容性，使用旧的导入名称
export_handler.refresh_export = refresh_export
