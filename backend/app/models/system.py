from sqlalchemy import Column, Integer, String, Text, ForeignKey
from sqlalchemy.dialects.postgresql import INET
from app.database import Base


class SystemAsset(Base):
    __tablename__ = "system_assets"
    
    id = Column(Integer, ForeignKey("assets.id", ondelete="CASCADE"), primary_key=True)
    ip_address = Column(INET)  # 非必填
    port = Column(Integer)  # 非必填
    default_account = Column(String(200))  # 默认账号
    default_password_encrypted = Column(Text)  # 默认密码（加密存储）
    login_url = Column(String(500))
    notes = Column(Text)

