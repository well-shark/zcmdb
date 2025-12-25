from sqlalchemy import Column, Integer, String, Text, ForeignKey
from sqlalchemy.dialects.postgresql import INET
from app.database import Base


class SystemAsset(Base):
    __tablename__ = "system_assets"
    
    id = Column(Integer, ForeignKey("assets.id", ondelete="CASCADE"), primary_key=True)
    system_type = Column(String(100))  # Git, 禅道, etc.
    ip_address = Column(INET)
    port = Column(Integer)
    login_url = Column(String(500))
    notes = Column(Text)

