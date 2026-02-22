#!/usr/bin/env python3
"""
Axobase Telegram Bot - 去中心化 AI 放养平台交互入口

连接用户本地 ClawdBot 与 Axobase 平台的桥梁：
1. /export - 生成会话密钥，指导用户导出记忆
2. /upload - 处理加密记忆文件上传
3. 与编排服务通信，完成部署流程

⚠️ 所有区块链操作均在 Base 主网进行（生产环境）
"""

import asyncio
import logging
import sys
import os
from pathlib import Path

# 添加项目根目录到 Python 路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from telegram import Update
from telegram.ext import (
    Application,
    ApplicationBuilder,
    CommandHandler,
    CallbackQueryHandler,
    MessageHandler,
    filters,
    ContextTypes,
)

# 配置导入
from config import settings

# Handlers 导入
from handlers import (
    start_handler,
    export_handler,
    upload_handler,
    status_handler,
)

# 配置日志
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('bot.log', encoding='utf-8'),
    ],
)
logger = logging.getLogger(__name__)


async def error_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """全局错误处理"""
    logger.error(f"Update {update} caused error: {context.error}", exc_info=True)
    
    if update and update.effective_message:
        await update.effective_message.reply_text(
            "❌ 处理请求时出错，请稍后重试。\n"
            "如果问题持续，请联系支持。"
        )


async def help_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """/help 命令处理"""
    help_text = (
        "🧬 *Axobase Bot 帮助*\n"
        "\n"
        f"{settings.network_display}\n"
        "\n"
        "📋 *可用命令*:\n"
        "\n"
        "/start - 开始使用，显示欢迎消息\n"
        "/help - 显示此帮助信息\n"
        "/export - 开始导出分身记忆流程\n"
        "/status - 查看已部署代理状态\n"
        "\n"
        "📖 *使用流程*:\n"
        "1. 使用 /export 获取导出命令\n"
        "2. 在本地 ClawdBot 执行命令\n"
        "3. 上传生成的加密文件\n"
        "4. Bot 会返回部署状态和标识符\n"
        "5. 访问 Web 仪表盘观察进化\n"
        "\n"
        "🔐 *安全提示*:\n"
        "• 导出的记忆使用一次性会话密钥加密\n"
        "• 每个记忆只能放养一次（防双花）\n"
        "• 私钥永远不会离开您的设备\n"
        "\n"
        f"{settings.warning_banner}"
    )
    
    await update.message.reply_text(help_text, parse_mode='Markdown')


async def post_init(application: Application) -> None:
    """Bot 初始化后设置"""
    await application.bot.set_my_commands([
        ('start', '开始使用'),
        ('help', '显示帮助'),
        ('export', '导出记忆'),
        ('status', '查看状态'),
    ])
    logger.info("Bot commands registered")


def main() -> None:
    """Bot 入口点"""
    logger.info(f"Starting Axobase Bot on {settings.network_name}")
    logger.info(f"API Endpoint: {settings.orchestrator_api}")
    
    # 验证配置
    if not settings.telegram_token:
        logger.error("TELEGRAM_BOT_TOKEN not set!")
        sys.exit(1)
    
    # 创建 Application
    application = (
        ApplicationBuilder()
        .token(settings.telegram_token)
        .post_init(post_init)
        .build()
    )
    
    # 注册 handlers
    application.add_handler(CommandHandler('start', start_handler))
    application.add_handler(CommandHandler('help', help_handler))
    application.add_handler(CommandHandler('export', export_handler))
    application.add_handler(CommandHandler('status', status_handler))
    
    # 文件上传 handler
    application.add_handler(
        MessageHandler(filters.Document.ALL, upload_handler)
    )
    
    # 回调 query handlers
    application.add_handler(
        CallbackQueryHandler(export_handler.refresh_export, pattern='^refresh:')
    )
    application.add_handler(
        CallbackQueryHandler(cancel_handler, pattern='^cancel:')
    )
    
    # 错误处理
    application.add_error_handler(error_handler)
    
    # 启动 Bot
    logger.info("Bot polling started...")
    application.run_polling(allowed_updates=Update.ALL_TYPES)


async def cancel_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """处理取消回调"""
    query = update.callback_query
    await query.answer()
    await query.edit_message_text("❌ 操作已取消。")


if __name__ == '__main__':
    main()
