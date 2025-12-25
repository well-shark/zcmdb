from sqlalchemy import Column, Integer, String, Text, ForeignKey, JSON
from app.database import Base


class DatabaseAsset(Base):
    __tablename__ = "database_assets"
    
    id = Column(Integer, ForeignKey("assets.id", ondelete="CASCADE"), primary_key=True)
    db_type = Column(String(50), nullable=False)  # MySQL, PostgreSQL, MongoDB, etc.
    host = Column(String(200), nullable=False)
    port = Column(Integer, nullable=False)  # 主端口
    ports = Column(JSON)  # 多端口数据，格式：[{"name": "HTTP", "port": 8123}, {"name": "Native", "port": 9000}]
    databases = Column(JSON)  # 多个数据库名称数组
    quota = Column(String(100))
    notes = Column(Text)

