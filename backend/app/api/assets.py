from typing import List, Optional, Dict, Any, Union
from fastapi import APIRouter, Depends, HTTPException, status, Query, Body, UploadFile, File
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func
import pandas as pd
import io
from datetime import datetime
from app.database import get_db
from app.models.asset import Asset
from app.models.tag import Tag, asset_tags
from app.models.credential import Credential
from app.models.server import ServerAsset, NetworkInterface
from app.models.cloud import CloudAsset, CloudAccount
from app.models.software import SoftwareAsset
from app.models.system import SystemAsset
from app.models.database import DatabaseAsset
from app.models.hardware import HardwareAsset
from app.schemas.asset import (
    AssetCreate, AssetUpdate, Asset as AssetSchema,
    ServerAssetCreate, ServerAsset as ServerAssetSchema,
    CloudAssetCreate, CloudAsset as CloudAssetSchema,
    SoftwareAssetCreate, SoftwareAsset as SoftwareAssetSchema,
    SystemAssetCreate, SystemAsset as SystemAssetSchema,
    DatabaseAssetCreate, DatabaseAsset as DatabaseAssetSchema,
    HardwareAssetCreate, HardwareAsset as HardwareAssetSchema,
    BatchImportRequest, Tag as TagSchema
)
from app.api.deps import get_current_active_user, get_current_admin_user
from app.models.user import User
from app.core.encryption import encrypt_value, decrypt_value

router = APIRouter(prefix="/assets", tags=["资产管理"])


def get_asset_by_type(asset_type: str, asset_id: int, db: Session):
    """根据资产类型获取资产扩展信息"""
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset or asset.asset_type != asset_type:
        return None, None
    
    # 根据类型查询扩展表
    if asset_type == "server":
        return asset, db.query(ServerAsset).filter(ServerAsset.id == asset_id).first()
    elif asset_type == "cloud":
        return asset, db.query(CloudAsset).filter(CloudAsset.id == asset_id).first()
    elif asset_type == "software":
        return asset, db.query(SoftwareAsset).filter(SoftwareAsset.id == asset_id).first()
    elif asset_type == "system":
        return asset, db.query(SystemAsset).filter(SystemAsset.id == asset_id).first()
    elif asset_type == "database":
        return asset, db.query(DatabaseAsset).filter(DatabaseAsset.id == asset_id).first()
    elif asset_type == "hardware":
        return asset, db.query(HardwareAsset).filter(HardwareAsset.id == asset_id).first()
    
    return asset, None


def build_asset_response(asset: Asset, extended_asset: Any, db: Session, current_user: User) -> dict:
    """构建资产响应数据"""
    result = {
        "id": asset.id,
        "asset_type": asset.asset_type,
        "name": asset.name,
        "description": asset.description,
        "created_by": asset.created_by,
        "created_at": asset.created_at,
        "updated_at": asset.updated_at,
        "tags": [TagSchema.model_validate(tag) for tag in asset.tags],
    }
    
    # 加载凭据（根据权限决定是否显示明文）
    credentials = db.query(Credential).filter(Credential.asset_id == asset.id).all()
    if current_user.is_admin:
        result["credentials"] = [
            {
                "id": c.id,
                "credential_type": c.credential_type,
                "key": c.key,
                "value": decrypt_value(c.value_encrypted),
                "description": c.description,
                "created_at": c.created_at
            }
            for c in credentials
        ]
    else:
        result["credentials"] = [
            {
                "id": c.id,
                "credential_type": c.credential_type,
                "key": c.key,
                "description": c.description,
                "created_at": c.created_at
            }
            for c in credentials
        ]
    
    # 根据类型加载扩展信息
    if asset.asset_type == "server" and extended_asset:
        server = extended_asset
        result.update({
            "purpose": server.purpose,
            "cpu": server.cpu,
            "memory": server.memory,
            "public_ipv4": str(server.public_ipv4) if server.public_ipv4 else None,
            "private_ipv4": str(server.private_ipv4) if server.private_ipv4 else None,
            "cpu_architecture": server.cpu_architecture,
            "platform": server.platform,
            "os_name": server.os_name,
            "os_version": server.os_version,
            "ssh_port": server.ssh_port,
            "notes": server.notes,
            "network_interfaces": [
                {
                    "id": ni.id,
                    "ip_address": str(ni.ip_address) if ni.ip_address else None,
                    "mac_address": ni.mac_address,
                    "purpose": ni.purpose
                }
                for ni in server.network_interfaces
            ]
        })
    elif asset.asset_type == "cloud" and extended_asset:
        cloud = extended_asset
        result.update({
            "cloud_account_id": cloud.cloud_account_id,
            "instance_id": cloud.instance_id,
            "instance_name": cloud.instance_name,
            "region": cloud.region,
            "zone": cloud.zone,
            "public_ipv4": str(cloud.public_ipv4) if cloud.public_ipv4 else None,
            "private_ipv4": str(cloud.private_ipv4) if cloud.private_ipv4 else None,
            "ipv6": str(cloud.ipv6) if cloud.ipv6 else None,
            "instance_type": cloud.instance_type,
            "cpu": cloud.cpu,
            "memory": cloud.memory,
            "disk_space": cloud.disk_space,
            "os_name": cloud.os_name,
            "os_version": cloud.os_version,
            "bandwidth": cloud.bandwidth,
            "bandwidth_billing_mode": cloud.bandwidth_billing_mode,
            "ssh_port": cloud.ssh_port,
            "purchase_date": cloud.purchase_date.isoformat() if cloud.purchase_date else None,
            "expires_at": cloud.expires_at.isoformat() if cloud.expires_at else None,
            "payment_method": cloud.payment_method,
            "notes": cloud.notes,
        })
    elif asset.asset_type == "software" and extended_asset:
        software = extended_asset
        result.update({
            "software_name": software.software_name,
            "login_url": software.login_url,
            "login_account": software.login_account,
            "phone": software.phone,
            "license_type": software.license_type,
            "license_file_path": software.license_file_path,
            "license_code_encrypted": software.license_code_encrypted if current_user.is_admin else None,
            "notes": software.notes,
        })
    elif asset.asset_type == "system" and extended_asset:
        system = extended_asset
        result.update({
            "ip_address": str(system.ip_address) if system.ip_address else None,
            "port": system.port,
            "default_account": system.default_account,
            "default_password": decrypt_value(system.default_password_encrypted) if system.default_password_encrypted and current_user.is_admin else None,
            "default_password_encrypted": system.default_password_encrypted if current_user.is_admin else None,
            "login_url": system.login_url,
            "notes": system.notes,
        })
    elif asset.asset_type == "database" and extended_asset:
        database = extended_asset
        result.update({
            "db_type": database.db_type,
            "host": database.host,
            "port": database.port,
            "ports": database.ports if database.ports else [],
            "databases": database.databases,
            "quota": database.quota,
            "notes": database.notes,
        })
    elif asset.asset_type == "hardware" and extended_asset:
        hardware = extended_asset
        result.update({
            "hardware_type": hardware.hardware_type,
            "brand": hardware.brand,
            "model": hardware.model,
            "serial_number": hardware.serial_number,
            "purchase_date": hardware.purchase_date.isoformat() if hardware.purchase_date else None,
            "purchase_price": float(hardware.purchase_price) if hardware.purchase_price else None,
            "responsible_person": hardware.responsible_person,
            "user": hardware.user,
            "usage_area": hardware.usage_area,
            "notes": hardware.notes,
        })
    
    return result


