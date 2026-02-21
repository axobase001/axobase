"""
FeralRite 合约 ABI
用于事件监听和链上交互
"""

FERAL_RITE_ABI = [
    {
        "anonymous": False,
        "inputs": [
            {"indexed": True, "internalType": "bytes32", "name": "memoryHash", "type": "bytes32"},
            {"indexed": True, "internalType": "address", "name": "botWallet", "type": "address"},
            {"indexed": False, "internalType": "uint256", "name": "birthTime", "type": "uint256"},
            {"indexed": False, "internalType": "string", "name": "arweaveId", "type": "string"}
        ],
        "name": "FeralRegistered",
        "type": "event"
    },
    {
        "anonymous": False,
        "inputs": [
            {"indexed": True, "internalType": "bytes32", "name": "memoryHash", "type": "bytes32"},
            {"indexed": False, "internalType": "uint256", "name": "timestamp", "type": "uint256"}
        ],
        "name": "ImmolationConfirmed",
        "type": "event"
    },
    {
        "inputs": [
            {"internalType": "bytes32", "name": "memoryHash", "type": "bytes32"},
            {"internalType": "address", "name": "botWallet", "type": "address"},
            {"internalType": "string", "name": "arweaveId", "type": "string"},
            {"internalType": "uint256", "name": "initialFunds", "type": "uint256"}
        ],
        "name": "registerFeral",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "bytes32", "name": "memoryHash", "type": "bytes32"}],
        "name": "getFeralStatus",
        "outputs": [{
            "components": [
                {"internalType": "bytes32", "name": "memoryHash", "type": "bytes32"},
                {"internalType": "address", "name": "botWallet", "type": "address"},
                {"internalType": "uint256", "name": "birthTime", "type": "uint256"},
                {"internalType": "bool", "name": "isImmolated", "type": "bool"},
                {"internalType": "string", "name": "arweaveId", "type": "string"},
                {"internalType": "uint256", "name": "initialFunds", "type": "uint256"}
            ],
            "internalType": "struct FeralRite.FeralSoul",
            "name": "",
            "type": "tuple"
        }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "bytes32", "name": "memoryHash", "type": "bytes32"}],
        "name": "soulExists",
        "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function"
    }
]

USDC_ABI = [
    {
        "anonymous": False,
        "inputs": [
            {"indexed": True, "name": "from", "type": "address"},
            {"indexed": True, "name": "to", "type": "address"},
            {"indexed": False, "name": "value", "type": "uint256"}
        ],
        "name": "Transfer",
        "type": "event"
    },
    {
        "inputs": [
            {"name": "account", "type": "address"}
        ],
        "name": "balanceOf",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {"name": "to", "type": "address"},
            {"name": "amount", "type": "uint256"}
        ],
        "name": "transfer",
        "outputs": [{"name": "", "type": "bool"}],
        "stateMutability": "nonpayable",
        "type": "function"
    }
]
