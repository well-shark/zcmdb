from sqlalchemy import Column, Integer, String, Text, ForeignKey
from sqlalchemy.dialects.postgresql import INET
from sqlalchemy.orm import relationship
from app.database import Base


class ServerAsset(Base):
    __tablename__ = "server_assets"
    
    id = Column(Integer, ForeignKey("assets.id", ondelete="CASCADE"), primary_key=True)
    purpose = Column(String(200))
    cpu = Column(String(100))
    memory = Column(String(100))
    public_ipv4 = Column(INET)
    private_ipv4 = Column(INET)
    cpu_architecture = Column(String(50))
    platform = Column(String(20))  # Linux, Windows
    os_name = Column(String(100))
    os_version = Column(String(100))
    ssh_port = Column(Integer, default=22)
    notes = Column(Text)
    
    # 关系
    network_interfaces = relationship("NetworkInterface", back_populates="server", cascade="all, delete-orphan")


class NetworkInterface(Base):
    __tablename__ = "network_interfaces"
    
    id = Column(Integer, primary_key=True, index=True)
    server_id = Column(Integer, ForeignKey("server_assets.id", ondelete="CASCADE"), nullable=False, index=True)
    ip_address = Column(INET)
    mac_address = Column(String(17))
    purpose = Column(String(200))
    
    # 关系
    server = relationship("ServerAsset", back_populates="network_interfaces")

