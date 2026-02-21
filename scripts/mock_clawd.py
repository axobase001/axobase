#!/usr/bin/env python3
"""
Mock ClawdBot - 模拟本地 Bot 用于测试

此脚本模拟本地 ClawdBot 的行为，响应 Telegram Bot 的导出命令。
用于本地测试，无需部署真实的本地 Bot。

⚠️ Base Sepolia Testnet Only
"""

import json
import base64
import argparse
from pathlib import Path
from typing import Tuple

try:
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import rsa, padding
    from cryptography.hazmat.backends import default_backend
except ImportError:
    print("❌ 请先安装依赖: pip install cryptography")
    raise


def generate_keypair() -> Tuple[str, object]:
    """生成 RSA 密钥对"""
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048,
        backend=default_backend()
    )
    
    public_key = private_key.public_key()
    pub_key_pem = public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    ).decode('utf-8')
    
    return pub_key_pem, private_key


def encrypt_with_public_key(pub_key_pem: str, plaintext: str) -> bytes:
    """使用公钥加密"""
    public_key = serialization.load_pem_public_key(
        pub_key_pem.encode('utf-8'),
        backend=default_backend()
    )
    
    encrypted = public_key.encrypt(
        plaintext.encode('utf-8'),
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None
        )
    )
    
    return encrypted


def load_mock_memory() -> dict:
    """加载模拟记忆文件"""
    mock_file = Path(__file__).parent.parent / "mock" / "clawd_memory.json"
    
    if not mock_file.exists():
        print(f"❌ Mock memory file not found: {mock_file}")
        print("Creating default mock memory...")
        
        # 创建默认模拟数据
        default_memory = {
            "instance_id": "mock-test-001",
            "personality": {
                "name": "MockLobster",
                "traits": ["sarcastic", "helpful"]
            },
            "messages": [
                {"role": "user", "content": "Hello"},
                {"role": "assistant", "content": "Hi there! I'm a mock bot for testing."}
            ]
        }
        
        mock_file.parent.mkdir(exist_ok=True)
        with open(mock_file, 'w') as f:
            json.dump(default_memory, f, indent=2)
        
        return default_memory
    
    with open(mock_file, 'r') as f:
        return json.load(f)


def simulate_export(session_id: str, public_key: str) -> dict:
    """
    模拟导出流程
    
    Args:
        session_id: 会话 ID (来自 Telegram Bot)
        public_key: RSA 公钥 (PEM 格式)
    
    Returns:
        包含加密数据的响应
    """
    print(f"📤 Processing export request...")
    print(f"   Session ID: {session_id[:16]}...")
    print(f"   Public Key: {public_key[:50]}...")
    
    # 加载模拟记忆
    memory = load_mock_memory()
    memory_json = json.dumps(memory)
    
    print(f"   Memory size: {len(memory_json)} bytes")
    
    # 使用公钥加密
    try:
        encrypted_data = encrypt_with_public_key(public_key, memory_json)
        encrypted_b64 = base64.b64encode(encrypted_data).decode('utf-8')
        
        print(f"   Encrypted size: {len(encrypted_data)} bytes")
        print(f"   Base64 length: {len(encrypted_b64)} chars")
        
        return {
            "status": "success",
            "session_id": session_id,
            "instances": [
                {
                    "instance_id": memory["instance_id"],
                    "name": memory["personality"]["name"],
                    "size_mb": len(memory_json) / 1024 / 1024,
                    "message_count": len(memory.get("messages", [])),
                    "encrypted_data": encrypted_b64[:100] + "..."
                }
            ],
            "full_encrypted_data": encrypted_b64
        }
    
    except Exception as e:
        print(f"❌ Encryption failed: {e}")
        return {
            "status": "error",
            "error": str(e)
        }


def interactive_mode():
    """交互模式"""
    print("=" * 60)
    print("🦞 Mock ClawdBot - 本地测试工具")
    print("⚠️ Base Sepolia Testnet Only")
    print("=" * 60)
    print()
    print("使用方法:")
    print("  1. 在 Telegram Bot 发送 /export")
    print("  2. 复制收到的命令")
    print("  3. 在此终端粘贴执行")
    print("  4. 将返回的数据发送给 Telegram Bot")
    print()
    print("命令格式:")
    print("  /generate_export <session_id> <public_key>")
    print()
    print("输入 'quit' 退出")
    print("=" * 60)
    print()
    
    while True:
        try:
            user_input = input("\n> ").strip()
            
            if user_input.lower() in ['quit', 'exit', 'q']:
                print("👋 Goodbye!")
                break
            
            if not user_input:
                continue
            
            # 解析命令
            if user_input.startswith('/generate_export'):
                parts = user_input.split(' ', 2)
                
                if len(parts) != 3:
                    print("❌ Invalid format. Use: /generate_export <session_id> <public_key>")
                    continue
                
                _, session_id, public_key = parts
                
                # 执行导出
                result = simulate_export(session_id, public_key)
                
                if result["status"] == "success":
                    print("\n✅ Export successful!")
                    print(f"\nInstance: {result['instances'][0]['name']}")
                    print(f"Size: {result['instances'][0]['size_mb']:.2f} MB")
                    print(f"Messages: {result['instances'][0]['message_count']}")
                    print("\n📋 Encrypted data (copy this to Telegram):")
                    print("-" * 60)
                    # 保存完整加密数据到文件，方便复制
                    output_file = Path("encrypted_export.txt")
                    with open(output_file, 'w') as f:
                        f.write(result['full_encrypted_data'])
                    print(f"[Saved to {output_file}]")
                    print(result['instances'][0]['encrypted_data'][:500])
                    print("-" * 60)
                else:
                    print(f"❌ Error: {result.get('error', 'Unknown error')}")
            
            else:
                print(f"Unknown command: {user_input}")
                print("Available commands: /generate_export, quit")
        
        except KeyboardInterrupt:
            print("\n\n👋 Goodbye!")
            break
        except Exception as e:
            print(f"❌ Error: {e}")


def main():
    """主入口"""
    parser = argparse.ArgumentParser(
        description='Mock ClawdBot for FeralLobster testing'
    )
    parser.add_argument(
        '--session-id',
        help='Session ID from Telegram Bot'
    )
    parser.add_argument(
        '--public-key',
        help='RSA public key (PEM format)'
    )
    parser.add_argument(
        '--full-output',
        action='store_true',
        help='Output full encrypted data'
    )
    parser.add_argument(
        '--interactive',
        '-i',
        action='store_true',
        help='Run in interactive mode (default)'
    )
    
    args = parser.parse_args()
    
    if args.session_id and args.public_key:
        # 命令行模式
        result = simulate_export(args.session_id, args.public_key)
        
        if result["status"] == "success":
            if args.full_output:
                print(result['instances'][0]['full_encrypted_data'])
            else:
                print(json.dumps(result, indent=2))
        else:
            print(f"Error: {result.get('error')}")
            exit(1)
    else:
        # 交互模式
        interactive_mode()


if __name__ == "__main__":
    main()
