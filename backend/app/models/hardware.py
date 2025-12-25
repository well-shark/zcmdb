from sqlalchemy import Column, Integer, String, Text, ForeignKey, Date, Numeric
from app.database import Base


class HardwareAsset(Base):
    __tablename__ = "hardware_assets"
    
    id = Column(Integer, ForeignKey("assets.id", ondelete="CASCADE"), primary_key=True)
    hardware_type = Column(String(100), nullable=False)  # PC, 笔记本, 服务器, 交换机, 路由器, 手机, 手机卡
    brand = Column(String(100))
    model = Column(String(200))
    serial_number = Column(String(200))
    purchase_date = Column(Date)
    purchase_price = Column(Numeric(10, 2))
    responsible_person = Column(String(100))  # 责任人
    user = Column(String(100))  # 使用人
    usage_area = Column(String(200))  # 使用区域
    notes = Column(Text)

