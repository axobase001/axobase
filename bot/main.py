#!/usr/bin/env python3
"""
FeralLobster Telegram Bot 入口

去中心化 AI 放养平台 - Telegram 交互层
⚠️ 所有区块链操作均在 Base Sepolia Testnet 进行
"""

import asyncio
import logging
import sys
from telegram import Update
from telegram.ext import (
    Application,
    ApplicationBuilder,
    CommandHandler,
    CallbackQueryHandler,
    MessageHandler,
    filters,
    ContextTypes
)

# 配置导入
from config import settings

# Handlers 导入
from handlers import (
    start_handler,
    export_handler,
    selection_handler,
    upload_handler
)
from handlers.upload import manual_upload_command


# 配置日志
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('bot.log', encoding='utf-8')
    ]
)
logger = logging.getLogger(__name__)


async def error_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """全局错误处理器"""
    logger.error(f"Update {update} caused error: {context.error}", exc_info=True)
    
    if update and update.effective_message:
        await update.effective_message.reply_text(
            "❌ 处理请求时出错，请稍后重试。\n"
            "如果问题持续，请联系支持。"
        )


async def help_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """/help 命令处理器"""
    help_text = (
        "🦞 *FeralLobster 帮助*\n"
        "\n"
        f"{settings.network_display}\n"
        "\n"
        "📋 *可用命令*:\n"
        "\n"
        "/start - 开始使用，显示欢迎消息\n"
        "/help - 显示此帮助信息\n"
        "/export - 开始导出分身记忆流程\n"
        "/upload - 手动触发文件上传\n"
        "\n"
        "📖 *使用流程*:\n"
        "1. 使用 /export 获取导出命令\n"
        "2. 在本地 ClawdBot 执行命令\n"
        "3. 上传导出的 JSON 文件\n"
        "4. 获得标识符后访问 Web 平台\n"
        "5. 在 Web 平台完成放养\n"
        "\n"
        f"{settings.warning_banner}"
    )
    
    await update.message.reply_text(help_text, parse_mode='Markdown')


def create_application() -> Application:
    """
    创建并配置 Bot Application
    
    Returns:
        配置好的 Application 实例
    """
    logger.info("Creating FeralLobster Bot Application...")
    logger.info(f"Network: {settings.network_display}")
    logger.info(f"Platform API: {settings.platform_api_url}")
    
    # 验证配置
    if not settings.telegram_bot_token:
        raise ValueError("TELEGRAM_BOT_TOKEN not set!")
    
    if not settings.encryption_key:
        raise ValueError("ENCRYPTION_KEY not set!")
    
    # 强制测试网检查
    if not settings.is_testnet:
        logger.warning("⚠️ is_testnet is False! Forcing testnet mode.")
    
    # 构建 Application
    application = (
        ApplicationBuilder()
        .token(settings.telegram_bot_token)
        .post_init(post_init)
        .post_shutdown(post_shutdown)
        .build()
    )
    
    # 注册命令处理器
    application.add_handler(CommandHandler("start", start_handler))
    application.add_handler(CommandHandler("help", help_handler))
    application.add_handler(CommandHandler("export", export_handler))
    application.add_handler(CommandHandler("upload", manual_upload_command))
    
    # 注册回调查询处理器 (分身选择)
    application.add_handler(
        CallbackQueryHandler(selection_handler, pattern="^select:")
    )
    
    # 处理 export 相关的回调 (refresh, cancel)
    application.add_handler(
        CallbackQueryHandler(selection_handler, pattern="^refresh:")
    )
    application.add_handler(
        CallbackQueryHandler(selection_handler, pattern="^cancel:")
    )
    application.add_handler(
        CallbackQueryHandler(selection_handler, pattern="^upload:")
    )
    
    # 注册文件上传处理器 (JSON 文件)
    application.add_handler(
        MessageHandler(
            filters.Document.FileExtension("json"),
            upload_handler
        )
    )
    
    # 注册错误处理器
    application.add_error_handler(error_handler)
    
    return application


async def post_init(application: Application) -> None:
    """Bot 启动后初始化"""
    logger.info("=" * 50)
    logger.info("FeralLobster Bot Started!")
    logger.info("=" * 50)
    logger.info(f"Bot Username: @{application.bot.username}")
    logger.info(f"Network: {settings.network_display}")
    logger.info(f"Platform API: {settings.platform_api_url}")
    logger.info(f"Base Sepolia RPC: {settings.base_sepolia_rpc}")
    logger.info("=" * 50)
    
    # 设置 Bot 命令菜单
    commands = [
        ("start", "开始使用"),
        ("help", "获取帮助"),
        ("export", "导出分身记忆"),
        ("upload", "上传 JSON 文件"),
    ]
    await application.bot.set_my_commands(commands)
    logger.info("Bot commands registered")


async def post_shutdown(application: Application) -> None:
    """Bot 关闭时清理"""
    logger.info("=" * 50)
    logger.info("FeralLobster Bot Stopped")
    logger.info("=" * 50)


async def main() -> None:
    """主入口函数"""
    try:
        application = create_application()
        
        logger.info("Starting polling...")
        await application.initialize()
        await application.start()
        await application.updater.start_polling(drop_pending_updates=True)
        
        # 保持运行
        await asyncio.Event().wait()
        
    except KeyboardInterrupt:
        logger.info("Received keyboard interrupt, shutting down...")
    except Exception as e:
        logger.exception(f"Fatal error: {e}")
        raise
    finally:
        if 'application' in locals():
            await application.updater.stop()
            await application.stop()
            await application.shutdown()


if __name__ == "__main__":
    # Windows 事件循环策略
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Bot stopped by user")
        sys.exit(0)