@router.get("/field-values", response_model=dict)
async def get_field_values(
    asset_type: str = Query(..., description="资产类型"),
    field: str = Query(..., description="字段名"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """获取指定资产类型和字段的所有已有值（用于自动完成）"""
    values = []
    
    if asset_type == "server":
        if field == "os_name":
            results = db.query(ServerAsset.os_name).filter(
                ServerAsset.os_name.isnot(None),
                ServerAsset.os_name != ""
            ).distinct().all()
            values = [r[0] for r in results if r[0]]
        elif field == "os_version":
            results = db.query(ServerAsset.os_version).filter(
                ServerAsset.os_version.isnot(None),
                ServerAsset.os_version != ""
            ).distinct().all()
            values = [r[0] for r in results if r[0]]
        elif field == "platform":
            results = db.query(ServerAsset.platform).filter(
                ServerAsset.platform.isnot(None),
                ServerAsset.platform != ""
            ).distinct().all()
            values = [r[0] for r in results if r[0]]
        elif field == "cpu_architecture":
            results = db.query(ServerAsset.cpu_architecture).filter(
                ServerAsset.cpu_architecture.isnot(None),
                ServerAsset.cpu_architecture != ""
            ).distinct().all()
            values = [r[0] for r in results if r[0]]
    
    elif asset_type == "cloud":
        if field == "os_name":
            results = db.query(CloudAsset.os_name).filter(
                CloudAsset.os_name.isnot(None),
                CloudAsset.os_name != ""
            ).distinct().all()
            values = [r[0] for r in results if r[0]]
        elif field == "os_version":
            results = db.query(CloudAsset.os_version).filter(
                CloudAsset.os_version.isnot(None),
                CloudAsset.os_version != ""
            ).distinct().all()
            values = [r[0] for r in results if r[0]]
        elif field == "region":
            results = db.query(CloudAsset.region).filter(
                CloudAsset.region.isnot(None),
                CloudAsset.region != ""
            ).distinct().all()
            values = [r[0] for r in results if r[0]]
        elif field == "zone":
            results = db.query(CloudAsset.zone).filter(
                CloudAsset.zone.isnot(None),
                CloudAsset.zone != ""
            ).distinct().all()
            values = [r[0] for r in results if r[0]]
        elif field == "instance_type":
            results = db.query(CloudAsset.instance_type).filter(
                CloudAsset.instance_type.isnot(None),
                CloudAsset.instance_type != ""
            ).distinct().all()
            values = [r[0] for r in results if r[0]]
    
    elif asset_type == "database":
        if field == "db_type":
            results = db.query(DatabaseAsset.db_type).filter(
                DatabaseAsset.db_type.isnot(None),
                DatabaseAsset.db_type != ""
            ).distinct().all()
            values = [r[0] for r in results if r[0]]
    
    elif asset_type == "system":
        if field == "system_type":
            results = db.query(SystemAsset.system_type).filter(
                SystemAsset.system_type.isnot(None),
                SystemAsset.system_type != ""
            ).distinct().all()
            values = [r[0] for r in results if r[0]]
    
    return {"values": sorted(set(values))}


@router.get("/expiring", response_model=dict)
async def get_expiring_assets(
    asset_type: str = Query("cloud", description="资产类型"),
    days: int = Query(7, ge=1, le=365, description="未来多少天内到期"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """获取即将到期的资产"""
    from datetime import datetime, timedelta
    
    if asset_type != "cloud":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="目前只支持查询云节点到期情况"
        )
    
    # 计算到期时间范围
    now = datetime.utcnow()
    end_date = now + timedelta(days=days)
    
    # 查询即将到期的云节点
    query = db.query(Asset, CloudAsset).join(
        CloudAsset, Asset.id == CloudAsset.id
    ).filter(
        Asset.asset_type == "cloud",
        CloudAsset.expires_at.isnot(None),
        CloudAsset.expires_at >= now,
        CloudAsset.expires_at <= end_date
    ).order_by(CloudAsset.expires_at.asc())
    
    assets = query.all()
    
    result = []
    for asset, cloud in assets:
        asset_dict = {
            "id": asset.id,
            "name": asset.name,
            "expires_at": cloud.expires_at.isoformat() if cloud.expires_at else None,
            "instance_id": cloud.instance_id,
            "instance_name": cloud.instance_name,
            "region": cloud.region,
            "public_ipv4": str(cloud.public_ipv4) if cloud.public_ipv4 else None,
        }
        result.append(asset_dict)
    
    return {
        "items": result,
        "total": len(result)
    }


@router.get("", response_model=dict)
async def get_assets(
    asset_type: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    tags: Optional[str] = None,  # 格式: key=value 或 key，多个用逗号分隔
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """获取资产列表"""
    query = db.query(Asset)
    
    if asset_type:
        query = query.filter(Asset.asset_type == asset_type)
    
    if search:
        query = query.filter(Asset.name.ilike(f"%{search}%"))
    
    # 标签筛选
    if tags:
        tag_filters = []
        for tag_str in tags.split(","):
            tag_str = tag_str.strip()
            if "=" in tag_str:
                key, value = tag_str.split("=", 1)
                tag = db.query(Tag).filter(Tag.key == key.strip(), Tag.value == value.strip()).first()
                if tag:
                    tag_filters.append(tag.id)
            else:
                # 只有key
                tags_by_key = db.query(Tag).filter(Tag.key == tag_str).all()
                tag_filters.extend([t.id for t in tags_by_key])
        
        if tag_filters:
            query = query.join(asset_tags).filter(asset_tags.c.tag_id.in_(tag_filters)).distinct()
    
    total = query.count()
    assets = query.order_by(Asset.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    
    # 加载标签和扩展信息
    items = []
    for asset in assets:
        db.refresh(asset, ["tags"])
        _, extended = get_asset_by_type(asset.asset_type, asset.id, db)
        item = build_asset_response(asset, extended, db, current_user)
        items.append(item)
    
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": items
    }


@router.get("/{asset_id}", response_model=dict)
async def get_asset(
    asset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """获取资产详情"""
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="资产不存在",
        )
    
    db.refresh(asset, ["tags"])
    _, extended = get_asset_by_type(asset.asset_type, asset.id, db)
    return build_asset_response(asset, extended, db, current_user)


@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_asset(
    asset_in: Union[
        ServerAssetCreate,
        CloudAssetCreate,
        SoftwareAssetCreate,
        SystemAssetCreate,
        DatabaseAssetCreate,
        HardwareAssetCreate
    ] = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """创建资产（管理员）"""
    # 创建基础资产
    asset = Asset(
        asset_type=asset_in.asset_type,
        name=asset_in.name,
        description=asset_in.description,
        created_by=current_user.id
    )
    db.add(asset)
    db.flush()  # 获取asset.id
    
    # 处理标签
    if asset_in.tag_ids:
        tags = db.query(Tag).filter(Tag.id.in_(asset_in.tag_ids)).all()
        asset.tags = tags
    
    # 处理凭据
    if asset_in.credentials:
        for cred_in in asset_in.credentials:
            credential = Credential(
                asset_id=asset.id,
                credential_type=cred_in.credential_type,
                key=cred_in.key,
                value_encrypted=encrypt_value(cred_in.value),
                description=cred_in.description
            )
            db.add(credential)
    
    # 根据类型创建扩展记录
    if asset_in.asset_type == "server" and isinstance(asset_in, ServerAssetCreate):
        server = ServerAsset(
            id=asset.id,
            purpose=asset_in.purpose,
            cpu=asset_in.cpu,
            memory=asset_in.memory,
            public_ipv4=asset_in.public_ipv4,
            private_ipv4=asset_in.private_ipv4,
            cpu_architecture=asset_in.cpu_architecture,
            platform=asset_in.platform,
            os_name=asset_in.os_name,
            os_version=asset_in.os_version,
            ssh_port=asset_in.ssh_port,
            notes=asset_in.notes
        )
        db.add(server)
        
        # 处理网卡
        if asset_in.network_interfaces:
            for ni_in in asset_in.network_interfaces:
                ni = NetworkInterface(
                    server_id=asset.id,
                    ip_address=ni_in.ip_address,
                    mac_address=ni_in.mac_address,
                    purpose=ni_in.purpose
                )
                db.add(ni)
    
    elif asset_in.asset_type == "cloud" and isinstance(asset_in, CloudAssetCreate):
        cloud = CloudAsset(
            id=asset.id,
            cloud_account_id=asset_in.cloud_account_id,
            instance_id=asset_in.instance_id,
            instance_name=asset_in.instance_name,
            region=asset_in.region,
            zone=asset_in.zone,
            public_ipv4=asset_in.public_ipv4,
            private_ipv4=asset_in.private_ipv4,
            ipv6=asset_in.ipv6,
            instance_type=asset_in.instance_type,
            cpu=asset_in.cpu,
            memory=asset_in.memory,
            disk_space=asset_in.disk_space,
            os_name=asset_in.os_name,
            os_version=asset_in.os_version,
            bandwidth=asset_in.bandwidth,
            bandwidth_billing_mode=asset_in.bandwidth_billing_mode,
            ssh_port=asset_in.ssh_port,
            purchase_date=asset_in.purchase_date,
            expires_at=asset_in.expires_at,
            payment_method=asset_in.payment_method,
            notes=asset_in.notes
        )
        db.add(cloud)
    
    elif asset_in.asset_type == "software" and isinstance(asset_in, SoftwareAssetCreate):
        software = SoftwareAsset(
            id=asset.id,
            software_name=asset_in.software_name,
            login_url=asset_in.login_url,
            login_account=asset_in.login_account,
            phone=asset_in.phone,
            license_type=asset_in.license_type,
            license_file_path=asset_in.license_file_path,
            license_code_encrypted=encrypt_value(asset_in.license_code) if asset_in.license_code else None,
            notes=asset_in.notes
        )
        db.add(software)
    
    elif asset_in.asset_type == "system" and isinstance(asset_in, SystemAssetCreate):
        system = SystemAsset(
            id=asset.id,
            ip_address=asset_in.ip_address,
            port=asset_in.port,
            default_account=asset_in.default_account,
            default_password_encrypted=encrypt_value(asset_in.default_password) if asset_in.default_password else None,
            login_url=asset_in.login_url,
            notes=asset_in.notes
        )
        db.add(system)
    
    elif asset_in.asset_type == "database" and isinstance(asset_in, DatabaseAssetCreate):
        database = DatabaseAsset(
            id=asset.id,
            db_type=asset_in.db_type,
            host=asset_in.host,
            port=asset_in.port,
            ports=asset_in.ports if asset_in.ports else None,
            databases=asset_in.databases,
            quota=asset_in.quota,
            notes=asset_in.notes
        )
        db.add(database)
    
    elif asset_in.asset_type == "hardware" and isinstance(asset_in, HardwareAssetCreate):
        hardware = HardwareAsset(
            id=asset.id,
            hardware_type=asset_in.hardware_type,
            brand=asset_in.brand,
            model=asset_in.model,
            serial_number=asset_in.serial_number,
            purchase_date=asset_in.purchase_date,
            purchase_price=asset_in.purchase_price,
            responsible_person=asset_in.responsible_person,
            user=asset_in.user,
            usage_area=asset_in.usage_area,
            notes=asset_in.notes
        )
        db.add(hardware)
    
    db.commit()
    db.refresh(asset)
    
    return {"id": asset.id, "message": "资产创建成功"}


@router.put("/{asset_id}", response_model=dict)
async def update_asset(
    asset_id: int,
    asset_in: Union[
        ServerAssetCreate,
        CloudAssetCreate,
        SoftwareAssetCreate,
        SystemAssetCreate,
        DatabaseAssetCreate,
        HardwareAssetCreate
    ] = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """更新资产（管理员）"""
    asset, extended = get_asset_by_type(asset_in.asset_type, asset_id, db)
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="资产不存在",
        )
    
    # 更新基础字段
    asset.name = asset_in.name
    asset.description = asset_in.description
    
    # 更新标签
    if asset_in.tag_ids is not None:
        tags = db.query(Tag).filter(Tag.id.in_(asset_in.tag_ids)).all()
        asset.tags = tags
    
    # 根据类型更新扩展信息
    if asset_in.asset_type == "server" and isinstance(asset_in, ServerAssetCreate) and extended:
        server = extended
        server.purpose = asset_in.purpose
        server.cpu = asset_in.cpu
        server.memory = asset_in.memory
        server.public_ipv4 = asset_in.public_ipv4
        server.private_ipv4 = asset_in.private_ipv4
        server.cpu_architecture = asset_in.cpu_architecture
        server.platform = asset_in.platform
        server.os_name = asset_in.os_name
        server.os_version = asset_in.os_version
        server.ssh_port = asset_in.ssh_port
        server.notes = asset_in.notes
        
        # 更新网卡（删除旧的，添加新的）
        db.query(NetworkInterface).filter(NetworkInterface.server_id == asset_id).delete()
        if asset_in.network_interfaces:
            for ni_in in asset_in.network_interfaces:
                ni = NetworkInterface(
                    server_id=asset.id,
                    ip_address=ni_in.ip_address,
                    mac_address=ni_in.mac_address,
                    purpose=ni_in.purpose
                )
                db.add(ni)
    
    elif asset_in.asset_type == "cloud" and isinstance(asset_in, CloudAssetCreate) and extended:
        cloud = extended
        cloud.cloud_account_id = asset_in.cloud_account_id
        cloud.instance_id = asset_in.instance_id
        cloud.instance_name = asset_in.instance_name
        cloud.region = asset_in.region
        cloud.zone = asset_in.zone
        cloud.public_ipv4 = asset_in.public_ipv4
        cloud.private_ipv4 = asset_in.private_ipv4
        cloud.ipv6 = asset_in.ipv6
        cloud.instance_type = asset_in.instance_type
        cloud.cpu = asset_in.cpu
        cloud.memory = asset_in.memory
        cloud.disk_space = asset_in.disk_space
        cloud.os_name = asset_in.os_name
        cloud.os_version = asset_in.os_version
        cloud.bandwidth = asset_in.bandwidth
        cloud.bandwidth_billing_mode = asset_in.bandwidth_billing_mode
        cloud.ssh_port = asset_in.ssh_port
        cloud.purchase_date = asset_in.purchase_date
        cloud.expires_at = asset_in.expires_at
        cloud.payment_method = asset_in.payment_method
        cloud.notes = asset_in.notes
    
    elif asset_in.asset_type == "software" and isinstance(asset_in, SoftwareAssetCreate) and extended:
        software = extended
        software.software_name = asset_in.software_name
        software.login_url = asset_in.login_url
        software.login_account = asset_in.login_account
        software.phone = asset_in.phone
        software.license_type = asset_in.license_type
        software.license_file_path = asset_in.license_file_path
        if asset_in.license_code:
            software.license_code_encrypted = encrypt_value(asset_in.license_code)
        software.notes = asset_in.notes
    
    elif asset_in.asset_type == "system" and isinstance(asset_in, SystemAssetCreate) and extended:
        system = extended
        system.ip_address = asset_in.ip_address
        system.port = asset_in.port
        system.default_account = asset_in.default_account
        if asset_in.default_password:
            system.default_password_encrypted = encrypt_value(asset_in.default_password)
        system.login_url = asset_in.login_url
        system.notes = asset_in.notes
    
    elif asset_in.asset_type == "database" and isinstance(asset_in, DatabaseAssetCreate) and extended:
        database = extended
        database.db_type = asset_in.db_type
        database.host = asset_in.host
        database.port = asset_in.port
        database.ports = asset_in.ports if asset_in.ports else None
        database.databases = asset_in.databases
        database.quota = asset_in.quota
        database.notes = asset_in.notes
    
    elif asset_in.asset_type == "hardware" and isinstance(asset_in, HardwareAssetCreate) and extended:
        hardware = extended
        hardware.hardware_type = asset_in.hardware_type
        hardware.brand = asset_in.brand
        hardware.model = asset_in.model
        hardware.serial_number = asset_in.serial_number
        hardware.purchase_date = asset_in.purchase_date
        hardware.purchase_price = asset_in.purchase_price
        hardware.responsible_person = asset_in.responsible_person
        hardware.user = asset_in.user
        hardware.usage_area = asset_in.usage_area
        hardware.notes = asset_in.notes
    
    db.commit()
    db.refresh(asset)
    
    return {"message": "资产更新成功"}


@router.delete("/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_asset(
    asset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """删除资产（管理员）"""
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="资产不存在",
        )
    
    db.delete(asset)
    db.commit()
    return None


@router.get("/batch-import/template/{asset_type}")
async def download_import_template(
    asset_type: str,
    current_user: User = Depends(get_current_active_user)
):
    """下载批量导入模板（Excel）"""
    # 根据资产类型生成不同的模板
    if asset_type == "server":
        columns = [
            "名称*", "用途", "CPU(核)*", "内存(GB)*", "公网IPv4", "内网IPv4", 
            "平台", "CPU架构", "操作系统", "系统版本", "SSH端口", "备注"
        ]
        sample_data = [
            ["服务器1", "Web服务", "8", "16", "1.2.3.4", "192.168.1.100", 
             "Linux", "x86_64", "Ubuntu", "22.04", "22", "测试服务器"]
        ]
    elif asset_type == "cloud":
        columns = [
            "名称*", "实例ID", "实例名", "地域", "可用区", "公网IPv4", "内网IPv4",
            "实例类型", "CPU(核)*", "内存(GB)*", "磁盘空间(GB)*", "操作系统", "系统版本",
            "购买日期(YYYY-MM-DD)", "到期时间(YYYY-MM-DD)", 
            "登录凭据(格式:类型|用户名|密码|描述,多个用分号分隔)", "备注"
        ]
        sample_data = [
            ["云服务器1", "i-123456", "云服务器1", "cn-beijing", "cn-beijing-a", 
             "1.2.3.4", "192.168.1.100", "ecs.t5-lc1m1.small", "2", "4", "40",
             "Ubuntu", "22.04", "2024-01-01", "2025-01-01", 
             "password|root|123456|root账号;password|ubuntu|ubuntu123|ubuntu账号", "测试云服务器"]
        ]
    elif asset_type == "system":
        columns = [
            "名称*", "IP地址", "端口", "默认账号", "默认密码", "登录链接",
            "登录凭据(格式:类型|用户名|密码|描述,多个用分号分隔)", "备注"
        ]
        sample_data = [
            ["Git系统", "192.168.1.100", "8080", "admin", "admin123", "http://192.168.1.100:8080",
             "password|admin|admin123|管理员账号;password|git|git123|Git账号", "内部Git系统"]
        ]
    elif asset_type == "database":
        columns = [
            "名称*", "数据库类型*", "地址*", "主端口*", "多端口(格式:名称:端口,名称:端口)", 
            "数据库列表(每行一个或逗号分隔)", "配额", "备注"
        ]
        sample_data = [
            ["Clickhouse集群", "ClickHouse", "192.168.1.100", "9000", "HTTP:8123,Native:9000",
             "db1\ndb2\ndb3", "500GB", "ClickHouse数据库集群"]
        ]
    elif asset_type == "hardware":
        columns = [
            "名称*", "硬件类型*", "品牌", "型号", "序列号", "购买日期(YYYY-MM-DD)", 
            "购买价格", "责任人", "使用人", "使用区域", "备注"
        ]
        sample_data = [
            ["开发机001", "PC", "联想", "ThinkPad X1", "SN123456", "2024-01-01", 
             "8000", "张三", "李四", "办公室A", "开发人员使用"]
        ]
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"不支持的资产类型: {asset_type}"
        )
    
    # 创建DataFrame
    df = pd.DataFrame(sample_data, columns=columns)
    
    # 创建Excel文件
    output = io.BytesIO()
    try:
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='模板')
            worksheet = writer.sheets['模板']
            # 调整列宽
            from openpyxl.utils import get_column_letter
            for idx, col in enumerate(df.columns):
                max_length = max(
                    df[col].astype(str).map(len).max() if len(df) > 0 else 0,
                    len(col)
                )
                col_letter = get_column_letter(idx + 1)
                worksheet.column_dimensions[col_letter].width = min(max_length + 2, 30)
        
        output.seek(0)
        file_content = output.read()
        
        # 处理中文文件名编码
        from urllib.parse import quote
        filename = f"批量导入模板_{asset_type}_{datetime.now().strftime('%Y%m%d')}.xlsx"
        encoded_filename = quote(filename.encode('utf-8'))
        
        return StreamingResponse(
            io.BytesIO(file_content),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}"
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"生成模板文件失败: {str(e)}"
        )


@router.post("/batch-import", response_model=dict, status_code=status.HTTP_201_CREATED)
async def batch_import_assets(
    asset_type: str = Query(..., description="资产类型"),
    file: UploadFile = File(..., description="Excel文件"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """批量导入资产（管理员）- 从Excel文件导入"""
    created_count = 0
    errors = []
    
    # 读取Excel文件
    try:
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents), sheet_name=0)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"文件读取失败: {str(e)}"
        )
    
    # 根据资产类型处理数据
    for idx, row in df.iterrows():
        try:
            row_num = idx + 2  # Excel行号（从2开始，因为有表头）
            
            # 解析登录凭据（格式:类型|用户名|密码|描述,多个用分号分隔）
            def parse_credentials(cred_str):
                """解析登录凭据字符串"""
                credentials = []
                if pd.notna(cred_str) and str(cred_str).strip():
                    cred_list = str(cred_str).strip().split(';')
                    for cred_item in cred_list:
                        parts = [p.strip() for p in cred_item.split('|')]
                        if len(parts) >= 3:
                            cred_type = parts[0] if parts[0] else 'password'
                            key = parts[1] if len(parts) > 1 else ''
                            value = parts[2] if len(parts) > 2 else ''
                            description = parts[3] if len(parts) > 3 else None
                            if key and value:
                                credentials.append({
                                    "credential_type": cred_type,
                                    "key": key,
                                    "value": value,
                                    "description": description
                                })
                return credentials
            
            # 构建资产创建对象
            asset_data = {
                "asset_type": asset_type,
                "name": str(row.get("名称*", row.get("名称", ""))).strip(),
                "description": None,
                "tag_ids": [],
                "credentials": []
            }
            
            if not asset_data["name"]:
                errors.append(f"第{row_num}行: 名称为空，跳过")
                continue
            
            # 根据类型添加扩展字段
            if asset_type == "server":
                # 解析CPU和内存（从字符串中提取数字）
                cpu_str = str(row.get("CPU(核)*", row.get("CPU", ""))).strip()
                memory_str = str(row.get("内存(GB)*", row.get("内存", ""))).strip()
                
                cpu = None
                if cpu_str:
                    cpu_match = str(cpu_str).replace("核", "").strip()
                    try:
                        cpu = int(float(cpu_match))
                    except:
                        pass
                
                memory = None
                if memory_str:
                    memory_match = str(memory_str).replace("GB", "").strip()
                    try:
                        memory = int(float(memory_match))
                    except:
                        pass
                
                asset_data.update({
                    "purpose": str(row.get("用途", "")).strip() or None,
                    "cpu": f"{cpu}核" if cpu else None,
                    "memory": f"{memory}GB" if memory else None,
                    "public_ipv4": str(row.get("公网IPv4", "")).strip() or None,
                    "private_ipv4": str(row.get("内网IPv4", "")).strip() or None,
                    "platform": str(row.get("平台", "")).strip() or None,
                    "cpu_architecture": str(row.get("CPU架构", "")).strip() or None,
                    "os_name": str(row.get("操作系统", "")).strip() or None,
                    "os_version": str(row.get("系统版本", "")).strip() or None,
                    "ssh_port": int(row.get("SSH端口", 22)) if pd.notna(row.get("SSH端口")) else 22,
                    "notes": str(row.get("备注", "")).strip() or None,
                    "network_interfaces": []
                })
                
                if not cpu or not memory:
                    errors.append(f"第{row_num}行 ({asset_data['name']}): CPU或内存格式错误")
                    continue
                
                asset_in = ServerAssetCreate(**asset_data)
                
            elif asset_type == "cloud":
                # 解析CPU、内存、磁盘空间
                cpu_str = str(row.get("CPU(核)*", row.get("CPU", ""))).strip()
                memory_str = str(row.get("内存(GB)*", row.get("内存", ""))).strip()
                disk_str = str(row.get("磁盘空间(GB)*", row.get("磁盘空间", ""))).strip()
                
                cpu = None
                if cpu_str:
                    cpu_match = str(cpu_str).replace("核", "").strip()
                    try:
                        cpu = int(float(cpu_match))
                    except:
                        pass
                
                memory = None
                if memory_str:
                    memory_match = str(memory_str).replace("GB", "").strip()
                    try:
                        memory = int(float(memory_match))
                    except:
                        pass
                
                disk_space = None
                if disk_str:
                    disk_match = str(disk_str).replace("GB", "").strip()
                    try:
                        disk_space = int(float(disk_match))
                    except:
                        pass
                
                # 解析日期
                purchase_date = None
                if pd.notna(row.get("购买日期(YYYY-MM-DD)", row.get("购买日期", None))):
                    try:
                        purchase_date = pd.to_datetime(row.get("购买日期(YYYY-MM-DD)", row.get("购买日期"))).date()
                    except:
                        pass
                
                expires_at = None
                if pd.notna(row.get("到期时间(YYYY-MM-DD)", row.get("到期时间", None))):
                    try:
                        expires_at = pd.to_datetime(row.get("到期时间(YYYY-MM-DD)", row.get("到期时间"))).date()
                    except:
                        pass
                
                asset_data.update({
                    "cloud_account_id": None,
                    "instance_id": str(row.get("实例ID", "")).strip() or None,
                    "instance_name": str(row.get("实例名", "")).strip() or None,
                    "region": str(row.get("地域", "")).strip() or None,
                    "zone": str(row.get("可用区", "")).strip() or None,
                    "public_ipv4": str(row.get("公网IPv4", "")).strip() or None,
                    "private_ipv4": str(row.get("内网IPv4", "")).strip() or None,
                    "instance_type": str(row.get("实例类型", "")).strip() or None,
                    "cpu": f"{cpu}核" if cpu else None,
                    "memory": f"{memory}GB" if memory else None,
                    "disk_space": f"{disk_space}GB" if disk_space else None,
                    "os_name": str(row.get("操作系统", "")).strip() or None,
                    "os_version": str(row.get("系统版本", "")).strip() or None,
                    "bandwidth": None,
                    "bandwidth_billing_mode": None,
                    "ssh_port": None,
                    "purchase_date": purchase_date,
                    "expires_at": expires_at,
                    "payment_method": None,
                    "notes": str(row.get("备注", "")).strip() or None,
                })
                
                if not cpu or not memory or not disk_space:
                    errors.append(f"第{row_num}行 ({asset_data['name']}): CPU、内存或磁盘空间格式错误")
                    continue
                
                # 解析登录凭据
                cred_str = row.get("登录凭据(格式:类型|用户名|密码|描述,多个用分号分隔)", "")
                asset_data["credentials"] = parse_credentials(cred_str)
                
                asset_in = CloudAssetCreate(**asset_data)
            elif asset_type == "system":
                asset_data.update({
                    "ip_address": str(row.get("IP地址", "")).strip() or None,
                    "port": int(row.get("端口", 0)) if pd.notna(row.get("端口")) and str(row.get("端口")).strip() else None,
                    "default_account": str(row.get("默认账号", "")).strip() or None,
                    "default_password": str(row.get("默认密码", "")).strip() or None,
                    "login_url": str(row.get("登录链接", "")).strip() or None,
                    "notes": str(row.get("备注", "")).strip() or None,
                })
                
                # 解析登录凭据
                cred_str = row.get("登录凭据(格式:类型|用户名|密码|描述,多个用分号分隔)", "")
                asset_data["credentials"] = parse_credentials(cred_str)
                
                asset_in = SystemAssetCreate(**asset_data)
            elif asset_type == "database":
                # 解析多端口
                ports = None
                ports_str = str(row.get("多端口(格式:名称:端口,名称:端口)", "")).strip()
                if ports_str:
                    ports_list = [p.strip() for p in ports_str.split(',') if p.strip()]
                    ports = []
                    for p in ports_list:
                        if ':' in p:
                            name, port = p.split(':', 1)
                            try:
                                ports.append({"name": name.strip(), "port": int(port.strip())})
                            except:
                                pass
                        else:
                            try:
                                ports.append({"name": None, "port": int(p.strip())})
                            except:
                                pass
                    if len(ports) == 0:
                        ports = None
                
                # 解析数据库列表
                databases = []
                db_str = str(row.get("数据库列表(每行一个或逗号分隔)", "")).strip()
                if db_str:
                    # 先按换行符分割，再按逗号分割
                    db_list = []
                    for line in db_str.split('\n'):
                        db_list.extend([d.strip() for d in line.split(',') if d.strip()])
                    databases = list(set(db_list))  # 去重
                
                asset_data.update({
                    "db_type": str(row.get("数据库类型*", row.get("数据库类型", ""))).strip(),
                    "host": str(row.get("地址*", row.get("地址", ""))).strip(),
                    "port": int(row.get("主端口*", row.get("主端口", 0))),
                    "ports": ports,
                    "databases": databases if databases else None,
                    "quota": str(row.get("配额", "")).strip() or None,
                    "notes": str(row.get("备注", "")).strip() or None,
                })
                
                if not asset_data["db_type"] or not asset_data["host"] or not asset_data["port"]:
                    errors.append(f"第{row_num}行 ({asset_data['name']}): 数据库类型、地址或主端口不能为空")
                    continue
                
                asset_in = DatabaseAssetCreate(**asset_data)
            elif asset_type == "hardware":
                purchase_date = None
                if pd.notna(row.get("购买日期(YYYY-MM-DD)", row.get("购买日期", None))):
                    try:
                        purchase_date = pd.to_datetime(row.get("购买日期(YYYY-MM-DD)", row.get("购买日期"))).date()
                    except:
                        pass
                
                purchase_price = None
                if pd.notna(row.get("购买价格", None)):
                    try:
                        purchase_price = float(row.get("购买价格"))
                    except:
                        pass
                
                asset_data.update({
                    "hardware_type": str(row.get("硬件类型*", row.get("硬件类型", ""))).strip(),
                    "brand": str(row.get("品牌", "")).strip() or None,
                    "model": str(row.get("型号", "")).strip() or None,
                    "serial_number": str(row.get("序列号", "")).strip() or None,
                    "purchase_date": purchase_date,
                    "purchase_price": purchase_price,
                    "responsible_person": str(row.get("责任人", "")).strip() or None,
                    "user": str(row.get("使用人", "")).strip() or None,
                    "usage_area": str(row.get("使用区域", "")).strip() or None,
                    "notes": str(row.get("备注", "")).strip() or None,
                })
                
                if not asset_data["hardware_type"]:
                    errors.append(f"第{row_num}行 ({asset_data['name']}): 硬件类型不能为空")
                    continue
                
                asset_in = HardwareAssetCreate(**asset_data)
            else:
                errors.append(f"第{row_num}行: 不支持的资产类型: {asset_type}")
                continue
            
            # 创建资产（复用创建逻辑）
            asset = Asset(
                asset_type=asset_in.asset_type,
                name=asset_in.name,
                description=asset_in.description,
                created_by=current_user.id
            )
            db.add(asset)
            db.flush()
            
            # 处理标签
            if asset_in.tag_ids:
                tags = db.query(Tag).filter(Tag.id.in_(asset_in.tag_ids)).all()
                asset.tags = tags
            
            # 处理凭据
            if asset_in.credentials:
                for cred_dict in asset_in.credentials:
                    if isinstance(cred_dict, dict):
                        credential = Credential(
                            asset_id=asset.id,
                            credential_type=cred_dict.get("credential_type", "password"),
                            key=cred_dict.get("key", ""),
                            value_encrypted=encrypt_value(cred_dict.get("value", "")),
                            description=cred_dict.get("description")
                        )
                        db.add(credential)
                    else:
                        # 兼容旧的CredentialCreate对象
                        credential = Credential(
                            asset_id=asset.id,
                            credential_type=cred_dict.credential_type,
                            key=cred_dict.key,
                            value_encrypted=encrypt_value(cred_dict.value),
                            description=cred_dict.description
                        )
                        db.add(credential)
            
            # 创建扩展记录
            if asset_type == "server" and isinstance(asset_in, ServerAssetCreate):
                server = ServerAsset(
                    id=asset.id,
                    purpose=asset_in.purpose,
                    cpu=asset_in.cpu,
                    memory=asset_in.memory,
                    public_ipv4=asset_in.public_ipv4,
                    private_ipv4=asset_in.private_ipv4,
                    cpu_architecture=asset_in.cpu_architecture,
                    platform=asset_in.platform,
                    os_name=asset_in.os_name,
                    os_version=asset_in.os_version,
                    ssh_port=asset_in.ssh_port,
                    notes=asset_in.notes
                )
                db.add(server)
            elif asset_type == "cloud" and isinstance(asset_in, CloudAssetCreate):
                cloud = CloudAsset(
                    id=asset.id,
                    cloud_account_id=asset_in.cloud_account_id,
                    instance_id=asset_in.instance_id,
                    instance_name=asset_in.instance_name,
                    region=asset_in.region,
                    zone=asset_in.zone,
                    public_ipv4=asset_in.public_ipv4,
                    private_ipv4=asset_in.private_ipv4,
                    ipv6=asset_in.ipv6,
                    instance_type=asset_in.instance_type,
                    cpu=asset_in.cpu,
                    memory=asset_in.memory,
                    disk_space=asset_in.disk_space,
                    os_name=asset_in.os_name,
                    os_version=asset_in.os_version,
                    bandwidth=asset_in.bandwidth,
                    bandwidth_billing_mode=asset_in.bandwidth_billing_mode,
                    ssh_port=asset_in.ssh_port,
                    purchase_date=asset_in.purchase_date,
                    expires_at=asset_in.expires_at,
                    payment_method=asset_in.payment_method,
                    notes=asset_in.notes
                )
                db.add(cloud)
            elif asset_type == "system" and isinstance(asset_in, SystemAssetCreate):
                system = SystemAsset(
                    id=asset.id,
                    ip_address=asset_in.ip_address,
                    port=asset_in.port,
                    default_account=asset_in.default_account,
                    default_password_encrypted=encrypt_value(asset_in.default_password) if asset_in.default_password else None,
                    login_url=asset_in.login_url,
                    notes=asset_in.notes
                )
                db.add(system)
            elif asset_type == "database" and isinstance(asset_in, DatabaseAssetCreate):
                database = DatabaseAsset(
                    id=asset.id,
                    db_type=asset_in.db_type,
                    host=asset_in.host,
                    port=asset_in.port,
                    ports=asset_in.ports if asset_in.ports else None,
                    databases=asset_in.databases,
                    quota=asset_in.quota,
                    notes=asset_in.notes
                )
                db.add(database)
            elif asset_type == "hardware" and isinstance(asset_in, HardwareAssetCreate):
                hardware = HardwareAsset(
                    id=asset.id,
                    hardware_type=asset_in.hardware_type,
                    brand=asset_in.brand,
                    model=asset_in.model,
                    serial_number=asset_in.serial_number,
                    purchase_date=asset_in.purchase_date,
                    purchase_price=asset_in.purchase_price,
                    responsible_person=asset_in.responsible_person,
                    user=asset_in.user,
                    usage_area=asset_in.usage_area,
                    notes=asset_in.notes
                )
                db.add(hardware)
            
            db.commit()
            created_count += 1
        except Exception as e:
            db.rollback()
            errors.append(f"第{idx + 2}行 ({row.get('名称*', row.get('名称', '未知'))}): {str(e)}")
    
    return {
        "message": f"批量导入完成，成功: {created_count}, 失败: {len(errors)}",
        "created_count": created_count,
        "errors": errors
    }
