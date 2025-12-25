from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.cloud import CloudAccount, CloudAccessKey
from app.schemas.asset import (
    CloudAccountCreate, CloudAccount as CloudAccountSchema,
    CloudAccessKeyCreate, CloudAccessKey as CloudAccessKeySchema
)
from app.api.deps import get_current_active_user, get_current_admin_user
from app.models.user import User
from app.core.encryption import encrypt_value, decrypt_value

router = APIRouter(prefix="/cloud-accounts", tags=["云账号管理"])


@router.get("", response_model=List[CloudAccountSchema])
async def get_cloud_accounts(
    cloud_provider: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """获取云账号列表"""
    query = db.query(CloudAccount)
    
    if cloud_provider:
        query = query.filter(CloudAccount.cloud_provider == cloud_provider)
    
    accounts = query.order_by(CloudAccount.created_at.desc()).all()
    
    result = []
    for account in accounts:
        account_dict = {
            "id": account.id,
            "cloud_provider": account.cloud_provider,
            "account_name": account.account_name,
            "phone": account.phone,
            "balance": float(account.balance) if account.balance else None,
            "notes": account.notes,
            "created_at": account.created_at,
            "access_keys": []
        }
        
        # 只有管理员可以看到密码
        if current_user.is_admin:
            account_dict["password"] = decrypt_value(account.password_encrypted) if account.password_encrypted else None
        else:
            account_dict["password"] = None
        
        # 获取访问密钥列表
        for key in account.access_keys:
            key_dict = {
                "id": key.id,
                "access_key": key.access_key,
                "assigned_to": key.assigned_to,
                "description": key.description,
                "created_at": key.created_at
            }
            
            # 只有管理员可以看到密钥
            if current_user.is_admin:
                key_dict["secret_key"] = decrypt_value(key.secret_key_encrypted) if key.secret_key_encrypted else None
            else:
                key_dict["secret_key"] = None
            
            account_dict["access_keys"].append(key_dict)
        
        result.append(account_dict)
    
    return result


@router.get("/{account_id}", response_model=CloudAccountSchema)
async def get_cloud_account(
    account_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """获取云账号详情"""
    account = db.query(CloudAccount).filter(CloudAccount.id == account_id).first()
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="云账号不存在",
        )
    
    account_dict = {
        "id": account.id,
        "cloud_provider": account.cloud_provider,
        "account_name": account.account_name,
        "phone": account.phone,
        "balance": float(account.balance) if account.balance else None,
        "notes": account.notes,
        "created_at": account.created_at,
        "access_keys": []
    }
    
    # 只有管理员可以看到密码
    if current_user.is_admin:
        account_dict["password"] = decrypt_value(account.password_encrypted) if account.password_encrypted else None
    else:
        account_dict["password"] = None
    
    # 获取访问密钥列表
    for key in account.access_keys:
        key_dict = {
            "id": key.id,
            "access_key": key.access_key,
            "assigned_to": key.assigned_to,
            "description": key.description,
            "created_at": key.created_at
        }
        
        # 只有管理员可以看到密钥
        if current_user.is_admin:
            key_dict["secret_key"] = decrypt_value(key.secret_key_encrypted) if key.secret_key_encrypted else None
        else:
            key_dict["secret_key"] = None
        
        account_dict["access_keys"].append(key_dict)
    
    return account_dict


@router.post("", response_model=CloudAccountSchema, status_code=status.HTTP_201_CREATED)
async def create_cloud_account(
    account_in: CloudAccountCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """创建云账号（管理员）"""
    account = CloudAccount(
        cloud_provider=account_in.cloud_provider,
        account_name=account_in.account_name,
        password_encrypted=encrypt_value(account_in.password) if account_in.password else None,
        phone=account_in.phone,
        balance=account_in.balance,
        notes=account_in.notes
    )
    db.add(account)
    db.commit()
    db.refresh(account)
    
    # 返回结果（包含解密后的密码，仅管理员可见）
    account_dict = {
        "id": account.id,
        "cloud_provider": account.cloud_provider,
        "account_name": account.account_name,
        "password": account_in.password,
        "phone": account.phone,
        "balance": float(account.balance) if account.balance else None,
        "notes": account.notes,
        "created_at": account.created_at,
        "access_keys": []
    }
    
    return account_dict


@router.put("/{account_id}", response_model=CloudAccountSchema)
async def update_cloud_account(
    account_id: int,
    account_in: CloudAccountCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """更新云账号（管理员）"""
    account = db.query(CloudAccount).filter(CloudAccount.id == account_id).first()
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="云账号不存在",
        )
    
    account.cloud_provider = account_in.cloud_provider
    account.account_name = account_in.account_name
    if account_in.password:
        account.password_encrypted = encrypt_value(account_in.password)
    account.phone = account_in.phone
    account.balance = account_in.balance
    account.notes = account_in.notes
    
    db.commit()
    db.refresh(account)
    
    # 返回结果
    account_dict = {
        "id": account.id,
        "cloud_provider": account.cloud_provider,
        "account_name": account.account_name,
        "password": account_in.password if account_in.password else decrypt_value(account.password_encrypted) if account.password_encrypted else None,
        "phone": account.phone,
        "balance": float(account.balance) if account.balance else None,
        "notes": account.notes,
        "created_at": account.created_at,
        "access_keys": []
    }
    
    # 获取访问密钥列表
    for key in account.access_keys:
        key_dict = {
            "id": key.id,
            "access_key": key.access_key,
            "assigned_to": key.assigned_to,
            "description": key.description,
            "created_at": key.created_at,
            "secret_key": decrypt_value(key.secret_key_encrypted) if key.secret_key_encrypted else None
        }
        account_dict["access_keys"].append(key_dict)
    
    return account_dict


@router.delete("/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_cloud_account(
    account_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """删除云账号（管理员）"""
    account = db.query(CloudAccount).filter(CloudAccount.id == account_id).first()
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="云账号不存在",
        )
    
    db.delete(account)
    db.commit()
    return None


# 访问密钥管理
@router.post("/{account_id}/access-keys", response_model=CloudAccessKeySchema, status_code=status.HTTP_201_CREATED)
async def create_access_key(
    account_id: int,
    key_in: CloudAccessKeyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """创建访问密钥（管理员）"""
    account = db.query(CloudAccount).filter(CloudAccount.id == account_id).first()
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="云账号不存在",
        )
    
    access_key = CloudAccessKey(
        cloud_account_id=account_id,
        access_key=key_in.access_key,
        secret_key_encrypted=encrypt_value(key_in.secret_key),
        assigned_to=key_in.assigned_to,
        description=key_in.description
    )
    db.add(access_key)
    db.commit()
    db.refresh(access_key)
    
    return {
        "id": access_key.id,
        "cloud_account_id": access_key.cloud_account_id,
        "access_key": access_key.access_key,
        "secret_key": key_in.secret_key,
        "assigned_to": access_key.assigned_to,
        "description": access_key.description,
        "created_at": access_key.created_at
    }


@router.put("/{account_id}/access-keys/{key_id}", response_model=CloudAccessKeySchema)
async def update_access_key(
    account_id: int,
    key_id: int,
    key_in: CloudAccessKeyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """更新访问密钥（管理员）"""
    access_key = db.query(CloudAccessKey).filter(
        CloudAccessKey.id == key_id,
        CloudAccessKey.cloud_account_id == account_id
    ).first()
    
    if not access_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="访问密钥不存在",
        )
    
    access_key.access_key = key_in.access_key
    access_key.secret_key_encrypted = encrypt_value(key_in.secret_key)
    access_key.assigned_to = key_in.assigned_to
    access_key.description = key_in.description
    
    db.commit()
    db.refresh(access_key)
    
    return {
        "id": access_key.id,
        "cloud_account_id": access_key.cloud_account_id,
        "access_key": access_key.access_key,
        "secret_key": key_in.secret_key,
        "assigned_to": access_key.assigned_to,
        "description": access_key.description,
        "created_at": access_key.created_at
    }


@router.delete("/{account_id}/access-keys/{key_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_access_key(
    account_id: int,
    key_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """删除访问密钥（管理员）"""
    access_key = db.query(CloudAccessKey).filter(
        CloudAccessKey.id == key_id,
        CloudAccessKey.cloud_account_id == account_id
    ).first()
    
    if not access_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="访问密钥不存在",
        )
    
    db.delete(access_key)
    db.commit()
    return None

