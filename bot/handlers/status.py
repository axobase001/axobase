"""
Status Handler - /status 命令处理

用户查询已部署代理的状态
"""

import logging
import aiohttp
from telegram import Update
from telegram.ext import ContextTypes

from config import settings

logger = logging.getLogger(__name__)


async def status_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """
    处理 /status 命令
    
    查询用户已部署的代理状态
    """
    user = update.effective_user
    
    await update.message.reply_text(
        "🔄 正在查询您的代理状态..."
    )
    
    try:
        # 从编排服务获取用户代理列表
        url = f"{settings.orchestrator_api}/api/v1/agents"
        headers = {'X-API-Key': settings.orchestrator_api_key}
        params = {'telegram_user_id': user.id}
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=headers, params=params) as resp:
                if resp.status == 200:
                    agents = await resp.json()
                    
                    if not agents:
                        await update.message.reply_text(
                            "📭 *暂无代理*\n"
                            "\n"
                            "您还没有部署任何 AI 代理。\n"
                            "使用 /export 开始放养流程。",
                            parse_mode='Markdown'
                        )
                        return
                    
                    # 构建状态消息
                    message = "🧬 *您的 AI 代理*\n\n"
                    
                    for agent in agents:
                        status_emoji = _get_status_emoji(agent['status'])
                        message += (
                            f"{status_emoji} *GeneHash*: `{agent['gene_hash'][:16]}...`\n"
                            f"   状态: {agent['status']}\n"
                            f"   余额: {agent.get('balance_usdc', 0)} USDC\n"
                            f"   存活: {agent.get('survival_days', 0)} 天\n"
                            f"   [查看详情](https://axobase.io/observatory/{agent['gene_hash']})\n"
                            f"\n"
                        )
                    
                    await update.message.reply_text(
                        message,
                        parse_mode='Markdown',
                        disable_web_page_preview=True
                    )
                    
                else:
                    await update.message.reply_text(
                        "❌ 查询失败，请稍后重试。"
                    )
                    
    except Exception as e:
        logger.error(f"Status query failed: {e}")
        await update.message.reply_text(
            "❌ 查询服务暂时不可用。\n"
            f"错误: {str(e)[:100]}"
        )


def _get_status_emoji(status: str) -> str:
    """根据状态返回表情符号"""
    status_map = {
        'alive': '🟢',
        'hibernating': '💤',
        'emergency': '🔴',
        'dead': '⚫',
        'unborn': '⚪',
    }
    return status_map.get(status.lower(), '⚪')
