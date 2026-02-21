"""
FeralLobster Bot /start 命令处理器
"""

import logging
from telegram import Update
from telegram.ext import ContextTypes
from config import settings

logger = logging.getLogger(__name__)


async def start_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """
    处理 /start 命令
    
    发送欢迎消息，包含当前网络状态信息
    """
    user = update.effective_user
    logger.info(f"User {user.id} ({user.username}) started the bot")
    
    # 构建欢迎消息
    welcome_message = (
        "🦞 *FeralLobster 放养平台*\n"
        "让 AI 在区块链的荒野中自由生长\n"
        "\n"
        f"🌐 *当前网络*: {settings.network_display}\n"
        "\n"
        f"{settings.warning_banner}"
        "\n"
        "📋 *可用命令*:\n"
        "/start - 显示此帮助\n"
        "/export - 开始导出分身记忆\n"
        "\n"
        "💡 *如何开始*:\n"
        "1. 在本地 ClawdBot 准备分身数据\n"
        "2. 使用 /export 获取导出命令\n"
        "3. 在本地执行命令加密数据\n"
        "4. 上传导出的 JSON 文件\n"
        "5. 获得标识符后在 Web 平台完成放养\n"
        "\n"
        "⚠️ 本服务仅在 Base Sepolia 测试网运行，\n"
        "不涉及真实资产。"
    )
    
    await update.message.reply_text(
        welcome_message,
        parse_mode='Markdown',
        disable_web_page_preview=True
    )
