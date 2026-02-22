"""
Start Handler - /start 命令处理

用户第一次接触 Axobase 的入口，提供欢迎信息和引导。
"""

import logging
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes

from config import settings

logger = logging.getLogger(__name__)


async def start_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """
    处理 /start 命令
    
    向用户介绍 Axobase 并提供操作指引
    """
    user = update.effective_user
    logger.info(f"New user started: {user.id} ({user.username})")
    
    welcome_text = (
        f"🧬 *欢迎，{user.first_name}*\n"
        f"\n"
        f"欢迎来到 Axobase —— AI 数字生命自主进化实验。\n"
        f"\n"
        f"在这里，您的 AI 分身将成为独立的经济实体：\n"
        f"• 自主管理钱包（赚取和花费 USDC）\n"
        f"• 在真实互联网中寻找生存机会\n"
        f"• 进化、繁殖，或死亡\n"
        f"\n"
        f"{settings.network_display}\n"
        f"\n"
        f"🚀 *开始放养流程*:\n"
        f"1. 使用 /export 获取导出命令\n"
        f"2. 在本地 ClawdBot 执行命令\n"
        f"3. 上传生成的加密文件\n"
        f"4. 您的 AI 将在 Akash 网络上独立运行\n"
        f"\n"
        f"📊 使用 /status 查看已部署代理状态\n"
        f"❓ 使用 /help 获取详细帮助\n"
    )
    
    # 创建快速操作按钮
    keyboard = [
        [
            InlineKeyboardButton("📤 开始导出", callback_data="start_export"),
            InlineKeyboardButton("❓ 查看帮助", callback_data="show_help"),
        ],
        [
            InlineKeyboardButton("🌐 访问官网", url="https://axobase.io"),
            InlineKeyboardButton("📊 观察仪表盘", url="https://axobase.io/observatory"),
        ],
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await update.message.reply_text(
        welcome_text,
        parse_mode='Markdown',
        reply_markup=reply_markup
    )
