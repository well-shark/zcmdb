from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import inspect
import json
import io
from datetime import datetime
from app.database import get_db
from app.models.asset import Asset
from app.models.tag import Tag
from app.models.credential import Credential
from app.models.user import User
from app.models.notification import Notification
from app.models.server import ServerAsset, NetworkInterface
from app.models.cloud import CloudAccount, CloudAccessKey, CloudAsset
from app.models.software import SoftwareAsset
from app.models.system import SystemAsset
from app.models.database import DatabaseAsset
from app.models.hardware import HardwareAsset
from app.api.deps import get_current_admin_user
from app.models.user import User as UserModel
from app.core.encryption import decrypt_value

router = APIRouter(prefix="/migration", tags=["数据库迁移"])


@router.get("/export", response_class=JSONResponse)
async def export_database(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_admin_user)
):
    """导出数据库为JSON格式（管理员）"""
    try:
        export_data = {
            "version": "1.0.0",
            "export_time": datetime.now().isoformat(),
            "data": {}
        }
        
        # 导出用户（不包含密码哈希）
        users = db.query(User).all()
        export_data["data"]["users"] = [
            {
                "id": u.id,
                "username": u.username,
                "email": u.email,
                "is_admin": u.is_admin,
                "is_active": u.is_active,
                "created_at": u.created_at.isoformat() if u.created_at else None
            }
            for u in users
        ]
        
        # 导出标签
        tags = db.query(Tag).all()
        export_data["data"]["tags"] = [
            {
                "id": t.id,
                "key": t.key,
                "value": t.value,
                "created_at": t.created_at.isoformat() if t.created_at else None
            }
            for t in tags
        ]
        
        # 导出资产
        assets = db.query(Asset).all()
        assets_data = []
        for asset in assets:
            asset_dict = {
                "id": asset.id,
                "asset_type": asset.asset_type,
                "name": asset.name,
                "description": asset.description,
                "created_by": asset.created_by,
                "created_at": asset.created_at.isoformat() if asset.created_at else None,
                "updated_at": asset.updated_at.isoformat() if asset.updated_at else None,
                "tags": [t.id for t in asset.tags],
                "extended_data": None
            }
            
            # 根据类型导出扩展数据
            if asset.asset_type == "server":
                extended = db.query(ServerAsset).filter(ServerAsset.id == asset.id).first()
                if extended:
                    asset_dict["extended_data"] = {
                        "purpose": extended.purpose,
                        "cpu": extended.cpu,
                        "memory": extended.memory,
                        "public_ipv4": str(extended.public_ipv4) if extended.public_ipv4 else None,
                        "private_ipv4": str(extended.private_ipv4) if extended.private_ipv4 else None,
                        "cpu_architecture": extended.cpu_architecture,
                        "platform": extended.platform,
                        "os_name": extended.os_name,
                        "os_version": extended.os_version,
                        "ssh_port": extended.ssh_port,
                        "notes": extended.notes
                    }
                    # 导出网卡
                    nis = db.query(NetworkInterface).filter(NetworkInterface.server_id == asset.id).all()
                    asset_dict["extended_data"]["network_interfaces"] = [
                        {
                            "ip_address": str(ni.ip_address) if ni.ip_address else None,
                            "mac_address": ni.mac_address,
                            "purpose": ni.purpose
                        }
                        for ni in nis
                    ]
            
            elif asset.asset_type == "cloud":
                extended = db.query(CloudAsset).filter(CloudAsset.id == asset.id).first()
                if extended:
                    asset_dict["extended_data"] = {
                        "cloud_account_id": extended.cloud_account_id,
                        "instance_id": extended.instance_id,
                        "instance_name": extended.instance_name,
                        "region": extended.region,
                        "zone": extended.zone,
                        "public_ipv4": str(extended.public_ipv4) if extended.public_ipv4 else None,
                        "private_ipv4": str(extended.private_ipv4) if extended.private_ipv4 else None,
                        "ipv6": str(extended.ipv6) if extended.ipv6 else None,
                        "instance_type": extended.instance_type,
                        "cpu": extended.cpu,
                        "memory": extended.memory,
                        "disk_space": extended.disk_space,
                        "os_name": extended.os_name,
                        "os_version": extended.os_version,
                        "bandwidth": extended.bandwidth,
                        "bandwidth_billing_mode": extended.bandwidth_billing_mode,
                        "ssh_port": extended.ssh_port,
                        "purchase_date": extended.purchase_date.isoformat() if extended.purchase_date else None,
                        "expires_at": extended.expires_at.isoformat() if extended.expires_at else None,
                        "payment_method": extended.payment_method,
                        "notes": extended.notes
                    }
            
            elif asset.asset_type == "software":
                extended = db.query(SoftwareAsset).filter(SoftwareAsset.id == asset.id).first()
                if extended:
                    asset_dict["extended_data"] = {
                        "software_name": extended.software_name,
                        "login_url": extended.login_url,
                        "login_account": extended.login_account,
                        "phone": extended.phone,
                        "license_type": extended.license_type,
                        "license_file_path": extended.license_file_path,
                        "license_code_encrypted": extended.license_code_encrypted,  # 保持加密状态
                        "notes": extended.notes
                    }
            
            elif asset.asset_type == "system":
                extended = db.query(SystemAsset).filter(SystemAsset.id == asset.id).first()
                if extended:
                    asset_dict["extended_data"] = {
                        "ip_address": str(extended.ip_address) if extended.ip_address else None,
                        "port": extended.port,
                        "default_account": extended.default_account,
                        "default_password_encrypted": extended.default_password_encrypted,  # 保持加密状态
                        "login_url": extended.login_url,
                        "notes": extended.notes
                    }
            
            elif asset.asset_type == "database":
                extended = db.query(DatabaseAsset).filter(DatabaseAsset.id == asset.id).first()
                if extended:
                    asset_dict["extended_data"] = {
                        "db_type": extended.db_type,
                        "host": extended.host,
                        "port": extended.port,
                        "ports": extended.ports,
                        "databases": extended.databases,
                        "quota": extended.quota,
                        "notes": extended.notes
                    }
            
            elif asset.asset_type == "hardware":
                extended = db.query(HardwareAsset).filter(HardwareAsset.id == asset.id).first()
                if extended:
                    asset_dict["extended_data"] = {
                        "hardware_type": extended.hardware_type,
                        "brand": extended.brand,
                        "model": extended.model,
                        "serial_number": extended.serial_number,
                        "purchase_date": extended.purchase_date.isoformat() if extended.purchase_date else None,
                        "purchase_price": float(extended.purchase_price) if extended.purchase_price else None,
                        "responsible_person": extended.responsible_person,
                        "user": extended.user,
                        "usage_area": extended.usage_area,
                        "notes": extended.notes
                    }
            
            assets_data.append(asset_dict)
        
        export_data["data"]["assets"] = assets_data
        
        # 导出凭据（保持加密状态）
        credentials = db.query(Credential).all()
        export_data["data"]["credentials"] = [
            {
                "id": c.id,
                "asset_id": c.asset_id,
                "credential_type": c.credential_type,
                "key": c.key,
                "value_encrypted": c.value_encrypted,  # 保持加密状态
                "description": c.description,
                "created_at": c.created_at.isoformat() if c.created_at else None
            }
            for c in credentials
        ]
        
        # 导出云账号
        cloud_accounts = db.query(CloudAccount).all()
        export_data["data"]["cloud_accounts"] = []
        for account in cloud_accounts:
            account_dict = {
                "id": account.id,
                "cloud_provider": account.cloud_provider,
                "account_name": account.account_name,
                "password_encrypted": account.password_encrypted,  # 保持加密状态
                "phone": account.phone,
                "balance": float(account.balance) if account.balance else None,
                "notes": account.notes,
                "created_at": account.created_at.isoformat() if account.created_at else None,
                "access_keys": []
            }
            
            # 导出访问密钥
            keys = db.query(CloudAccessKey).filter(CloudAccessKey.cloud_account_id == account.id).all()
            for key in keys:
                account_dict["access_keys"].append({
                    "access_key": key.access_key,
                    "secret_key_encrypted": key.secret_key_encrypted,  # 保持加密状态
                    "assigned_to": key.assigned_to,
                    "description": key.description,
                    "created_at": key.created_at.isoformat() if key.created_at else None
                })
            
            export_data["data"]["cloud_accounts"].append(account_dict)
        
        # 导出通知（可选）
        notifications = db.query(Notification).all()
        export_data["data"]["notifications"] = [
            {
                "id": n.id,
                "asset_id": n.asset_id,
                "message": n.message,
                "is_read": n.is_read,
                "created_at": n.created_at.isoformat() if n.created_at else None
            }
            for n in notifications
        ]
        
        # 返回JSON响应
        return JSONResponse(content=export_data)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"导出失败: {str(e)}"
        )


