from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Asset(Base):
    __tablename__ = "assets"
    
    id = Column(Integer, primary_key=True, index=True)
    asset_type = Column(String(50), nullable=False, index=True)
    name = Column(String(200), nullable=False, index=True)
    description = Column(Text)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # 关系
    tags = relationship("Tag", secondary="asset_tags", back_populates="assets")
    credentials = relationship("Credential", back_populates="asset", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="asset", cascade="all, delete-orphan")

