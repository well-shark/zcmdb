import base64
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from app.config import settings


def get_encryption_key() -> bytes:
    """获取加密密钥"""
    # 如果配置了密钥，使用配置的密钥
    if settings.ENCRYPTION_KEY and len(settings.ENCRYPTION_KEY) > 0:
        try:
            # 尝试解码base64密钥
            return base64.urlsafe_b64decode(settings.ENCRYPTION_KEY.encode())
        except:
            # 如果解码失败，使用密钥生成器
            pass
    
    # 使用默认密钥（生产环境必须配置）
    password = settings.ENCRYPTION_KEY.encode() if settings.ENCRYPTION_KEY else b"default-key-change-in-production"
    salt = b"zcmdb-salt"  # 生产环境应该使用随机salt
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=100000,
    )
    key = base64.urlsafe_b64encode(kdf.derive(password))
    return key


_fernet = Fernet(get_encryption_key())


def encrypt_value(value: str) -> str:
    """加密值"""
    if not value:
        return ""
    encrypted = _fernet.encrypt(value.encode())
    return base64.urlsafe_b64encode(encrypted).decode()


def decrypt_value(encrypted_value: str) -> str:
    """解密值"""
    if not encrypted_value:
        return ""
    try:
        encrypted_bytes = base64.urlsafe_b64decode(encrypted_value.encode())
        decrypted = _fernet.decrypt(encrypted_bytes)
        return decrypted.decode()
    except Exception as e:
        raise ValueError(f"解密失败: {str(e)}")

