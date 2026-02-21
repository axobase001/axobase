"""
FeralLobster Bot 加密工具模块
用于生成会话密钥和解密本地 Bot 数据
"""

import base64
from typing import Tuple
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.backends import default_backend
from cryptography.exceptions import InvalidSignature


def generate_session_keys() -> Tuple[str, object]:
    """
    生成 RSA 密钥对用于会话加密
    
    Returns:
        Tuple[pub_key_pem: str, priv_key_obj: RSAPrivateKey]
        - pub_key_pem: PEM 格式的公钥字符串
        - priv_key_obj: 私钥对象 (用于后续解密)
    
    Example:
        >>> pub_pem, priv_key = generate_session_keys()
        >>> print(pub_pem[:50])  # -----BEGIN PUBLIC KEY-----
    """
    # 生成 2048 位 RSA 密钥对
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048,
        backend=default_backend()
    )
    
    # 序列化公钥为 PEM 格式
    public_key = private_key.public_key()
    pub_key_pem = public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    ).decode('utf-8')
    
    return pub_key_pem, private_key


def decrypt_with_session_key(private_key: object, encrypted_data: bytes) -> str:
    """
    使用 RSA 私钥解密数据
    
    Args:
        private_key: RSA 私钥对象 (来自 generate_session_keys)
        encrypted_data: base64 编码的加密数据
    
    Returns:
        解密后的明文字符串
    
    Raises:
        ValueError: 解密失败
    
    Example:
        >>> plaintext = decrypt_with_session_key(priv_key, encrypted_b64)
    """
    try:
        # 如果是 base64 字符串，先解码
        if isinstance(encrypted_data, str):
            encrypted_bytes = base64.b64decode(encrypted_data)
        else:
            encrypted_bytes = encrypted_data
        
        # 使用 OAEP 填充解密
        decrypted = private_key.decrypt(
            encrypted_bytes,
            padding.OAEP(
                mgf=padding.MGF1(algorithm=hashes.SHA256()),
                algorithm=hashes.SHA256(),
                label=None
            )
        )
        
        return decrypted.decode('utf-8')
    
    except Exception as e:
        raise ValueError(f"解密失败: {str(e)}")


def encrypt_with_public_key(pub_key_pem: str, plaintext: str) -> bytes:
    """
    使用公钥加密数据 (用于测试)
    
    Args:
        pub_key_pem: PEM 格式公钥
        plaintext: 要加密的明文
    
    Returns:
        加密后的字节数据
    """
    # 加载公钥
    public_key = serialization.load_pem_public_key(
        pub_key_pem.encode('utf-8'),
        backend=default_backend()
    )
    
    # 加密
    encrypted = public_key.encrypt(
        plaintext.encode('utf-8'),
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None
        )
    )
    
    return encrypted


def serialize_private_key(private_key: object) -> str:
    """
    将私钥序列化为 PEM 字符串 (用于缓存存储)
    
    Args:
        private_key: RSA 私钥对象
    
    Returns:
        PEM 格式私钥字符串
    """
    return private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()
    ).decode('utf-8')


def deserialize_private_key(pem_str: str) -> object:
    """
    从 PEM 字符串加载私钥
    
    Args:
        pem_str: PEM 格式私钥字符串
    
    Returns:
        RSA 私钥对象
    """
    return serialization.load_pem_private_key(
        pem_str.encode('utf-8'),
        password=None,
        backend=default_backend()
    )
