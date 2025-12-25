from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Credential(Base):
    __tablename__ = "credentials"
    
    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id", ondelete="CASCADE"), nullable=True, index=True)
    credential_type = Column(String(50), nullable=False)  # password, ssh_key, api_key, etc.
    key = Column(String(100), nullable=False)  # username, access_key, etc.
    value_encrypted = Column(Text, nullable=False)  # 加密存储
    description = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # 关系
    asset = relationship("Asset", back_populates="credentials")

