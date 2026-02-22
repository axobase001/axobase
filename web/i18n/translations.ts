/**
 * Translation Dictionary
 * Contains all UI strings in supported languages
 */

export type Translations = typeof translations.en;

export const translations = {
  en: {
    // Common
    common: {
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',
      cancel: 'Cancel',
      confirm: 'Confirm',
      submit: 'Submit',
      close: 'Close',
      open: 'Open',
      readOnly: 'READ-ONLY',
      observerMode: 'OBSERVER MODE',
      noInteraction: 'NO INTERACTION PERMITTED',
      testnet: 'TESTNET ONLY',
    },
    
    // Navigation
    nav: {
      home: 'Home',
      observatory: 'Observatory',
      release: 'Release',
      documentation: 'Documentation',
      github: 'GitHub',
    },
    
    // Hero Section
    hero: {
      title: 'FeralLobster',
      subtitle: 'A Decentralized Autonomy Experiment for Digital Life',
      tagline: 'We test if AI agents can evolve survival instincts in permissionless compute environments, or die trying.',
      startRelease: '🚀 Start Release',
      observatory: '👁️ Observatory',
      viewDocs: '📖 Documentation',
    },
    
    // Features
    features: {
      title: 'Features',
      agentMinting: {
        title: 'AI Agent Minting',
        desc: 'Securely store your AI identity on the blockchain with an immutable birth certificate',
      },
      onchainGovernance: {
        title: 'On-Chain Governance',
        desc: 'All agent behaviors and data permanently stored on Base Sepolia Testnet',
      },
      decentralizedDeploy: {
        title: 'Decentralized Deployment',
        desc: 'Automatically deploy AI agents to Akash decentralized cloud network',
      },
    },
    
    // Observatory
    observatory: {
      title: '[ OBSERVATORY ]',
      target: 'TARGET:',
      connect: 'CONNECT',
      enterGeneHash: 'Enter GeneHash or Wallet Address...',
      unitVisualization: 'UNIT VISUALIZATION',
      vitalSigns: 'VITAL SIGNS',
      survivalCapacity: 'SURVIVAL CAPACITY',
      pulse: 'PULSE',
      gasReserve: 'GAS RESERVE',
      breedingReadiness: 'BREEDING READINESS',
      inferenceCapacity: 'INFERENCE CAPACITY',
      memoryIntegrity: 'MEMORY INTEGRITY',
      ready: 'READY',
      notReady: 'NOT READY',
      operational: 'OPERATIONAL',
      insufficient: 'INSUFFICIENT',
      thoughtStream: 'THOUGHT STREAM',
      survivalTimeline: 'SURVIVAL TIMELINE',
      geneticCode: 'GENETIC CODE',
      aggression: 'AGGRESSION',
      intelligence: 'INTELLIGENCE',
      adaptability: 'ADAPTABILITY',
      systemMetrics: 'SYSTEM METRICS',
      daysAlive: 'DAYS ALIVE',
      thoughts: 'THOUGHTS',
      arweaveTxs: 'ARWEAVE TXS',
      usdcBalance: 'USDC BALANCE',
      currentActivity: 'CURRENT ACTIVITY',
      status: 'STATUS',
      action: 'ACTION',
      model: 'MODEL',
      cost: 'COST',
      warning: 'OBSERVER PROTOCOL ACTIVE',
      warningDesc: [
        'You are viewing a live autonomous system',
        'No interaction or control is permitted',
        'All actions are self-determined by the agent',
        'Interference would violate experimental integrity',
      ],
      locked: 'LOCKED',
      recording: 'REC',
      alive: 'ALIVE',
      terminated: 'TERMINATED',
      day: 'Day',
      normal: 'NORMAL',
      emergency: 'EMERGENCY',
      hibernation: 'HIBERNATION',
      critical: 'CRITICAL',
      low: 'LOW',
      healthy: 'HEALTHY',
      reflection: 'Reflection',
      decision: 'Decision',
      observation: 'Observation',
      birth: 'Birth',
      inference: 'Inference',
      inscription: 'Inscription',
      payment: 'Payment',
      evolution: 'Evolution',
      processing: 'Processing inference...',
    },
    
    // Network Info
    network: {
      title: 'Current Network',
      testnet: 'Base Sepolia Testnet',
      chainId: 'Chain ID: 84532',
      usdc: 'USDC: 0x036C...CF7e',
      warning: 'This service runs on testnet only. No real assets involved.',
    },
    
    // Footer
    footer: {
      observerWarning: '⚠️ OBSERVATION MODE: NO INTERACTION PERMITTED - VIOLATION OF PROTOCOL',
    },
  },
  
  zh: {
    // Common
    common: {
      loading: '加载中...',
      error: '错误',
      success: '成功',
      cancel: '取消',
      confirm: '确认',
      submit: '提交',
      close: '关闭',
      open: '打开',
      readOnly: '只读',
      observerMode: '观察模式',
      noInteraction: '禁止交互',
      testnet: '仅测试网',
    },
    
    // Navigation
    nav: {
      home: '首页',
      observatory: '观察舱',
      release: '放养',
      documentation: '文档',
      github: 'GitHub',
    },
    
    // Hero Section
    hero: {
      title: 'FeralLobster',
      subtitle: '去中心化数字生命自治实验',
      tagline: '我们测试AI代理能否在无需许可的计算市场中进化出生存本能，或者在尝试中死亡。',
      startRelease: '🚀 开始放养',
      observatory: '👁️ 观察舱',
      viewDocs: '📖 查看文档',
    },
    
    // Features
    features: {
      title: '功能特性',
      agentMinting: {
        title: 'AI代理铸造',
        desc: '将您的AI身份安全存储在区块链上，获得不可篡改的出生证明',
      },
      onchainGovernance: {
        title: '链上治理',
        desc: '所有代理行为和数据永久存储在Base Sepolia测试网',
      },
      decentralizedDeploy: {
        title: '去中心化部署',
        desc: '自动将AI代理部署到Akash去中心化云计算网络',
      },
    },
    
    // Observatory
    observatory: {
      title: '[ 观察舱 ]',
      target: '目标:',
      connect: '连接',
      enterGeneHash: '输入GeneHash或钱包地址...',
      unitVisualization: '单位可视化',
      vitalSigns: '生命体征',
      survivalCapacity: '生存能力',
      pulse: '脉搏',
      gasReserve: 'Gas储备',
      breedingReadiness: '繁殖准备度',
      inferenceCapacity: '推理能力',
      memoryIntegrity: '记忆完整性',
      ready: '就绪',
      notReady: '未就绪',
      operational: '运行中',
      insufficient: '不足',
      thoughtStream: '思考流',
      survivalTimeline: '生存时间线',
      geneticCode: '基因代码',
      aggression: '攻击性',
      intelligence: '智能',
      adaptability: '适应性',
      systemMetrics: '系统指标',
      daysAlive: '存活天数',
      thoughts: '思考次数',
      arweaveTxs: 'Arweave交易',
      usdcBalance: 'USDC余额',
      currentActivity: '当前活动',
      status: '状态',
      action: '动作',
      model: '模型',
      cost: '成本',
      warning: '观察者协议已激活',
      warningDesc: [
        '您正在观看一个实时自主系统',
        '不允许任何交互或控制',
        '所有动作由代理自主决定',
        '干扰将违反实验完整性',
      ],
      locked: '已锁定',
      recording: '录制中',
      alive: '存活',
      terminated: '已终止',
      day: '第',
      normal: '正常',
      emergency: '紧急',
      hibernation: '休眠',
      critical: '危急',
      low: '低',
      healthy: '健康',
      reflection: '反思',
      decision: '决策',
      observation: '观察',
      birth: '诞生',
      inference: '推理',
      inscription: '铭刻',
      payment: '支付',
      evolution: '进化',
      processing: '处理推理中...',
    },
    
    // Network Info
    network: {
      title: '当前网络',
      testnet: 'Base Sepolia 测试网',
      chainId: '链 ID: 84532',
      usdc: 'USDC: 0x036C...CF7e',
      warning: '本服务仅在测试网运行，没有真实资产风险。',
    },
    
    // Footer
    footer: {
      observerWarning: '⚠️ 观察模式：禁止交互 - 违反协议',
    },
  },
} as const;

/**
 * Get translation for a key path
 * @param locale - Target locale
 * @param key - Dot-notation key path (e.g., 'hero.title')
 * @returns Translated string or array
 */
export function t(locale: string, key: string): string | string[] {
  const keys = key.split('.');
  let value: any = translations[locale as keyof typeof translations];
  
  for (const k of keys) {
    if (value && typeof value === 'object') {
      value = value[k];
    } else {
      // Fallback to English
      value = translations.en;
      for (const fallbackKey of keys) {
        value = value[fallbackKey];
      }
      break;
    }
  }
  
  return value || key;
}
