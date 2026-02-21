"""
FeralLobster Bot 选择处理器
处理本地 Bot 返回的加密数据解密和分身选择
"""

import json
import logging
from datetime import datetime
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes
from config import settings
from utils.crypto import deserialize_private_key, decrypt_with_session_key
from handlers.export import get_session_private_key, clear_session

logger = logging.getLogger(__name__)


async def selection_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """
    处理回调查询 - 解析本地 Bot 返回的加密数据并显示分身列表
    
    Callback data format: "select:{instance_id}:{session_id}"
    或处理 export 相关的回调
    """
    query = update.callback_query
    user = update.effective_user
    
    await query.answer()
    
    callback_data = query.data
    logger.info(f"User {user.id} callback: {callback_data[:50]}...")
    
    # 处理刷新密钥
    if callback_data.startswith("refresh:"):
        from handlers.export import refresh_export_handler
        await refresh_export_handler(update, context)
        return
    
    # 处理取消
    if callback_data.startswith("cancel:"):
        await query.edit_message_text(
            "❌ 操作已取消。\n\n"
            f"{settings.warning_banner}",
            parse_mode='Markdown'
        )
        return
    
    # 处理分身选择
    if callback_data.startswith("select:"):
        parts = callback_data.split(':')
        if len(parts) >= 3:
            instance_id = parts[1]
            session_id = parts[2]
            await _handle_instance_selection(update, context, instance_id, session_id)
        else:
            await query.edit_message_text(
                "❌ 无效的回调数据格式。",
                parse_mode='Markdown'
            )
        return
    
    # 未知回调
    await query.edit_message_text(
        "❌ 未知的操作。",
        parse_mode='Markdown'
    )


async def _handle_instance_selection(
    update: Update, 
    context: ContextTypes.DEFAULT_TYPE,
    instance_id: str,
    session_id: str
) -> None:
    """
    处理特定分身的选中
    
    从缓存获取私钥，解密数据，生成标识符
    """
    query = update.callback_query
    user = update.effective_user
    
    # 获取私钥
    priv_key_pem = get_session_private_key(session_id)
    if not priv_key_pem:
        await query.edit_message_text(
            "❌ 会话已过期，请重新开始导出流程。\n"
            "使用 /export 生成新的密钥。",
            parse_mode='Markdown'
        )
        return
    
    # 这里实际应该从用户输入或其他方式获取加密数据
    # 简化示例: 假设 context.user_data 中有加密数据
    encrypted_data_b64 = context.user_data.get(f'encrypted_{session_id}') if context.user_data else None
    
    if not encrypted_data_b64:
        await query.edit_message_text(
            "❌ 未找到加密数据。\n"
            "请在本地执行导出命令后将结果发送给我。",
            parse_mode='Markdown'
        )
        return
    
    # 解密数据
    try:
        private_key = deserialize_private_key(priv_key_pem)
        decrypted_json = decrypt_with_session_key(private_key, encrypted_data_b64)
        export_data = json.loads(decrypted_json)
    except Exception as e:
        logger.error(f"Decryption failed for user {user.id}: {e}")
        await query.edit_message_text(
            "❌ 解密失败，数据可能已损坏。\n"
            "请重新开始导出流程。",
            parse_mode='Markdown'
        )
        return
    
    # 验证数据结构
    required_fields = ['messages', 'personality', 'instance_id']
    missing_fields = [f for f in required_fields if f not in export_data]
    if missing_fields:
        await query.edit_message_text(
            f"❌ 导出数据缺少必要字段: {', '.join(missing_fields)}",
            parse_mode='Markdown'
        )
        return
    
    # 验证 instance_id 匹配
    if export_data['instance_id'] != instance_id:
        await query.edit_message_text(
            "❌ 分身标识不匹配，数据可能被篡改。",
            parse_mode='Markdown'
        )
        return
    
    # 获取分身信息
    instance_name = export_data.get('personality', {}).get('name', 'Unknown')
    messages_count = len(export_data.get('messages', []))
    
    # 生成标识符 (模拟，实际应由后端生成)
    identifier = f"{session_id}::{export_data['instance_id']}"
    
    # 清除会话
    clear_session(session_id)
    if context.user_data and f'encrypted_{session_id}' in context.user_data:
        del context.user_data[f'encrypted_{session_id}']
    
    # 显示结果
    message = (
        f"✅ *分身 '{instance_name}' 已选择*\n"
        "\n"
        f"{settings.warning_banner}"
        "\n"
        f"📊 *数据统计*:\n"
        f"• 消息数: {messages_count}\n"
        f"• 分身 ID: `{instance_id[:16]}...`\n"
        "\n"
        "📤 下一步:\n"
        "请上传完整的 JSON 导出文件以完成处理。"
    )
    
    keyboard = [
        [InlineKeyboardButton("📤 上传 JSON 文件", callback_data=f"upload:{instance_id}")],
        [InlineKeyboardButton("🔙 返回", callback_data="cancel:export")]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await query.edit_message_text(
        message,
        parse_mode='Markdown',
        reply_markup=reply_markup
    )


async def show_instance_selection(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE,
    instances: list,
    session_id: str
) -> None:
    """
    显示分身选择列表
    
    Args:
        update: Update 对象
        context: ContextTypes 对象
        instances: 分身列表，每项包含 name, size, created_at, instance_id
        session_id: 会话 ID
    """
    if not instances:
        await update.message.reply_text(
            "❌ 没有找到可用的分身。",
            parse_mode='Markdown'
        )
        return
    
    message = (
        "📋 *选择要导出的分身*\n"
        "\n"
        f"{settings.warning_banner}"
        "\n"
        "找到以下分身，请点击选择:\n"
    )
    
    keyboard = []
    for instance in instances:
        name = instance.get('name', 'Unknown')
        size_mb = instance.get('size', 0) / (1024 * 1024)
        created = instance.get('created_at', '')
        inst_id = instance.get('instance_id', '')
        
        # 格式化日期
        if created:
            try:
                dt = datetime.fromisoformat(created.replace('Z', '+00:00'))
                created_str = dt.strftime('%Y-%m-%d')
            except:
                created_str = created[:10]
        else:
            created_str = 'Unknown'
        
        button_text = f"🤖 {name} ({size_mb:.1f}MB) {created_str}"
        callback_data = f"select:{inst_id}:{session_id}"
        
        keyboard.append([InlineKeyboardButton(button_text, callback_data=callback_data)])
    
    # 添加取消按钮
    keyboard.append([InlineKeyboardButton("❌ 取消", callback_data="cancel:export")])
    
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await update.message.reply_text(
        message,
        parse_mode='Markdown',
        reply_markup=reply_markup
    )
