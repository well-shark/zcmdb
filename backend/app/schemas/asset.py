from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, date


class TagBase(BaseModel):
    key: str
    value: str


class TagCreate(TagBase):
    pass


class Tag(TagBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class CredentialBase(BaseModel):
    credential_type: str
    key: str
    description: Optional[str] = None


class CredentialCreate(CredentialBase):
    value: str  # 明文，后端会加密


class Credential(CredentialBase):
    id: int
    asset_id: Optional[int] = None
    value: Optional[str] = None  # 管理员可见明文，普通用户为None
    value_encrypted: Optional[str] = None  # 加密值
    created_at: datetime
    
    class Config:
        from_attributes = True


class AssetBase(BaseModel):
    name: str
    description: Optional[str] = None


class AssetCreate(AssetBase):
    asset_type: str
    tag_ids: Optional[List[int]] = None
    credentials: Optional[List[CredentialCreate]] = None


class AssetUpdate(AssetBase):
    pass


class Asset(AssetBase):
    id: int
    asset_type: str
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    tags: List[Tag] = []
    credentials: Optional[List[Credential]] = None
    
    class Config:
        from_attributes = True


# 服务器资产
class NetworkInterfaceBase(BaseModel):
    ip_address: Optional[str] = None
    mac_address: Optional[str] = None
    purpose: Optional[str] = None


class NetworkInterfaceCreate(NetworkInterfaceBase):
    pass


class NetworkInterface(NetworkInterfaceBase):
    id: int
    server_id: int
    
    class Config:
        from_attributes = True


class ServerAssetCreate(AssetCreate):
    asset_type: str = "server"
    purpose: Optional[str] = None
    cpu: Optional[str] = None
    memory: Optional[str] = None
    public_ipv4: Optional[str] = None
    private_ipv4: Optional[str] = None
    cpu_architecture: Optional[str] = None
    platform: Optional[str] = None
    os_name: Optional[str] = None
    os_version: Optional[str] = None
    ssh_port: int = 22
    notes: Optional[str] = None
    network_interfaces: Optional[List[NetworkInterfaceCreate]] = None


class ServerAsset(Asset):
    purpose: Optional[str] = None
    cpu: Optional[str] = None
    memory: Optional[str] = None
    public_ipv4: Optional[str] = None
    private_ipv4: Optional[str] = None
    cpu_architecture: Optional[str] = None
    platform: Optional[str] = None
    os_name: Optional[str] = None
    os_version: Optional[str] = None
    ssh_port: int = 22
    notes: Optional[str] = None
    network_interfaces: List[NetworkInterface] = []
    
    class Config:
        from_attributes = True


# 云资源
class CloudAccountBase(BaseModel):
    cloud_provider: str
    account_name: str
    phone: Optional[str] = None
    balance: Optional[float] = None
    notes: Optional[str] = None


class CloudAccountCreate(CloudAccountBase):
    password: Optional[str] = None  # 明文，后端会加密


class CloudAccount(CloudAccountBase):
    id: int
    password: Optional[str] = None  # 管理员可见明文，普通用户为None
    password_encrypted: Optional[str] = None
    created_at: datetime
    access_keys: Optional[List["CloudAccessKey"]] = []
    
    class Config:
        from_attributes = True


class CloudAccessKeyBase(BaseModel):
    access_key: str
    assigned_to: Optional[str] = None
    description: Optional[str] = None


class CloudAccessKeyCreate(CloudAccessKeyBase):
    secret_key: str  # 明文，后端会加密


class CloudAccessKey(CloudAccessKeyBase):
    id: int
    cloud_account_id: int
    secret_key: Optional[str] = None  # 管理员可见明文，普通用户为None
    secret_key_encrypted: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class CloudAssetCreate(AssetCreate):
    asset_type: str = "cloud"
    cloud_account_id: Optional[int] = None
    instance_id: Optional[str] = None
    instance_name: Optional[str] = None
    region: Optional[str] = None
    zone: Optional[str] = None
    public_ipv4: Optional[str] = None
    private_ipv4: Optional[str] = None
    ipv6: Optional[str] = None
    instance_type: Optional[str] = None
    cpu: Optional[str] = None
    memory: Optional[str] = None
    disk_space: Optional[str] = None
    os_name: Optional[str] = None
    os_version: Optional[str] = None
    bandwidth: Optional[str] = None
    bandwidth_billing_mode: Optional[str] = None
    ssh_port: int = 22
    purchase_date: Optional[date] = None
    expires_at: Optional[datetime] = None
    payment_method: Optional[str] = None
    notes: Optional[str] = None


class CloudAsset(Asset):
    cloud_account_id: Optional[int] = None
    instance_id: Optional[str] = None
    instance_name: Optional[str] = None
    region: Optional[str] = None
    zone: Optional[str] = None
    public_ipv4: Optional[str] = None
    private_ipv4: Optional[str] = None
    ipv6: Optional[str] = None
    instance_type: Optional[str] = None
    cpu: Optional[str] = None
    memory: Optional[str] = None
    disk_space: Optional[str] = None
    os_name: Optional[str] = None
    os_version: Optional[str] = None
    bandwidth: Optional[str] = None
    bandwidth_billing_mode: Optional[str] = None
    ssh_port: int = 22
    purchase_date: Optional[date] = None
    expires_at: Optional[datetime] = None
    payment_method: Optional[str] = None
    notes: Optional[str] = None
    
    class Config:
        from_attributes = True


# 软件授权
class SoftwareAssetCreate(AssetCreate):
    asset_type: str = "software"
    software_name: str
    login_url: Optional[str] = None
    login_account: Optional[str] = None
    phone: Optional[str] = None
    license_type: Optional[str] = None
    license_file_path: Optional[str] = None
    license_code: Optional[str] = None  # 明文，后端会加密
    notes: Optional[str] = None


class SoftwareAsset(Asset):
    software_name: str
    login_url: Optional[str] = None
    login_account: Optional[str] = None
    phone: Optional[str] = None
    license_type: Optional[str] = None
    license_file_path: Optional[str] = None
    license_code_encrypted: Optional[str] = None
    notes: Optional[str] = None
    
    class Config:
        from_attributes = True


# 内部系统
class SystemAssetCreate(AssetCreate):
    asset_type: str = "system"
    ip_address: Optional[str] = None  # 非必填
    port: Optional[int] = None  # 非必填
    default_account: Optional[str] = None  # 默认账号
    default_password: Optional[str] = None  # 默认密码（明文，后端会加密）
    login_url: Optional[str] = None
    notes: Optional[str] = None


class SystemAsset(Asset):
    ip_address: Optional[str] = None
    port: Optional[int] = None
    default_account: Optional[str] = None
    default_password: Optional[str] = None  # 管理员可见明文，普通用户为None
    default_password_encrypted: Optional[str] = None  # 加密值
    login_url: Optional[str] = None
    notes: Optional[str] = None
    
    class Config:
        from_attributes = True


# 数据库
class DatabaseAssetCreate(AssetCreate):
    asset_type: str = "database"
    db_type: str
    host: str
    port: int  # 主端口
    ports: Optional[List[Dict[str, Any]]] = None  # 多端口数据，格式：[{"name": "HTTP", "port": 8123}]
    databases: Optional[List[str]] = None
    quota: Optional[str] = None
    notes: Optional[str] = None


class DatabaseAsset(Asset):
    db_type: str
    host: str
    port: int
    ports: Optional[List[Dict[str, Any]]] = None
    databases: Optional[List[str]] = None
    quota: Optional[str] = None
    notes: Optional[str] = None
    
    class Config:
        from_attributes = True


# 硬件资产
class HardwareAssetCreate(AssetCreate):
    asset_type: str = "hardware"
    hardware_type: str
    brand: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    purchase_date: Optional[date] = None
    purchase_price: Optional[float] = None
    responsible_person: Optional[str] = None  # 责任人
    user: Optional[str] = None  # 使用人
    usage_area: Optional[str] = None  # 使用区域
    notes: Optional[str] = None


class HardwareAsset(Asset):
    hardware_type: str
    brand: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    purchase_date: Optional[date] = None
    purchase_price: Optional[float] = None
    responsible_person: Optional[str] = None
    user: Optional[str] = None
    usage_area: Optional[str] = None
    notes: Optional[str] = None
    
    class Config:
        from_attributes = True


# 批量导入
class BatchImportRequest(BaseModel):
    asset_type: str
    data: List[Dict[str, Any]]


# 分页响应
class PaginatedResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[Any]

