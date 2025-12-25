from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Date, Numeric
from sqlalchemy.dialects.postgresql import INET
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class CloudAccount(Base):
    __tablename__ = "cloud_accounts"
    
    id = Column(Integer, primary_key=True, index=True)
    cloud_provider = Column(String(50), nullable=False, index=True)  # aliyun, tencent, aws, etc.
    account_name = Column(String(200), nullable=False)
    password_encrypted = Column(Text)
    phone = Column(String(20))
    balance = Column(Numeric(10, 2))
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # 关系
    access_keys = relationship("CloudAccessKey", back_populates="cloud_account", cascade="all, delete-orphan")
    cloud_assets = relationship("CloudAsset", back_populates="cloud_account")


class CloudAccessKey(Base):
    __tablename__ = "cloud_access_keys"
    
    id = Column(Integer, primary_key=True, index=True)
    cloud_account_id = Column(Integer, ForeignKey("cloud_accounts.id", ondelete="CASCADE"), nullable=False, index=True)
    access_key = Column(String(200), nullable=False)
    secret_key_encrypted = Column(Text, nullable=False)
    assigned_to = Column(String(200))  # 分配给谁
    description = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # 关系
    cloud_account = relationship("CloudAccount", back_populates="access_keys")


class CloudAsset(Base):
    __tablename__ = "cloud_assets"
    
    id = Column(Integer, ForeignKey("assets.id", ondelete="CASCADE"), primary_key=True)
    cloud_account_id = Column(Integer, ForeignKey("cloud_accounts.id"), nullable=True, index=True)
    instance_id = Column(String(200), index=True)
    instance_name = Column(String(200))
    region = Column(String(100))
    zone = Column(String(100))
    public_ipv4 = Column(INET)
    private_ipv4 = Column(INET)
    ipv6 = Column(INET)
    instance_type = Column(String(100))
    cpu = Column(String(50))
    memory = Column(String(50))
    disk_space = Column(String(100))
    os_name = Column(String(100))
    os_version = Column(String(100))
    bandwidth = Column(String(50))
    bandwidth_billing_mode = Column(String(50))
    ssh_port = Column(Integer, default=22)
    purchase_date = Column(Date)
    expires_at = Column(DateTime(timezone=True), index=True)
    payment_method = Column(String(50))  # prepaid, postpaid
    notes = Column(Text)
    
    # 关系
    cloud_account = relationship("CloudAccount", back_populates="cloud_assets")

