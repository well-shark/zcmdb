from sqlalchemy import Column, Integer, String, Text, ForeignKey
from app.database import Base


class SoftwareAsset(Base):
    __tablename__ = "software_assets"
    
    id = Column(Integer, ForeignKey("assets.id", ondelete="CASCADE"), primary_key=True)
    software_name = Column(String(200), nullable=False)
    login_url = Column(String(500))
    login_account = Column(String(200))
    phone = Column(String(20))
    license_type = Column(String(50))  # file, code, subscription
    license_file_path = Column(String(500))
    license_code_encrypted = Column(Text)
    notes = Column(Text)