@router.post("/import", response_model=Dict[str, Any])
async def import_database(
    file: UploadFile = File(..., description="JSON文件"),
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_admin_user)
):
    """导入数据库（从JSON文件，管理员）"""
    try:
        # 读取JSON文件
        contents = await file.read()
        import_data = json.loads(contents.decode('utf-8'))
        
        if "data" not in import_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="无效的导入文件格式"
            )
        
        imported_count = {
            "users": 0,
            "tags": 0,
            "assets": 0,
            "credentials": 0,
            "cloud_accounts": 0,
            "notifications": 0
        }
        errors = []
        
        # 导入标签（先导入，因为资产需要关联标签）
        if "tags" in import_data["data"]:
            tag_id_mapping = {}  # 旧ID -> 新ID映射
            for tag_data in import_data["data"]["tags"]:
                try:
                    # 检查是否已存在（按key和value）
                    existing = db.query(Tag).filter(
                        Tag.key == tag_data["key"],
                        Tag.value == tag_data["value"]
                    ).first()
                    
                    if existing:
                        tag_id_mapping[tag_data["id"]] = existing.id
                    else:
                        new_tag = Tag(
                            key=tag_data["key"],
                            value=tag_data["value"]
                        )
                        db.add(new_tag)
                        db.flush()
                        tag_id_mapping[tag_data["id"]] = new_tag.id
                        imported_count["tags"] += 1
                except Exception as e:
                    errors.append(f"导入标签失败 (ID: {tag_data.get('id')}): {str(e)}")
        
        db.commit()
        
        # 导入用户（跳过已存在的用户名）
        if "users" in import_data["data"]:
            for user_data in import_data["data"]["users"]:
                try:
                    existing = db.query(User).filter(User.username == user_data["username"]).first()
                    if not existing:
                        # 注意：导入的用户需要重新设置密码，这里只导入基本信息
                        new_user = User(
                            username=user_data["username"],
                            email=user_data.get("email"),
                            is_admin=user_data.get("is_admin", False),
                            is_active=user_data.get("is_active", True)
                        )
                        db.add(new_user)
                        imported_count["users"] += 1
                except Exception as e:
                    errors.append(f"导入用户失败 (用户名: {user_data.get('username')}): {str(e)}")
        
        db.commit()
        
        # 导入资产
        if "assets" in import_data["data"]:
            asset_id_mapping = {}  # 旧ID -> 新ID映射
            
            for asset_data in import_data["data"]["assets"]:
                try:
                    # 创建基础资产
                    new_asset = Asset(
                        asset_type=asset_data["asset_type"],
                        name=asset_data["name"],
                        description=asset_data.get("description"),
                        created_by=asset_data.get("created_by")
                    )
                    db.add(new_asset)
                    db.flush()
                    
                    old_id = asset_data["id"]
                    asset_id_mapping[old_id] = new_asset.id
                    
                    # 关联标签
                    if "tags" in asset_data and asset_data["tags"]:
                        tag_ids = [tag_id_mapping.get(tid) for tid in asset_data["tags"] if tag_id_mapping.get(tid)]
                        if tag_ids:
                            tags = db.query(Tag).filter(Tag.id.in_(tag_ids)).all()
                            new_asset.tags = tags
                    
                    # 创建扩展数据
                    if asset_data.get("extended_data"):
                        ext_data = asset_data["extended_data"]
                        asset_type = asset_data["asset_type"]
                        
                        if asset_type == "server":
                            server = ServerAsset(
                                id=new_asset.id,
                                purpose=ext_data.get("purpose"),
                                cpu=ext_data.get("cpu"),
                                memory=ext_data.get("memory"),
                                public_ipv4=ext_data.get("public_ipv4"),
                                private_ipv4=ext_data.get("private_ipv4"),
                                cpu_architecture=ext_data.get("cpu_architecture"),
                                platform=ext_data.get("platform"),
                                os_name=ext_data.get("os_name"),
                                os_version=ext_data.get("os_version"),
                                ssh_port=ext_data.get("ssh_port", 22),
                                notes=ext_data.get("notes")
                            )
                            db.add(server)
                            
                            # 导入网卡
                            if "network_interfaces" in ext_data:
                                for ni_data in ext_data["network_interfaces"]:
                                    ni = NetworkInterface(
                                        server_id=new_asset.id,
                                        ip_address=ni_data.get("ip_address"),
                                        mac_address=ni_data.get("mac_address"),
                                        purpose=ni_data.get("purpose")
                                    )
                                    db.add(ni)
                        
                        elif asset_type == "cloud":
                            cloud = CloudAsset(
                                id=new_asset.id,
                                cloud_account_id=ext_data.get("cloud_account_id"),
                                instance_id=ext_data.get("instance_id"),
                                instance_name=ext_data.get("instance_name"),
                                region=ext_data.get("region"),
                                zone=ext_data.get("zone"),
                                public_ipv4=ext_data.get("public_ipv4"),
                                private_ipv4=ext_data.get("private_ipv4"),
                                ipv6=ext_data.get("ipv6"),
                                instance_type=ext_data.get("instance_type"),
                                cpu=ext_data.get("cpu"),
                                memory=ext_data.get("memory"),
                                disk_space=ext_data.get("disk_space"),
                                os_name=ext_data.get("os_name"),
                                os_version=ext_data.get("os_version"),
                                bandwidth=ext_data.get("bandwidth"),
                                bandwidth_billing_mode=ext_data.get("bandwidth_billing_mode"),
                                ssh_port=ext_data.get("ssh_port", 22),
                                purchase_date=datetime.fromisoformat(ext_data["purchase_date"]) if ext_data.get("purchase_date") else None,
                                expires_at=datetime.fromisoformat(ext_data["expires_at"]) if ext_data.get("expires_at") else None,
                                payment_method=ext_data.get("payment_method"),
                                notes=ext_data.get("notes")
                            )
                            db.add(cloud)
                        
                        elif asset_type == "software":
                            software = SoftwareAsset(
                                id=new_asset.id,
                                software_name=ext_data.get("software_name"),
                                login_url=ext_data.get("login_url"),
                                login_account=ext_data.get("login_account"),
                                phone=ext_data.get("phone"),
                                license_type=ext_data.get("license_type"),
                                license_file_path=ext_data.get("license_file_path"),
                                license_code_encrypted=ext_data.get("license_code_encrypted"),
                                notes=ext_data.get("notes")
                            )
                            db.add(software)
                        
                        elif asset_type == "system":
                            system = SystemAsset(
                                id=new_asset.id,
                                ip_address=ext_data.get("ip_address"),
                                port=ext_data.get("port"),
                                default_account=ext_data.get("default_account"),
                                default_password_encrypted=ext_data.get("default_password_encrypted"),
                                login_url=ext_data.get("login_url"),
                                notes=ext_data.get("notes")
                            )
                            db.add(system)
                        
                        elif asset_type == "database":
                            database = DatabaseAsset(
                                id=new_asset.id,
                                db_type=ext_data.get("db_type"),
                                host=ext_data.get("host"),
                                port=ext_data.get("port"),
                                ports=ext_data.get("ports"),
                                databases=ext_data.get("databases"),
                                quota=ext_data.get("quota"),
                                notes=ext_data.get("notes")
                            )
                            db.add(database)
                        
                        elif asset_type == "hardware":
                            hardware = HardwareAsset(
                                id=new_asset.id,
                                hardware_type=ext_data.get("hardware_type"),
                                brand=ext_data.get("brand"),
                                model=ext_data.get("model"),
                                serial_number=ext_data.get("serial_number"),
                                purchase_date=datetime.fromisoformat(ext_data["purchase_date"]).date() if ext_data.get("purchase_date") else None,
                                purchase_price=ext_data.get("purchase_price"),
                                responsible_person=ext_data.get("responsible_person"),
                                user=ext_data.get("user"),
                                usage_area=ext_data.get("usage_area"),
                                notes=ext_data.get("notes")
                            )
                            db.add(hardware)
                    
                    imported_count["assets"] += 1
                    
                except Exception as e:
                    errors.append(f"导入资产失败 (名称: {asset_data.get('name')}): {str(e)}")
                    db.rollback()
                    continue
            
            db.commit()
            
            # 导入凭据（需要更新asset_id）
            if "credentials" in import_data["data"]:
                for cred_data in import_data["data"]["credentials"]:
                    try:
                        new_asset_id = asset_id_mapping.get(cred_data.get("asset_id"))
                        if new_asset_id:
                            credential = Credential(
                                asset_id=new_asset_id,
                                credential_type=cred_data["credential_type"],
                                key=cred_data["key"],
                                value_encrypted=cred_data.get("value_encrypted"),  # 保持加密状态
                                description=cred_data.get("description")
                            )
                            db.add(credential)
                            imported_count["credentials"] += 1
                    except Exception as e:
                        errors.append(f"导入凭据失败: {str(e)}")
            
            db.commit()
        
        # 导入云账号
        if "cloud_accounts" in import_data["data"]:
            cloud_account_id_mapping = {}  # 旧ID -> 新ID映射
            
            for account_data in import_data["data"]["cloud_accounts"]:
                try:
                    new_account = CloudAccount(
                        cloud_provider=account_data["cloud_provider"],
                        account_name=account_data["account_name"],
                        password_encrypted=account_data.get("password_encrypted"),  # 保持加密状态
                        phone=account_data.get("phone"),
                        balance=account_data.get("balance"),
                        notes=account_data.get("notes")
                    )
                    db.add(new_account)
                    db.flush()
                    
                    old_id = account_data["id"]
                    cloud_account_id_mapping[old_id] = new_account.id
                    
                    # 导入访问密钥
                    if "access_keys" in account_data:
                        for key_data in account_data["access_keys"]:
                            access_key = CloudAccessKey(
                                cloud_account_id=new_account.id,
                                access_key=key_data["access_key"],
                                secret_key_encrypted=key_data.get("secret_key_encrypted"),  # 保持加密状态
                                assigned_to=key_data.get("assigned_to"),
                                description=key_data.get("description")
                            )
                            db.add(access_key)
                    
                    imported_count["cloud_accounts"] += 1
                    
                except Exception as e:
                    errors.append(f"导入云账号失败 (账号: {account_data.get('account_name')}): {str(e)}")
            
            db.commit()
            
            # 更新资产中的cloud_account_id
            if "assets" in import_data["data"]:
                for asset_data in import_data["data"]["assets"]:
                    if asset_data.get("extended_data") and asset_data["extended_data"].get("cloud_account_id"):
                        old_cloud_account_id = asset_data["extended_data"]["cloud_account_id"]
                        new_cloud_account_id = cloud_account_id_mapping.get(old_cloud_account_id)
                        if new_cloud_account_id:
                            new_asset_id = asset_id_mapping.get(asset_data["id"])
                            if new_asset_id:
                                cloud_asset = db.query(CloudAsset).filter(CloudAsset.id == new_asset_id).first()
                                if cloud_asset:
                                    cloud_asset.cloud_account_id = new_cloud_account_id
                                    db.commit()
        
        return {
            "message": "导入完成",
            "imported": imported_count,
            "errors": errors
        }
        
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="无效的JSON文件格式"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"导入失败: {str(e)}"
        )

